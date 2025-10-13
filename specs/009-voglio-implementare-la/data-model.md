# Data Model: CloudConvert Thumbnail Generation with Event-Level Toggle

**Feature**: `009-voglio-implementare-la`
**Date**: 2025-01-13
**Input**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This data model implements CloudConvert-based thumbnail generation with event-level toggles, tenant quota tracking, and failure monitoring. All entities follow multi-tenant isolation principles with RLS enforcement.

## Entity Relationship Diagram

```
tenants
  ├── thumbnail_quota_total (NEW COLUMN)
  ├── thumbnail_quota_used (NEW COLUMN)
  └── [1:N] → events
                └── thumbnail_generation_enabled (NEW COLUMN)

events [1:N] → sessions [1:N] → speeches [1:N] → slides
                                                   ├── thumbnail_status (EXISTING)
                                                   ├── thumbnail_r2_key (EXISTING)
                                                   └── thumbnail_generated_at (EXISTING)

slides [1:N] ← cloudconvert_jobs (NEW TABLE)
             └── tracks external job status

thumbnail_failure_log (NEW TABLE)
  ├── tenant_id → tenants
  ├── event_id → events
  └── slide_id → slides
```

## Modified Entities

### 1. Tenants Table (Modified)

**Purpose**: Track per-tenant thumbnail quota usage for freemium model enforcement.

**Schema Changes**:
```sql
ALTER TABLE tenants
ADD COLUMN thumbnail_quota_total INTEGER NOT NULL DEFAULT 5
  CHECK (thumbnail_quota_total >= 0),
ADD COLUMN thumbnail_quota_used INTEGER NOT NULL DEFAULT 0
  CHECK (thumbnail_quota_used >= 0 AND thumbnail_quota_used <= thumbnail_quota_total);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, existing | Tenant identifier |
| `thumbnail_quota_total` | INTEGER | NOT NULL, DEFAULT 5, CHECK >= 0 | Total thumbnails allowed (freemium: 5 free) |
| `thumbnail_quota_used` | INTEGER | NOT NULL, DEFAULT 0, CHECK 0 <= used <= total | Thumbnails consumed |

**Validation Rules**:
- `thumbnail_quota_used` MUST be <= `thumbnail_quota_total` (enforced by CHECK constraint)
- Both columns MUST be non-negative
- Default: 5 free thumbnails per tenant

**State Transitions**:
```
Initial State: { total: 5, used: 0 }
  → On thumbnail generation: used++
  → On quota purchase (future): total += purchased_count
  → On quota reset (future): used = 0
```

**RLS Policies**:
```sql
-- Admins can view their tenant's quota
CREATE POLICY "admins_view_own_tenant_quota" ON tenants FOR SELECT
USING (id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));

-- System can update quota atomically (via SECURITY DEFINER function)
-- No direct UPDATE policy needed (atomic function handles updates)
```

**Indexes**:
```sql
-- No additional indexes needed (tenant PK already indexed)
```

---

### 2. Events Table (Modified)

**Purpose**: Event-level toggle to enable/disable thumbnail generation per event.

**Schema Changes**:
```sql
ALTER TABLE events
ADD COLUMN thumbnail_generation_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, existing | Event identifier |
| `thumbnail_generation_enabled` | BOOLEAN | NOT NULL, DEFAULT FALSE | Enable thumbnail generation for this event |

**Validation Rules**:
- Must be boolean (true/false)
- Defaults to `FALSE` (opt-in behavior)
- Cannot be NULL

**State Transitions**:
```
Initial State: thumbnail_generation_enabled = false
  → Admin enables toggle: thumbnail_generation_enabled = true
    → Triggers retroactive generation for slides with thumbnail_status = 'none'
  → Admin disables toggle: thumbnail_generation_enabled = false
    → Existing thumbnails remain, new uploads skip generation
```

**RLS Policies**:
```sql
-- Admins can update events in their tenant
CREATE POLICY "admins_update_own_events" ON events FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));
```

**Indexes**:
```sql
-- Index for retroactive generation queries
CREATE INDEX idx_events_thumbnail_enabled ON events(thumbnail_generation_enabled)
WHERE thumbnail_generation_enabled = true;
```

---

### 3. Slides Table (Existing Columns Reused)

**Purpose**: Track thumbnail generation status and storage location.

