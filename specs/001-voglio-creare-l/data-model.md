# Data Model: Hotel Admin Dashboard

**Feature**: Hotel Admin Dashboard
**Date**: 2025-10-06
**Status**: Design Complete

## Overview
This document defines the data model changes required for the hotel admin dashboard feature, including branding customization, activity logging, and token management.

---

## Database Schema Changes

### 1. New Table: `activity_logs`

Track all significant actions within the system for display in dashboard activity feed.

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'organizer', 'participant', 'system')),
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_activity_logs_tenant_created ON activity_logs(tenant_id, created_at DESC);
CREATE INDEX idx_activity_logs_event ON activity_logs(event_id) WHERE event_id IS NOT NULL;

-- RLS Policy
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own tenant activity"
  ON activity_logs FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM admins WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can log activity"
  ON activity_logs FOR INSERT
  WITH CHECK (true); -- Backend uses service role
```

**Fields**:
- `id`: Unique identifier
- `tenant_id`: Foreign key to tenants table (required)
- `event_id`: Foreign key to events table (nullable - not all activities are event-specific)
- `actor_type`: Enum - who performed the action (admin/organizer/participant/system)
- `action_type`: String - what action was performed (e.g., "event_created", "slide_uploaded", "branding_updated")
- `metadata`: JSONB - additional context (e.g., {"event_name": "Tech Conf", "user_email": "admin@hotel.com"})
- `created_at`: Timestamp of activity

**Action Types** (examples):
- `event_created`, `event_updated`, `event_deleted`
- `slide_uploaded`, `slide_viewed`, `slide_downloaded`
- `branding_updated`, `logo_uploaded`
- `admin_login`, `token_generated`

---

### 2. Enhanced Table: `tenants`

Add branding configuration support.

```sql
-- Add branding_config column
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#10B981"
  },
  "logo_url": null,
  "advertisements": []
}'::jsonb;

-- Index for JSONB queries
CREATE INDEX idx_tenants_branding ON tenants USING gin(branding_config);
```

**branding_config JSON Structure**:
```typescript
interface BrandingConfig {
  colors: {
    primary: string;      // Hex color, e.g., "#3B82F6"
    secondary: string;    // Hex color
  };
  logo_url: string | null;  // URL to uploaded logo
  advertisements: Advertisement[];
}

interface Advertisement {
  id: string;
  image_url: string;
  link_url: string | null;
  position: 'header' | 'sidebar' | 'footer';
}
```

---

### 3. Enhanced Table: `events`

Add token management and branding override support.

```sql
-- Add token columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_token TEXT UNIQUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS participant_token TEXT UNIQUE;

-- Add branding overrides column
ALTER TABLE events ADD COLUMN IF NOT EXISTS branding_overrides JSONB DEFAULT '{
  "colors": {"value": null, "customizable": true},
  "logo_url": {"value": null, "customizable": true},
  "advertisements": {"value": null, "customizable": true}
}'::jsonb;

-- Indexes
CREATE INDEX idx_events_organizer_token ON events(organizer_token) WHERE organizer_token IS NOT NULL;
CREATE INDEX idx_events_participant_token ON events(participant_token) WHERE participant_token IS NOT NULL;
CREATE INDEX idx_events_branding ON events USING gin(branding_overrides);

-- Add function to auto-generate tokens on event creation
CREATE OR REPLACE FUNCTION generate_event_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organizer_token IS NULL THEN
    NEW.organizer_token := encode(gen_random_bytes(16), 'base64');
  END IF;
  IF NEW.participant_token IS NULL THEN
    NEW.participant_token := encode(gen_random_bytes(16), 'base64');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_tokens
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION generate_event_tokens();
```

**branding_overrides JSON Structure**:
```typescript
interface BrandingOverrides {
  colors: {
    value: { primary: string; secondary: string } | null;
    customizable: boolean;  // Can organizer change this?
  };
  logo_url: {
    value: string | null;
    customizable: boolean;
  };
  advertisements: {
    value: Advertisement[] | null;
    customizable: boolean;
  };
}
```

**Inheritance Logic**:
When displaying an event page, resolve effective branding:
1. If `branding_overrides[element].value` is not null → use override
2. Else → inherit from `tenants.branding_config[element]`
3. If `customizable` is false → organizer cannot modify (admin-only control)

---

## Data Access Patterns

### Dashboard Metrics Query
```sql
-- Count active upcoming events for a tenant
SELECT COUNT(*) as active_events_count
FROM events
WHERE tenant_id = $1
  AND event_date >= NOW()
  AND status = 'active';

