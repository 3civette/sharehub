# Data Model: Serverless Architecture with R2 Storage

**Feature**: 008-voglio-implementare-la
**Date**: 2025-10-11

## Overview

This feature updates the **Slide** entity to support Cloudflare R2 storage with 48-hour automatic retention.

## Entity Changes

### Updated Entity: Slide

**Table**: `slides`

**Schema Changes**:
```sql
-- New columns to add
ALTER TABLE slides ADD COLUMN r2_key TEXT;
ALTER TABLE slides ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- New indexes for performance
CREATE INDEX idx_slides_uploaded_at ON slides(uploaded_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_slides_tenant_session ON slides(tenant_id, session_id);
```

**Full Schema** (after migration):
```typescript
interface Slide {
  // Existing fields
  id: string;                    // UUID primary key
  session_id: string;            // UUID foreign key → sessions
  filename: string;              // Original upload name (e.g., "presentation.pdf")
  file_size: number;             // Size in bytes (max 1073741824 = 1GB)
  mime_type: string;             // MIME type (e.g., "application/pdf")
  tenant_id: string;             // UUID for multi-tenant isolation (RLS)
  uploaded_at: Date;             // Timestamp of upload

  // New fields (this feature)
  r2_key: string | null;         // ← NEW: R2 object path (e.g., "tenant-{id}/event-{id}/slide-{id}.pdf")
  deleted_at: Date | null;       // ← NEW: Soft delete timestamp (null = active)
}
```

**Field Details**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `session_id` | UUID | No | Links to session (foreign key) |
| `filename` | VARCHAR(255) | No | Original filename from upload |
| `file_size` | BIGINT | No | File size in bytes (1-1073741824) |
| `mime_type` | VARCHAR(100) | No | MIME type for validation |
| `tenant_id` | UUID | No | Multi-tenant isolation |
| `uploaded_at` | TIMESTAMP | No | Upload timestamp (indexed) |
| `r2_key` | TEXT | **Yes** | R2 storage path (null for legacy files) |
| `deleted_at` | TIMESTAMP | **Yes** | Soft delete marker (null = active) |

---

## R2 Key Structure

**Pattern**: `tenant-{tenant_id}/event-{event_id}/slide-{slide_id}.{extension}`

**Example**:
```
tenant-550e8400-e29b-41d4-a716-446655440000/event-6ba7b810-9dad-11d1-80b4-00c04fd430c8/slide-f47ac10b-58cc-4372-a567-0e02b2c3d479.pdf
```

**Benefits**:
- **Tenant isolation**: Easy to audit/delete all files for a tenant
- **Event grouping**: All slides for an event in one prefix
- **Unique identification**: Slide ID prevents collisions
- **Extension preservation**: Maintains original file type

**Code Example**:
```typescript
function generateR2Key(tenantId: string, eventId: string, slideId: string, filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || 'bin';
  return `tenant-${tenantId}/event-${eventId}/slide-${slideId}.${extension}`;
}
```

---

## Indexes

**Purpose**: Optimize cleanup queries and event listing

### Index 1: uploaded_at (for cleanup job)
```sql
CREATE INDEX idx_slides_uploaded_at
ON slides(uploaded_at)
WHERE deleted_at IS NULL;
```

**Used by**: Cleanup scheduled function
**Query optimized**:
```sql
SELECT id, r2_key
FROM slides
WHERE uploaded_at < NOW() - INTERVAL '48 hours'
  AND deleted_at IS NULL;
```

### Index 2: tenant_id + session_id (for event queries)
```sql
CREATE INDEX idx_slides_tenant_session
ON slides(tenant_id, session_id);
```

**Used by**: Event detail pages, admin slide listing
**Query optimized**:
```sql
SELECT *
FROM slides
WHERE tenant_id = $1
  AND session_id = $2
  AND deleted_at IS NULL;
```

---

## Relationships

**Unchanged** - existing relationships remain:

```
tenants (1) ─────── (many) slides
sessions (1) ─────── (many) slides
```

**RLS Policies**: No changes needed - existing policies apply to new columns.

---

## Migration Strategy

### New Uploads (after migration)
1. Create metadata record with `r2_key`
2. Generate presigned upload URL
3. Client uploads directly to R2
4. No backend file handling

### Existing Files (before migration)
1. `r2_key` = NULL (legacy indicator)
2. Download logic checks `r2_key`:
   - If present → R2 presigned URL
   - If null → legacy storage URL
3. No data migration required

### Soft Delete Strategy
- `deleted_at = NULL`: Active file
- `deleted_at != NULL`: Deleted (cleanup completed)
- Physical deletion from R2 happens immediately
- Metadata row kept for audit trail

---

## Validation Rules

**Business Rules** (enforced at application layer):

1. **File size limit**: 1GB (1073741824 bytes)
   - Validated in API before presigned URL generation
   - R2 bucket policy should also enforce (defense in depth)

2. **MIME types allowed**:
   - `application/pdf`
   - `application/vnd.ms-powerpoint` (PPT)
   - `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
   - `image/jpeg`, `image/png` (for embedded images)

3. **Retention period**: 48 hours from `uploaded_at`
   - Enforced by scheduled cleanup function
   - Runs every 6 hours (8 runs per 48h period)

4. **R2 key uniqueness**: Guaranteed by slide ID in key
   - Format: `tenant-{id}/event-{id}/slide-{uuid}.ext`
   - UUID prevents collisions

---

## Database Constraints

```sql
-- Add constraints for data integrity
ALTER TABLE slides
ADD CONSTRAINT chk_file_size_limit
CHECK (file_size > 0 AND file_size <= 1073741824);

ALTER TABLE slides
ADD CONSTRAINT chk_mime_type_valid
CHECK (mime_type IN (
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png'
));

-- Ensure r2_key format (if present)
ALTER TABLE slides
ADD CONSTRAINT chk_r2_key_format
CHECK (r2_key IS NULL OR r2_key ~ '^tenant-[a-f0-9-]+/event-[a-f0-9-]+/slide-[a-f0-9-]+\.[a-z0-9]+$');
```

---

## Testing Considerations

### Contract Tests (data-level)
- Create slide with `r2_key` → verify saved correctly
- Retrieve slide by ID → verify `r2_key` returned
- Query slides by `uploaded_at` → verify index used (EXPLAIN ANALYZE)

### Integration Tests
- Upload flow: metadata created with `r2_key` before upload
- Download flow: `r2_key` used to generate presigned URL
- Cleanup flow: `deleted_at` set after 48 hours

---

## Migration Files Required

1. `supabase/migrations/YYYYMMDD_add_r2_storage.sql`
   - Add `r2_key` column
   - Add `deleted_at` column
   - Add indexes
   - Add constraints

---

**Next Steps**: Create contracts/ directory with API specifications