**Existing Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Slide identifier |
| `thumbnail_status` | TEXT | CHECK IN ('none', 'pending', 'processing', 'completed', 'failed') | Current thumbnail status |
| `thumbnail_r2_key` | TEXT | NULLABLE | R2 storage key for thumbnail (NULL if not generated) |
| `thumbnail_generated_at` | TIMESTAMPTZ | NULLABLE | Timestamp of successful generation |
| `r2_key` | TEXT | NOT NULL | Original slide R2 key |
| `mime_type` | TEXT | NOT NULL | Original file MIME type |

**Validation Rules**:
- `thumbnail_status` must be one of: `none`, `pending`, `processing`, `completed`, `failed`
- `thumbnail_r2_key` must be NULL if status is not `completed`
- `thumbnail_generated_at` must be NULL if status is not `completed`

**State Transitions**:
```
Initial State: thumbnail_status = 'none'
  → Upload complete: thumbnail_status = 'pending' (if event toggle enabled)
  → Job initiated: thumbnail_status = 'processing'
  → Job completed: thumbnail_status = 'completed', thumbnail_r2_key set, thumbnail_generated_at set
  → Job failed: thumbnail_status = 'failed'
  → Retry: 'failed' → 'pending' → 'processing' → ('completed' | 'failed')
```

**RLS Policies** (existing):
```sql
-- Admins can view slides in their tenant
CREATE POLICY "admins_view_own_slides" ON slides FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));

-- System can update slides (via API routes)
CREATE POLICY "system_update_slides" ON slides FOR UPDATE
USING (true); -- Secured by API route authentication
```

**Indexes** (existing):
```sql
CREATE INDEX idx_slides_speech_id ON slides(speech_id);
CREATE INDEX idx_slides_thumbnail_status ON slides(thumbnail_status);
```

---

## New Entities

### 4. CloudConvert Jobs Table (New)

**Purpose**: Track external CloudConvert API job status for async processing and debugging.

**Schema**:
```sql
CREATE TABLE cloudconvert_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  cloudconvert_job_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  webhook_received_at TIMESTAMPTZ,
  UNIQUE(slide_id) -- One job per slide at a time
);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Internal job identifier |
| `tenant_id` | UUID | NOT NULL, FK → tenants(id) | Tenant isolation |
| `slide_id` | UUID | NOT NULL, FK → slides(id), UNIQUE | Associated slide (1:1 relationship) |
| `cloudconvert_job_id` | TEXT | NOT NULL, UNIQUE | External CloudConvert job ID |
| `status` | TEXT | NOT NULL, DEFAULT 'pending', CHECK | Job status (mirrors CloudConvert status) |
| `error_message` | TEXT | NULLABLE | Error details if failed |
| `idempotency_key` | TEXT | UNIQUE, NULLABLE | Prevent duplicate job creation |
| `started_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Job initiation timestamp |
| `completed_at` | TIMESTAMPTZ | NULLABLE | Job completion timestamp |
| `webhook_received_at` | TIMESTAMPTZ | NULLABLE | Webhook receipt timestamp (for monitoring) |

**Validation Rules**:
- `cloudconvert_job_id` must be unique across all jobs
- `slide_id` must be unique (one active job per slide)
- `status` must be one of: `pending`, `processing`, `completed`, `failed`, `timeout`
- `completed_at` must be NULL if status is `pending` or `processing`
- `completed_at` must be NOT NULL if status is `completed`, `failed`, or `timeout`

**State Transitions**:
```
Initial State: status = 'pending', started_at = NOW()
  → CloudConvert acknowledges: status = 'processing'
  → Webhook success: status = 'completed', completed_at = NOW(), webhook_received_at = NOW()
  → Webhook failure: status = 'failed', error_message set, completed_at = NOW()
  → Timeout (5 min): status = 'timeout', completed_at = NOW()
```

**RLS Policies**:
```sql
-- Admins can view jobs for their tenant
CREATE POLICY "admins_view_own_jobs" ON cloudconvert_jobs FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));

-- System can insert/update jobs (via API routes)
CREATE POLICY "system_manage_jobs" ON cloudconvert_jobs FOR ALL
USING (true); -- Secured by API route authentication
```

**Indexes**:
```sql
-- Query by slide_id for status checks
CREATE INDEX idx_cloudconvert_jobs_slide_id ON cloudconvert_jobs(slide_id);

-- Query by tenant_id for admin dashboard
CREATE INDEX idx_cloudconvert_jobs_tenant_id ON cloudconvert_jobs(tenant_id);

-- Query by status for recovery function
CREATE INDEX idx_cloudconvert_jobs_status ON cloudconvert_jobs(status)
WHERE status IN ('pending', 'processing');

-- Query by started_at for timeout detection
CREATE INDEX idx_cloudconvert_jobs_timeout ON cloudconvert_jobs(started_at)
WHERE status IN ('pending', 'processing') AND started_at < NOW() - INTERVAL '5 minutes';
```

