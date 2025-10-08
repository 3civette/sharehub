# Data Model: Event Details Management

**Feature**: 005-ora-bisogna-implementare
**Created**: 2025-10-08
**Status**: Phase 1 - Design

## Overview

This document defines the data entities for the Event Details Management feature, which enhances events with rich content including photos, sessions, speeches, slides, and enhanced access tokens with QR code generation.

## Entity Definitions

### 1. EventPhoto

**Purpose**: Store event images including one primary cover image and optional gallery images.

**Table Name**: `event_photos`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `event_id` | UUID | NOT NULL, REFERENCES events(id) ON DELETE CASCADE | Parent event |
| `tenant_id` | UUID | NOT NULL, REFERENCES tenants(id) ON DELETE CASCADE | Tenant isolation |
| `storage_path` | TEXT | NOT NULL, UNIQUE | Path in Supabase Storage (e.g., `event-photos/{tenantId}/{eventId}/{timestamp}-{filename}`) |
| `filename` | TEXT | NOT NULL, CHECK (length(filename) <= 255) | Original filename for display |
| `file_size` | INTEGER | NOT NULL, CHECK (file_size > 0 AND file_size <= 52428800) | Size in bytes (max 50MB = 52428800 bytes) |
| `mime_type` | TEXT | NOT NULL, CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')) | Image format |
| `is_cover` | BOOLEAN | NOT NULL, DEFAULT false | True if this is the primary cover image |
| `display_order` | INTEGER | NOT NULL, DEFAULT 0, CHECK (display_order >= 0) | Order in gallery |
| `uploaded_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Upload timestamp |
| `uploaded_by` | UUID | REFERENCES admins(id) | Admin who uploaded the photo |

**Indexes**:
- `idx_event_photos_event_id` ON `event_id` (for event queries)
- `idx_event_photos_tenant_id` ON `tenant_id` (for tenant isolation)
- `idx_event_photos_is_cover` ON `event_id, is_cover` (for quick cover image lookup)

**Constraints**:
- `unique_display_order_per_event` UNIQUE (event_id, display_order)
- `one_cover_per_event` UNIQUE (event_id) WHERE is_cover = true

**Relationships**:
- Belongs to: Event (many-to-one)
- Belongs to: Tenant (many-to-one)

**Validation Rules**:
- Maximum file size: 50 MB (52,428,800 bytes)
- Allowed formats: JPG, PNG, WebP
- Each event must have exactly one cover image (is_cover = true)
- Display order must be unique per event

**State Transitions**: N/A (no complex state machine)

---

### 2. Session (ENHANCED)

**Purpose**: Time-based grouping of speeches within an event with smart chronological ordering.

**Table Name**: `sessions` (already exists, requires schema update)

**Existing Fields** (from Feature 003):
- `id`, `event_id`, `tenant_id`, `title`, `description`, `display_order`, `created_at`, `updated_at`

**New/Modified Fields for Feature 005**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `scheduled_time` | TIMESTAMPTZ | NULL (changed from start_time) | Scheduled start time for chronological ordering |
| `display_order` | INTEGER | NULL (changed from NOT NULL) | Manual override for order; NULL = use scheduled_time |

**Updated Validation Rules**:
- If `display_order` is NULL, sessions are ordered by `scheduled_time` ASC
- If `display_order` is set, it overrides chronological order
- When admin manually reorders sessions, UI prompts to update `scheduled_time`
- When `scheduled_time` changes, `display_order` is reset to NULL (auto-reorder)

**Query Pattern**:
```sql
SELECT * FROM sessions
WHERE event_id = $1
ORDER BY COALESCE(display_order, EXTRACT(EPOCH FROM scheduled_time)::INTEGER);
```

**Business Rules**:
- Cannot delete session if it contains speeches (show error: "Remove or move all speeches first")
- Sessions without speeches can be deleted freely
- When displaying sessions, always include count of speeches for admin awareness

---

### 3. Speech (ENHANCED)

**Purpose**: Individual presentation within a session with speaker details and associated slides.

**Table Name**: `speeches` (already exists, requires schema update)

**Existing Fields** (from Feature 003):
- `id`, `session_id`, `tenant_id`, `title`, `speaker_name`, `duration`, `description`, `display_order`, `created_at`, `updated_at`

**New/Modified Fields for Feature 005**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `scheduled_time` | TIMESTAMPTZ | NULL | Scheduled start time (same smart ordering as sessions) |
| `display_order` | INTEGER | NULL (changed from NOT NULL) | Manual override for order; NULL = use scheduled_time |

**Updated Validation Rules**:
- Same smart ordering logic as sessions
- If `display_order` is NULL, speeches are ordered by `scheduled_time` ASC within their session
- When deleting speech, return count of associated slides for confirmation dialog
- Each speech belongs to exactly one session (enforced by foreign key)

**Relationships**:
- Belongs to: Session (many-to-one, cannot be null)
- Has many: Slides (one-to-many, cascade delete)

**Cascade Delete Behavior**:
1. Admin clicks "Delete Speech"
2. Backend counts slides: `SELECT COUNT(*) FROM slides WHERE speech_id = $1`
3. If count > 0, return: `{ slideCount: N, requiresConfirmation: true }`
4. Frontend shows: "This will delete {N} slide(s). Are you sure?"
5. If confirmed, backend deletes slides first, then speech
6. Activity log records both deletions

---

### 4. Slide (ENHANCED)

**Purpose**: Downloadable files associated with speeches with enhanced metadata display.

**Table Name**: `slides` (already exists, requires minor updates)

**Existing Fields** (from Feature 003):
- `id`, `speech_id`, `tenant_id`, `filename`, `storage_path`, `file_size`, `mime_type`, `display_order`, `uploaded_by`, `uploaded_at`

**Enhanced Metadata Display** (computed fields, not stored):
- `speaker_name`: Retrieved via JOIN with speeches table
- `speech_title`: Retrieved via JOIN with speeches table
- Used in UI for context: "presentation.pdf (2.3 MB) - Speaker: John Doe - Speech: Introduction to AI"

**Query Pattern for Enhanced Display**:
```sql
SELECT
  slides.*,
  speeches.title AS speech_title,
  speeches.speaker_name AS speaker_name
