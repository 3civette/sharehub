# Data Model: Event Flow Management

**Feature**: 003-ora-facciamo-il
**Date**: 2025-10-07
**Database**: Supabase PostgreSQL with RLS

## Overview

This feature introduces 7 new tables to support event lifecycle management with three-level content hierarchy (Event → Session → Speech → Slide), token-based access control, tiered metrics, and activity logging with configurable retention.

---

## Entity Relationship Diagram

```
tenants (existing from feature 002)
  ↓ 1:N
events
  ↓ 1:N                    ↓ 1:N                    ↓ 1:N                    ↓ 1:N
sessions                 access_tokens         event_metrics          activity_logs
  ↓ 1:N
speeches
  ↓ 1:N
slides
```

---

## Table Definitions

### 1. events

**Purpose**: Core event entity with visibility control and lifecycle management

**Columns**:
```sql
CREATE TABLE events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "annual-conference-2025")

  -- Core attributes
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,

  -- Visibility & Status
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'past', 'archived')),

  -- Token configuration (for private events)
  token_expiration_date TIMESTAMP WITH TIME ZONE,

  -- Data retention
  retention_policy TEXT NOT NULL DEFAULT 'keep_forever'
    CHECK (retention_policy IN ('keep_forever', 'archive_1year', 'delete_2years')),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES admins(id),

  -- Constraints
  CONSTRAINT valid_token_expiration
    CHECK (visibility = 'private' AND token_expiration_date IS NOT NULL
           OR visibility = 'public' AND token_expiration_date IS NULL)
);

-- Indexes
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);

-- RLS Policy
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own events"
ON events FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Relationships**:
- Many-to-One: `tenant_id` → `tenants.id`
- One-to-Many: `id` → `sessions.event_id`
- One-to-Many: `id` → `access_tokens.event_id`
- One-to-One: `id` → `event_metrics.event_id`
- One-to-Many: `id` → `activity_logs.event_id`

**Validation Rules**:
- `name`: Required, max 200 characters
- `date`: Required, cannot be before 2020-01-01
- `slug`: Unique per tenant, alphanumeric + hyphens only
- `visibility`: Private events MUST have `token_expiration_date`
- `token_expiration_date`: Must be in the future at creation time

**State Transitions**:
```
upcoming → past (automatic when date passes)
past → archived (manual or via retention policy)
archived → past (admin can reactivate)
```

**Related Requirements**: FR-001, FR-002, FR-003, FR-031, FR-033

---

### 2. sessions

**Purpose**: Time blocks or thematic groupings within events

**Columns**:
```sql
CREATE TABLE sessions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, -- Denormalized for RLS

  -- Attributes
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_event_id ON sessions(event_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX idx_sessions_display_order ON sessions(event_id, display_order);

-- RLS Policy
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own sessions"
ON sessions FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Relationships**:
- Many-to-One: `event_id` → `events.id` (CASCADE DELETE)
- Many-to-One: `tenant_id` → `tenants.id`
- One-to-Many: `id` → `speeches.session_id`

**Validation Rules**:
- `title`: Required, max 100 characters
- `description`: Optional, max 500 characters
- `display_order`: Non-negative integer, unique per event

**Related Requirements**: FR-012a, FR-012b, FR-012f, FR-012h, FR-012j

---

### 3. speeches

**Purpose**: Individual presentations or talks within sessions

**Columns**:
```sql
CREATE TABLE speeches (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, -- Denormalized for RLS

  -- Attributes
  title TEXT NOT NULL,
  speaker_name TEXT,
  duration INTEGER, -- Duration in minutes
  description TEXT,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_speeches_session_id ON speeches(session_id);
CREATE INDEX idx_speeches_tenant_id ON speeches(tenant_id);
CREATE INDEX idx_speeches_display_order ON speeches(session_id, display_order);

-- RLS Policy
ALTER TABLE speeches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own speeches"
ON speeches FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Relationships**:
- Many-to-One: `session_id` → `sessions.id` (CASCADE DELETE)
- Many-to-One: `tenant_id` → `tenants.id`
- One-to-Many: `id` → `slides.speech_id`

**Validation Rules**:
- `title`: Required, max 150 characters
- `speaker_name`: Optional, max 100 characters
- `duration`: Optional, positive integer (1-600 minutes)
- `display_order`: Non-negative integer, unique per session

**Related Requirements**: FR-012a, FR-012c, FR-012g, FR-012i, FR-012k

---

### 4. slides

**Purpose**: Uploaded presentation files associated with speeches

**Columns**:
```sql
CREATE TABLE slides (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speech_id UUID NOT NULL REFERENCES speeches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, -- Denormalized for RLS

  -- File attributes
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size INTEGER NOT NULL, -- Size in bytes
  mime_type TEXT NOT NULL,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  uploaded_by TEXT, -- 'organizer:{token_id}' or 'admin:{admin_id}'
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_slides_speech_id ON slides(speech_id);
CREATE INDEX idx_slides_tenant_id ON slides(tenant_id);
CREATE INDEX idx_slides_display_order ON slides(speech_id, display_order);
CREATE INDEX idx_slides_storage_path ON slides(storage_path);

-- RLS Policy
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own slides"
ON slides FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Relationships**:
- Many-to-One: `speech_id` → `speeches.id` (CASCADE DELETE)
- Many-to-One: `tenant_id` → `tenants.id`

**Validation Rules**:
- `filename`: Required, max 255 characters, sanitized for filesystem
- `storage_path`: Required, unique
- `file_size`: Required, max 100MB (104857600 bytes)
- `mime_type`: Must be in allowed list (pdf, ppt, pptx, key, odp)
- `display_order`: Non-negative integer, unique per speech

**Related Requirements**: FR-012d, FR-012l, FR-016a, FR-023a

---

### 5. access_tokens

**Purpose**: Token-based authentication for private events

**Columns**:
```sql
CREATE TABLE access_tokens (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Token attributes
  token TEXT UNIQUE NOT NULL, -- Generated via nanoid (21 chars)
  type TEXT NOT NULL CHECK (type IN ('organizer', 'participant')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Usage tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  use_count INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE UNIQUE INDEX idx_access_tokens_token ON access_tokens(token);
CREATE INDEX idx_access_tokens_event_id ON access_tokens(event_id);
CREATE INDEX idx_access_tokens_expires_at ON access_tokens(expires_at);

-- RLS Policy
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Public read for validation (middleware checks expiration)
CREATE POLICY "Anyone can validate tokens"
ON access_tokens FOR SELECT
USING (true);

-- Only admins can create/delete tokens
CREATE POLICY "Admins can manage tokens"
ON access_tokens FOR INSERT, UPDATE, DELETE
USING (auth.uid() IN (SELECT id FROM admins WHERE tenant_id = (
  SELECT tenant_id FROM events WHERE events.id = access_tokens.event_id
)));
```

**Relationships**:
- Many-to-One: `event_id` → `events.id` (CASCADE DELETE)

**Validation Rules**:
- `token`: Required, unique, exactly 21 alphanumeric characters
- `type`: Required, either 'organizer' or 'participant'
- `expires_at`: Required, must be after creation time
- Exactly 2 tokens per private event (1 organizer + 1 participant)

**Related Requirements**: FR-004, FR-005, FR-007, FR-007a, FR-008, FR-009, FR-011, FR-012

---

### 6. event_metrics

**Purpose**: Analytics data with tiered access based on subscription plan

**Columns**:
```sql
CREATE TABLE event_metrics (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, -- Denormalized for RLS

  -- Basic metrics (free tier)
  page_views INTEGER NOT NULL DEFAULT 0,
  total_slide_downloads INTEGER NOT NULL DEFAULT 0,

  -- Premium metrics (stored as JSONB, displayed based on tenant plan)
  unique_visitors JSONB NOT NULL DEFAULT '{}', -- { "ip_hash": "last_seen_iso" }
  per_slide_downloads JSONB NOT NULL DEFAULT '{}', -- { "slide_id": count }
  per_speech_downloads JSONB NOT NULL DEFAULT '{}', -- { "speech_id": count }
  geographic_data JSONB NOT NULL DEFAULT '{}', -- { "country_code": count }
  device_types JSONB NOT NULL DEFAULT '{}', -- { "device_type": count }
  access_timeline JSONB NOT NULL DEFAULT '[]', -- [{ ts, action, actor_type }]

  -- Audit
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_event_metrics_event_id ON event_metrics(event_id);
CREATE INDEX idx_event_metrics_tenant_id ON event_metrics(tenant_id);

-- RLS Policy
ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own metrics"
ON event_metrics FOR SELECT
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "System can update metrics"
ON event_metrics FOR INSERT, UPDATE
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Relationships**:
- One-to-One: `event_id` → `events.id` (CASCADE DELETE)
- Many-to-One: `tenant_id` → `tenants.id`

**Validation Rules**:
- Metrics row auto-created when event is created
- JSONB fields validated for structure (not null, valid JSON)
- Frontend filters display based on `tenants.subscription_plan`

**Related Requirements**: FR-015, FR-015a, FR-015b, FR-015c

---

### 7. activity_logs

**Purpose**: Audit trail of file operations with configurable retention

**Columns**:
```sql
CREATE TABLE activity_logs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, -- Denormalized for RLS

  -- Event details
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('organizer', 'participant', 'anonymous', 'admin')),
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'download', 'view', 'edit', 'delete')),

  -- File context (if applicable)
  filename TEXT,
  file_size INTEGER,
  slide_id UUID REFERENCES slides(id) ON DELETE SET NULL,
  speech_id UUID REFERENCES speeches(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Retention configuration
  retention_days INTEGER NOT NULL DEFAULT 90, -- 30, 90, 365, or -1 for indefinite

  -- Additional metadata
  metadata JSONB -- { ip_hash, user_agent, etc. }
);