---

### 5. Thumbnail Failure Log Table (New)

**Purpose**: Track consecutive thumbnail generation failures for email notification triggering.

**Schema**:
```sql
CREATE TABLE thumbnail_failure_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL
    CHECK (error_type IN ('cloudconvert_api_error', 'webhook_timeout', 'quota_exceeded', 'invalid_format', 'network_error')),
  error_message TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Log entry identifier |
| `tenant_id` | UUID | NOT NULL, FK → tenants(id) | Tenant isolation |
| `event_id` | UUID | NOT NULL, FK → events(id) | Associated event |
| `slide_id` | UUID | NOT NULL, FK → slides(id) | Associated slide |
| `error_type` | TEXT | NOT NULL, CHECK | Categorized error type |
| `error_message` | TEXT | NOT NULL | Human-readable error message |
| `occurred_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Failure timestamp |

**Validation Rules**:
- `error_type` must be one of: `cloudconvert_api_error`, `webhook_timeout`, `quota_exceeded`, `invalid_format`, `network_error`
- `error_message` must not be empty
- All foreign keys must reference valid records

**State Transitions**:
- This is an append-only log (no updates/deletes)
- Each failure creates a new record
- Email notification triggered when 3+ consecutive failures detected

**Consecutive Failure Detection Query**:
```sql
-- Check for 3+ consecutive failures for an event
WITH recent_failures AS (
  SELECT COUNT(*) as failure_count
  FROM thumbnail_failure_log
  WHERE event_id = $1
    AND occurred_at > NOW() - INTERVAL '24 hours'
  ORDER BY occurred_at DESC
  LIMIT 3
)
SELECT failure_count >= 3 AS should_notify
FROM recent_failures;
```

**RLS Policies**:
```sql
-- Admins can view failures for their tenant
CREATE POLICY "admins_view_own_failures" ON thumbnail_failure_log FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));

-- System can insert failures (via API routes)
CREATE POLICY "system_insert_failures" ON thumbnail_failure_log FOR INSERT
WITH CHECK (true); -- Secured by API route authentication
```

**Indexes**:
```sql
-- Query by event_id for consecutive failure detection
CREATE INDEX idx_failure_log_event_occurred ON thumbnail_failure_log(event_id, occurred_at DESC);

-- Query by tenant_id for admin dashboard
CREATE INDEX idx_failure_log_tenant_id ON thumbnail_failure_log(tenant_id);
```

---

## Database Functions

### Atomic Quota Check and Increment

**Purpose**: Prevent race conditions when checking and reserving thumbnail quota.

**Function**:
```sql
CREATE OR REPLACE FUNCTION check_and_increment_thumbnail_quota(p_tenant_id UUID)
RETURNS TABLE (
  quota_available BOOLEAN,
  quota_used INTEGER,
  quota_total INTEGER,
  quota_remaining INTEGER
) AS $$
DECLARE
  v_quota_used INTEGER;
  v_quota_total INTEGER;
BEGIN
  -- Lock tenant row to prevent concurrent modifications
  SELECT thumbnail_quota_used, thumbnail_quota_total
  INTO v_quota_used, v_quota_total
  FROM tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  -- Check if quota available
  IF v_quota_used < v_quota_total THEN
    -- Increment usage
    UPDATE tenants
    SET
      thumbnail_quota_used = thumbnail_quota_used + 1,
      updated_at = NOW()
    WHERE id = p_tenant_id
    RETURNING thumbnail_quota_used, thumbnail_quota_total
    INTO v_quota_used, v_quota_total;

    -- Return success with updated quota
    RETURN QUERY SELECT
      true AS quota_available,
      v_quota_used AS quota_used,
      v_quota_total AS quota_total,
      (v_quota_total - v_quota_used) AS quota_remaining;
  ELSE
    -- Quota exhausted
    RETURN QUERY SELECT
      false AS quota_available,
      v_quota_used AS quota_used,
      v_quota_total AS quota_total,
      0 AS quota_remaining;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**:
```sql
-- Check and reserve quota atomically
SELECT * FROM check_and_increment_thumbnail_quota('tenant-uuid-here');

-- Response if quota available:
-- quota_available | quota_used | quota_total | quota_remaining
-- ----------------+------------+-------------+-----------------
-- true            | 1          | 5           | 4

