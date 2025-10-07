# Data Model: Admin Panel Secondary Screens

**Feature**: Admin Panel Secondary Screens
**Date**: 2025-10-07
**Status**: Complete

## Overview

This feature extends existing `events` and `tenants` tables to support branding customization, event editing, and settings management. All changes maintain multi-tenant isolation via RLS policies.

## Database Schema Changes

### 1. events Table (Extend Existing)

**New Columns**:
```sql
ALTER TABLE events
ADD COLUMN branding_overrides JSONB DEFAULT NULL;

COMMENT ON COLUMN events.branding_overrides IS
'Optional event-specific branding overrides. Schema: {primary_color?, secondary_color?, logo_url?}';
```

**Validation Rules**:
- `event_name`: VARCHAR(255), NOT NULL, min 1 char
- `event_date`: DATE, NOT NULL, >= CURRENT_DATE (for new/edited future events)
- `description`: TEXT, max 2000 chars, plain text with line breaks
- `visibility`: ENUM('public', 'private'), NOT NULL
- `status`: Computed field = `CASE WHEN event_date < CURRENT_DATE THEN 'past' ELSE 'active' END`

**Indexes**:
```sql
CREATE INDEX idx_events_date_sort ON events(tenant_id, event_date ASC);
CREATE INDEX idx_events_created_sort ON events(tenant_id, created_at DESC);
```

---

### 2. tenants Table (Extend Existing)

**New Columns**:
```sql
ALTER TABLE tenants
ADD COLUMN branding JSONB DEFAULT '{"primary_color":"#3B82F6","secondary_color":"#10B981","logo_url":null}'::jsonb,
ADD COLUMN hotel_name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Hotel',
ADD COLUMN contact_email VARCHAR(255),
ADD COLUMN contact_phone VARCHAR(50);

COMMENT ON COLUMN tenants.branding IS
'Tenant branding configuration. Schema: {primary_color: hex, secondary_color: hex, logo_url: string|null}';
COMMENT ON COLUMN tenants.hotel_name IS 'Hotel/venue name (2-100 chars)';
COMMENT ON COLUMN tenants.contact_email IS 'Contact email (valid format)';
COMMENT ON COLUMN tenants.contact_phone IS 'Contact phone (international format supported)';
```

**Validation Rules**:
- `hotel_name`: VARCHAR(100), NOT NULL, length 2-100
- `contact_email`: VARCHAR(255), valid email format (regex)
- `contact_phone`: VARCHAR(50), flexible international format
- `branding.primary_color`: Hex color string (e.g., "#3B82F6")
- `branding.secondary_color`: Hex color string
- `branding.logo_url`: String (Supabase Storage path) or NULL

**Default Values**:
- `primary_color`: #3B82F6 (Tailwind blue-500)
- `secondary_color`: #10B981 (Tailwind green-500)
- `logo_url`: NULL (no logo)

---

### 3. Billing Info (Read-Only View)

**Note**: Billing data is managed externally (Stripe, PayPal, etc.). This feature only *displays* billing information via a read-only view or external API call.

**Assumed External Schema**:
```typescript
interface BillingInfo {
  tenant_id: string;
  plan_name: string;         // e.g., "Pro", "Enterprise"
  renewal_date: Date;        // Next billing date
  payment_method: string;    // e.g., "Visa •••• 1234"
}
```

**Implementation**: Backend service calls external billing API or joins read-only `billing_subscriptions` table.

---

## RLS Policies

### events Table Policies (Extend Existing)

**Policy: admin_can_edit_future_events**
```sql
CREATE POLICY "admin_can_edit_future_events"
ON events FOR UPDATE
USING (
  tenant_id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
  AND event_date >= CURRENT_DATE
)
WITH CHECK (
  tenant_id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
  AND event_date >= CURRENT_DATE
);
```

**Policy: admin_can_view_all_tenant_events**
```sql
-- Already exists, verify it includes new columns
CREATE POLICY "admin_can_view_all_tenant_events"
ON events FOR SELECT
USING (
  tenant_id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
);
```

### tenants Table Policies (Extend Existing)

**Policy: admin_can_update_tenant_branding**
```sql
CREATE POLICY "admin_can_update_tenant_branding"
ON tenants FOR UPDATE
USING (
  id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
);
```

**Policy: admin_can_view_own_tenant**
```sql
-- Already exists, verify it includes new columns
CREATE POLICY "admin_can_view_own_tenant"
ON tenants FOR SELECT
USING (
  id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
);
```

---

## TypeScript Interfaces

### Backend Models

**models/Event.ts** (extend existing):
```typescript
export interface Event {
  id: string;
  tenant_id: string;
  event_name: string;
  event_date: string;  // ISO date
  description: string | null;
  visibility: 'public' | 'private';
  status: 'active' | 'past';  // Computed from event_date
  created_by: string;
  created_at: string;
  updated_at: string;
  branding_overrides?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
}

export interface EventCreateInput {
  event_name: string;
  event_date: string;
  description?: string;
  visibility: 'public' | 'private';
}

export interface EventUpdateInput {
  event_name?: string;
  event_date?: string;
  description?: string;
  visibility?: 'public' | 'private';
}
```

**models/Branding.ts** (new):
```typescript
export interface Branding {
  primary_color: string;    // Hex color (e.g., "#3B82F6")
  secondary_color: string;  // Hex color
  logo_url: string | null;  // Supabase Storage path or null
}

export interface BrandingUpdateInput {
  primary_color?: string;
  secondary_color?: string;
}

export interface TenantWithBranding {
  id: string;
  subdomain: string;
  hotel_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  branding: Branding;
}
```