FROM slides
JOIN speeches ON slides.speech_id = speeches.id
WHERE slides.speech_id = $1
ORDER BY slides.display_order;
```

**Validation Rules** (from spec):
- Maximum file size: 50 MB (existing constraint allows 100MB, will be kept for flexibility)
- Allowed formats: Configurable per event (see Event entity enhancement)
- No hard limit on number of slides per speech

---

### 5. AccessToken (ENHANCED)

**Purpose**: Token-based authentication for private events with QR code generation and copy-to-clipboard support.

**Table Name**: `access_tokens` (already exists, requires new fields)

**Existing Fields** (from Feature 003):
- `id`, `event_id`, `token`, `type`, `expires_at`, `created_at`, `last_used_at`, `use_count`

**New Fields for Feature 005**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `qr_code_data_url` | TEXT | NULL | Base64-encoded PNG data URL of QR code (generated on demand) |
| `revoked_at` | TIMESTAMPTZ | NULL | Timestamp when token was revoked (NULL = active) |
| `revoked_by` | UUID | REFERENCES admins(id) | Admin who revoked the token |

**Enhanced Functionality**:
1. **QR Code Generation**:
   - Generated on-demand when admin requests it
   - Stored as data URL for immediate display
   - Can be regenerated if needed
   - Format: `data:image/png;base64,{base64EncodedPNG}`

2. **Copy to Clipboard**:
   - Frontend copies `token` value to clipboard
   - Shows success toast notification
   - Formats token as full URL for participant access: `https://{tenant}.sharehub.com/events/{slug}?token={token}`

3. **Revocation**:
   - Sets `revoked_at` timestamp
   - Token validation checks: `revoked_at IS NULL AND expires_at > NOW()`
   - Revoked tokens still appear in admin list for audit purposes

**Query Pattern for Token List**:
```sql
SELECT
  id,
  token,
  type,
  expires_at,
  created_at,
  last_used_at,
  use_count,
  revoked_at,
  (revoked_at IS NULL AND expires_at > NOW()) AS is_active
FROM access_tokens
WHERE event_id = $1
ORDER BY created_at DESC;
```