-- Indexes
CREATE INDEX idx_activity_logs_event_id ON activity_logs(event_id);
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_retention ON activity_logs(retention_days, timestamp)
  WHERE retention_days > 0; -- For cleanup queries

-- RLS Policy
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own logs"
ON activity_logs FOR SELECT
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "System can insert logs"
ON activity_logs FOR INSERT
WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM activity_logs
  WHERE retention_days > 0
    AND timestamp < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

**Relationships**:
- Many-to-One: `event_id` → `events.id` (CASCADE DELETE)
- Many-to-One: `tenant_id` → `tenants.id`
- Many-to-One: `slide_id` → `slides.id` (SET NULL on delete)
- Many-to-One: `speech_id` → `speeches.id` (SET NULL on delete)
- Many-to-One: `session_id` → `sessions.id` (SET NULL on delete)

**Validation Rules**:
- `actor_type`: Required, validated enum
- `action_type`: Required, validated enum
- `retention_days`: -1 for indefinite, or 30/90/365 for time-based
- Logs automatically purged after retention period expires

**Related Requirements**: FR-019, FR-019a, FR-019b, FR-019c, FR-029, FR-029a, FR-029b, FR-029c

---

## Cascade Delete Behavior

### Event Deletion
When an event is deleted:
1. All sessions cascade delete
2. All speeches cascade delete (via sessions)
3. All slides cascade delete (via speeches)
4. All access_tokens cascade delete
5. Event_metrics cascade delete
6. All activity_logs cascade delete
7. Files in Supabase Storage must be manually deleted via cleanup job