**models/TenantSettings.ts** (new):
```typescript
export interface TenantSettings {
  id: string;
  hotel_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  billing_info: BillingInfo | null;
}

export interface TenantSettingsUpdateInput {
  hotel_name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export interface BillingInfo {
  plan_name: string;
  renewal_date: string;
  payment_method: string;
}
```

---

## Validation Constraints

### Application-Level Validation

**Event Validation**:
```typescript
const eventSchema = {
  event_name: {
    required: true,
    minLength: 1,
    maxLength: 255
  },
  event_date: {
    required: true,
    format: 'date',
    minimum: 'today'  // For create/edit of future events
  },
  description: {
    required: false,
    maxLength: 2000,
    format: 'plain-text'  // No HTML, allow line breaks
  },
  visibility: {
    required: true,
    enum: ['public', 'private']
  }
};
```

**Branding Validation**:
```typescript
const brandingSchema = {
  primary_color: {
    required: false,
    format: 'hex-color',  // Regex: ^#[0-9A-Fa-f]{6}$
  },
  secondary_color: {
    required: false,
    format: 'hex-color'
  },
  logo_file: {
    required: false,
    maxSize: 2 * 1024 * 1024,  // 2MB
    allowedTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.svg']
  }
};
```

**Settings Validation**:
```typescript
const settingsSchema = {
  hotel_name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  contact_email: {
    required: false,
    format: 'email'  // RFC 5322 compliant
  },
  contact_phone: {
    required: false,
    minLength: 5,
    maxLength: 50,
    format: 'phone'  // Flexible international format
  }
};
```

---

## State Transitions

### Event Status State Machine

```
┌─────────┐
│  draft  │ (Future: unpublished events)
└─────────┘
     │
     │ publish (event_date >= today)
     ▼
┌─────────┐
│ active  │ (event_date >= today)
└─────────┘
     │
     │ auto-transition (date crosses to past)
     ▼
┌─────────┐
│  past   │ (event_date < today) - READ ONLY
└─────────┘
```

**Current Implementation**: No explicit "draft" state. All created events are "active" until date passes. Draft state deferred to future iteration.

---

## Data Relationships

```
┌──────────┐         ┌──────────┐
│ tenants  │◄────────┤  admins  │
│          │1      * │          │
└──────────┘         └──────────┘
     │
     │ 1
     │
     │ *
     ▼
┌──────────┐
│  events  │
│          │
└──────────┘
     │
     │ *
     │
     │ 1
     ▼
┌───────────────────────┐
│ private_event_tokens  │
└───────────────────────┘
```

**Key Relationships**:
- `tenants.id` → `events.tenant_id` (one-to-many)
- `tenants.id` → `admins.tenant_id` (one-to-many)
- `events.id` → `private_event_tokens.event_id` (one-to-many)
- `tenants.branding.logo_url` → `storage.objects` (Supabase Storage)

---

## Migration Script

**File**: `backend/migrations/002_admin_screens.sql`

```sql
-- ============================================================================
-- Migration 002: Admin Panel Secondary Screens
-- Date: 2025-10-07
-- Description: Extend events and tenants tables for branding, settings
-- ============================================================================

-- Extend events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS branding_overrides JSONB DEFAULT NULL;

COMMENT ON COLUMN events.branding_overrides IS
'Optional event-specific branding overrides. Schema: {primary_color?, secondary_color?, logo_url?}';

-- Extend tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{"primary_color":"#3B82F6","secondary_color":"#10B981","logo_url":null}'::jsonb,
ADD COLUMN IF NOT EXISTS hotel_name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Hotel',
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

COMMENT ON COLUMN tenants.branding IS
'Tenant branding configuration. Schema: {primary_color: hex, secondary_color: hex, logo_url: string|null}';
COMMENT ON COLUMN tenants.hotel_name IS 'Hotel/venue name (2-100 chars)';
COMMENT ON COLUMN tenants.contact_email IS 'Contact email (valid format)';
COMMENT ON COLUMN tenants.contact_phone IS 'Contact phone (international format supported)';

-- Add indexes for sorting
CREATE INDEX IF NOT EXISTS idx_events_date_sort ON events(tenant_id, event_date ASC);
CREATE INDEX IF NOT EXISTS idx_events_created_sort ON events(tenant_id, created_at DESC);

-- RLS Policy: Admin can edit future events
DROP POLICY IF EXISTS "admin_can_edit_future_events" ON events;
CREATE POLICY "admin_can_edit_future_events"
ON events FOR UPDATE
USING (
  tenant_id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
  AND event_date >= CURRENT_DATE
)
WITH CHECK (
  tenant_id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
  AND event_date >= CURRENT_DATE
);

-- RLS Policy: Admin can update tenant branding/settings
DROP POLICY IF EXISTS "admin_can_update_tenant_branding" ON tenants;
CREATE POLICY "admin_can_update_tenant_branding"
ON tenants FOR UPDATE
USING (
  id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
);

-- Verify RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
```

---

## Summary

- **Tables Modified**: 2 (events, tenants)
- **Columns Added**: 5 total (1 to events, 4 to tenants)
- **Indexes Added**: 2 (for event sorting)
- **RLS Policies Added**: 2 (edit future events, update tenant)
- **TypeScript Interfaces**: 3 new models (Branding, TenantSettings, BillingInfo)
- **Validation Rules**: Defined for all user inputs
- **Multi-Tenant Isolation**: Enforced via RLS on all operations