---

### 6. Event (ENHANCED)

**Purpose**: Core event entity enhanced with configurable slide format settings.

**Table Name**: `events` (already exists, requires new field)

**New Field for Feature 005**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `allowed_slide_formats` | JSONB | NOT NULL, DEFAULT '["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]' | Configurable allowed MIME types for slide uploads |

**Default Formats**:
- `application/pdf` (PDF)
- `application/vnd.ms-powerpoint` (PPT)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)

**Admin Configuration**:
- Event settings page allows checking/unchecking allowed formats
- Stored as JSON array of MIME types
- Validated at upload time via Multer fileFilter

**Example**:
```json
{
  "allowed_slide_formats": [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ]
}
```

---

## Entity Relationships Diagram

```
Event (1) ──< (many) EventPhoto
  │
  ├──< (many) Session
  │      │
  │      └──< (many) Speech
  │              │
  │              └──< (many) Slide
  │
  └──< (many) AccessToken
```

**Hierarchy**:
- Event → EventPhoto (one-to-many)
- Event → Session (one-to-many)
- Session → Speech (one-to-many, cannot be orphaned)
- Speech → Slide (one-to-many, cascade delete)
- Event → AccessToken (one-to-many)

---

## Storage Buckets

### event-photos
- **Type**: Public bucket
- **Path Structure**: `{tenantId}/{eventId}/{timestamp}-{filename}`
- **RLS Policies**:
  - INSERT: Tenant admins only
  - DELETE: Tenant admins only
  - SELECT: Public (authenticated via URL)
- **Max File Size**: 50 MB
- **Allowed MIME Types**: image/jpeg, image/png, image/webp

### slides
- **Type**: Public bucket (already exists from Feature 003)
- **Path Structure**: `{tenantId}/{eventId}/{speechId}/{timestamp}-{filename}`
- **RLS Policies**:
  - INSERT: Organizer tokens + tenant admins
  - DELETE: Organizer tokens + tenant admins
  - SELECT: Public (authenticated via token for private events)
- **Max File Size**: 50 MB (configurable up to 100MB for enterprise)
- **Allowed MIME Types**: Configurable per event via `events.allowed_slide_formats`

---

## Migration Notes

### Schema Changes Required

1. **Create `event_photos` table** (new)
2. **Alter `sessions` table**:
   - Rename `start_time` to `scheduled_time`
   - Change `display_order` to allow NULL
3. **Alter `speeches` table**:
   - Add `scheduled_time` column
   - Change `display_order` to allow NULL
4. **Alter `access_tokens` table**:
   - Add `qr_code_data_url` column
   - Add `revoked_at` column
   - Add `revoked_by` column
5. **Alter `events` table**:
   - Add `allowed_slide_formats` column with default value

### Data Migration

- Existing sessions: Set `display_order` based on current order, `scheduled_time` = NULL
- Existing speeches: Set `display_order` based on current order, `scheduled_time` = NULL
- Existing events: Set default `allowed_slide_formats` to `["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]`

---

## Validation Summary

| Entity | Max File Size | Allowed Formats | Hard Limits |
|--------|---------------|-----------------|-------------|
| EventPhoto | 50 MB | JPG, PNG, WebP | 1 cover + unlimited gallery |
| Slide | 50 MB (default) | Configurable per event | No hard limit per speech |
| AccessToken | N/A | N/A | Token length = 21 chars |

---

## Business Rules Summary

1. **EventPhoto**:
   - First uploaded photo becomes cover by default
   - Only one cover photo per event (enforced by unique constraint)
   - Gallery photos ordered by `display_order`

2. **Session**:
   - Cannot delete if contains speeches (show error)
   - Smart ordering: chronological by default, manual override available
   - When manual order changes, prompt to update scheduled_time

3. **Speech**:
   - Deletion requires confirmation if slides exist
   - Cascade deletes all slides upon confirmation
   - Same smart ordering as sessions

4. **AccessToken**:
   - Revoked tokens remain in database for audit
   - Validation checks both expiry and revocation
   - QR code generated on-demand, cached in database

---

**Status**: Ready for Phase 2 (API Contract Design)