-- Response if quota exhausted:
-- quota_available | quota_used | quota_total | quota_remaining
-- ----------------+------------+-------------+-----------------
-- false           | 5          | 5           | 0
```

**Security**:
- `SECURITY DEFINER`: Executes with function owner's privileges
- Row-level locking prevents race conditions
- Atomic check-and-increment operation

---

### Rollback Quota on Failure

**Purpose**: Decrement quota if CloudConvert job creation fails after reservation.

**Function**:
```sql
CREATE OR REPLACE FUNCTION rollback_thumbnail_quota(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE tenants
  SET
    thumbnail_quota_used = GREATEST(thumbnail_quota_used - 1, 0),
    updated_at = NOW()
  WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**:
```sql
-- Rollback quota after failed job creation
SELECT rollback_thumbnail_quota('tenant-uuid-here');
```

**Security**:
- `SECURITY DEFINER`: Executes with function owner's privileges
- `GREATEST(quota_used - 1, 0)`: Prevents negative quota values

---

## Migration Script

**Location**: `backend/migrations/009-thumbnail-generation.sql`

**Order of Operations**:
1. Add columns to existing tables (tenants, events)
2. Create new tables (cloudconvert_jobs, thumbnail_failure_log)
3. Create indexes
4. Create RLS policies
5. Create database functions
6. Verify constraints

**Rollback Strategy**:
```sql
-- Rollback script (009-thumbnail-generation-rollback.sql)
DROP FUNCTION IF EXISTS check_and_increment_thumbnail_quota(UUID);
DROP FUNCTION IF EXISTS rollback_thumbnail_quota(UUID);
DROP TABLE IF EXISTS thumbnail_failure_log CASCADE;
DROP TABLE IF EXISTS cloudconvert_jobs CASCADE;
ALTER TABLE events DROP COLUMN IF EXISTS thumbnail_generation_enabled;
ALTER TABLE tenants DROP COLUMN IF EXISTS thumbnail_quota_used;
ALTER TABLE tenants DROP COLUMN IF EXISTS thumbnail_quota_total;
```

---

## Data Volume Estimates

**Assumptions**:
- 10 tenants
- 5 events per tenant (50 events total)
- 20 slides per event (1,000 slides total)
- 50% thumbnail generation enabled (500 thumbnails)
- 5% failure rate (25 failures)

**Storage Requirements**:
| Table | Row Count | Row Size (est.) | Total Size |
|-------|-----------|-----------------|------------|
| `tenants` (modified) | 10 | +8 bytes | +80 bytes |
| `events` (modified) | 50 | +1 byte | +50 bytes |
| `slides` (existing) | 1,000 | unchanged | unchanged |
| `cloudconvert_jobs` | 500 | ~200 bytes | ~100 KB |
| `thumbnail_failure_log` | 25 | ~150 bytes | ~4 KB |
| **Total New Data** | | | **~104 KB** |

**Query Performance**:
- Quota check: < 10ms (indexed tenant PK lookup + FOR UPDATE)
- Job status check: < 5ms (indexed slide_id lookup)
- Failure detection: < 20ms (indexed event_id + occurred_at scan, last 24h)
- Retroactive generation query: < 50ms (indexed event toggle + slide status scan)

---

## Validation Rules Summary

### Business Logic Validation
1. **Quota Enforcement**: Must check quota BEFORE CloudConvert API call
2. **Thumbnail Status**: Only initiate job if status is `none` or `failed`
3. **Event Toggle**: Only generate thumbnails if `thumbnail_generation_enabled = true`
4. **Failure Notification**: Send email after 3+ consecutive failures within 24 hours
5. **Timeout Detection**: Mark jobs as `timeout` after 5 minutes (300 seconds)

### Data Integrity Validation
1. **Referential Integrity**: All foreign keys must reference existing records
2. **Tenant Isolation**: All queries must filter by tenant_id (enforced by RLS)
3. **Idempotency**: Use `idempotency_key` to prevent duplicate job creation
4. **Atomic Operations**: Quota check-and-increment must be atomic (no race conditions)

### Input Validation
1. **File Types**: Only PPT, PPTX, PDF, JPEG, PNG supported (validated before job creation)
2. **Slide Existence**: Slide must exist and belong to tenant before job creation
3. **Event Ownership**: Event must belong to tenant before retroactive generation

---

## Related Documents

- [spec.md](./spec.md) - Feature specification with requirements
- [research.md](./research.md) - Technical research findings
- [plan.md](./plan.md) - Implementation plan and constitution check
- [contracts/](./contracts/) - API contract specifications (generated next)
- [quickstart.md](./quickstart.md) - Step-by-step validation guide (generated later)