### Session Deletion
When a session is deleted:
1. All speeches cascade delete
2. All slides cascade delete (via speeches)
3. Activity log references set to NULL

### Speech Deletion
When a speech is deleted:
1. All slides cascade delete
2. Activity log references set to NULL

### Slide Deletion
1. Activity log references set to NULL
2. File in Supabase Storage must be deleted

**Related Requirements**: FR-012j, FR-012k, FR-012l, FR-018

---

## Data Integrity Constraints

### Referential Integrity
- All foreign keys use ON DELETE CASCADE or SET NULL
- No orphaned records possible at any hierarchy level
- Tenant isolation enforced via RLS policies on all tables

### Business Logic Constraints
- Private events must have exactly 2 tokens (1 organizer + 1 participant)
- Token expiration must be in future at creation time
- Display orders must be unique within parent scope
- File sizes cannot exceed 100MB
- Retention policy applies at tenant level (from tenants.retention_policy)

### Uniqueness Constraints
- `events.slug`: Unique per tenant
- `access_tokens.token`: Globally unique
- `event_metrics.event_id`: One metrics row per event
- Display orders: Unique within parent (event → sessions, session → speeches, speech → slides)

---

## Performance Considerations

### Indexes
All foreign keys indexed for efficient joins and cascade operations.

### Denormalized Fields
`tenant_id` denormalized to child tables (sessions, speeches, slides, activity_logs) to:
- Avoid recursive RLS policy checks
- Enable direct tenant filtering without joins
- Maintain from feature 002 RLS lessons learned

### JSONB Usage
Premium metrics stored as JSONB for:
- Schema flexibility (easy to add new metric types)
- Efficient storage (no null columns for free-tier tenants)
- Query performance (GIN indexes possible if needed)

### Partitioning Strategy (Future)
Activity logs table could be partitioned by timestamp for:
- Faster retention cleanup
- Better query performance on historical data
- Deferred until scale justifies complexity

---

## Migration Strategy

### Order of Table Creation
1. events (depends on tenants)
2. sessions (depends on events)
3. speeches (depends on sessions)
4. slides (depends on speeches)
5. access_tokens (depends on events)
6. event_metrics (depends on events)
7. activity_logs (depends on events, optionally slides/speeches/sessions)

### Seed Data
None required. Tables start empty. Tenant subscription plans already exist from feature 002.

### Rollback Strategy
Drop tables in reverse order with CASCADE to remove all dependent data and constraints.

---

## Related Documents
- [research.md](./research.md) - Technology decisions and implementation patterns
- [spec.md](./spec.md) - Full functional requirements (79 FRs)
- [plan.md](./plan.md) - Implementation plan