-- Get most recent activity timestamp
SELECT created_at as last_activity_at
FROM activity_logs
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT 1;
```

### Recent Activity Feed
```sql
SELECT
  al.id,
  al.actor_type,
  al.action_type,
  al.metadata,
  al.created_at,
  e.title as event_title
FROM activity_logs al
LEFT JOIN events e ON al.event_id = e.id
WHERE al.tenant_id = $1
ORDER BY al.created_at DESC
LIMIT 5;
```

### Branding Resolution (Event Page)
```sql
-- Get tenant and event branding in one query
SELECT
  t.branding_config as hotel_branding,
  e.branding_overrides as event_overrides
FROM events e
JOIN tenants t ON e.tenant_id = t.id
WHERE e.id = $1;
```

Then resolve in application code per inheritance logic above.

---

## TypeScript Interfaces

```typescript
// Activity Log
export interface ActivityLog {
  id: string;
  tenant_id: string;
  event_id: string | null;
  actor_type: 'admin' | 'organizer' | 'participant' | 'system';
  action_type: string;
  metadata: Record<string, any>;
  created_at: string;
  event_title?: string; // Joined from events
}

// Branding Config (Tenant level)
export interface BrandingConfig {
  colors: {
    primary: string;
    secondary: string;
  };
  logo_url: string | null;
  advertisements: Advertisement[];
}

export interface Advertisement {
  id: string;
  image_url: string;
  link_url: string | null;
  position: 'header' | 'sidebar' | 'footer';
}

// Branding Overrides (Event level)
export interface BrandingOverrides {
  colors: {
    value: { primary: string; secondary: string } | null;
    customizable: boolean;
  };
  logo_url: {
    value: string | null;
    customizable: boolean;
  };
  advertisements: {
    value: Advertisement[] | null;
    customizable: boolean;
  };
}

// Event with tokens
export interface EventWithTokens {
  id: string;
  title: string;
  tenant_id: string;
  organizer_token: string;
  participant_token: string;
  branding_overrides: BrandingOverrides;
  event_date: string;
  status: 'active' | 'draft' | 'archived';
  created_at: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  active_events_count: number;
  last_activity_at: string | null;
}
```

---

## Migration Strategy

### Migration 1: Create activity_logs table
```sql
-- 001_create_activity_logs.sql
CREATE TABLE activity_logs (...);
-- (full SQL from section 1 above)
```

### Migration 2: Enhance tenants and events tables
```sql
-- 002_add_branding_and_tokens.sql
ALTER TABLE tenants ADD COLUMN branding_config JSONB ...;
ALTER TABLE events ADD COLUMN organizer_token TEXT ...;
ALTER TABLE events ADD COLUMN participant_token TEXT ...;
ALTER TABLE events ADD COLUMN branding_overrides JSONB ...;
-- (full SQL from sections 2 and 3 above)
```

### Data Backfill
After migrations, backfill existing events with tokens:
```sql
UPDATE events
SET
  organizer_token = encode(gen_random_bytes(16), 'base64'),
  participant_token = encode(gen_random_bytes(16), 'base64')
WHERE organizer_token IS NULL OR participant_token IS NULL;
```

---

## Validation Rules

### Application-Level Validations

**branding_config**:
- `colors.primary` and `colors.secondary` must be valid hex colors (`/^#[0-9A-F]{6}$/i`)
- `logo_url` must be valid URL or null
- `advertisements[].image_url` must be valid URL

**branding_overrides**:
- Same validation as branding_config for `value` fields
- `customizable` must be boolean

**activity_logs**:
- `actor_type` must be one of enum values
- `action_type` must be non-empty string
- `metadata` must be valid JSON object

**tokens**:
- Must be unique across all events
- Auto-generated on creation (no manual input)
- URL-safe characters only

---

## Performance Considerations

1. **Indexes**: All foreign keys and frequently queried columns are indexed
2. **JSONB GIN indexes**: Enable fast queries on branding configuration
3. **Activity log retention**: Implement periodic cleanup (e.g., delete logs older than 7 days) to prevent table bloat
4. **Token lookups**: Indexed for fast organizer/participant access validation

---

## Security Considerations

1. **RLS Policies**: All tables have Row-Level Security enabled
2. **Token exposure**: Tokens should only be visible to hotel admins in dashboard
3. **Branding validation**: Sanitize URLs to prevent XSS attacks
4. **Activity logs**: Backend uses service role to bypass RLS for logging

---

**Status**: ✅ Data model design complete, ready for contract definition
