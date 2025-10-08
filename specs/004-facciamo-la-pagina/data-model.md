# Data Model: Pagina Pubblica Evento

**Feature**: 004-facciamo-la-pagina
**Date**: 2025-10-07

## Overview

Feature 004 primarily **reads** from existing Feature 003 database schema. No new tables required. This document describes the data access patterns and any modifications needed.

---

## Existing Entities (Feature 003 Schema)

### events
**Purpose**: Core event information for public display

**Fields Used**:
- `id` (uuid, PK)
- `tenant_id` (uuid, FK → tenants)
- `slug` (text, UNIQUE) - Used in `/events/{slug}` URL
- `name` (text) - Event title
- `date` (date) - Event date
- `description` (text, nullable) - Event description
- `visibility` ('public' | 'private') - Access control
- `status` ('upcoming' | 'past' | 'archived') - Display badge
- `created_at`, `updated_at` (timestamp)

**Access Pattern**:
```sql
-- Public read (no auth required for visibility='public')
SELECT * FROM events WHERE slug = $1 AND (visibility = 'public' OR <token_check>);
```

---

### sessions
**Purpose**: Groups of speeches within an event

**Fields Used**:
- `id` (uuid, PK)
- `event_id` (uuid, FK → events)
- `title` (text) - Session name
- `description` (text, nullable)
- `scheduled_time` (timestamptz, nullable) - Session time
- `display_order` (integer) - Sort order (ASC)

**Access Pattern**:
```sql
-- Fetch all sessions for an event, ordered
SELECT * FROM sessions WHERE event_id = $1 ORDER BY display_order ASC;
```

---

### speeches
**Purpose**: Individual presentations within a session

**Fields Used**:
- `id` (uuid, PK)
- `session_id` (uuid, FK → sessions)
- `title` (text) - Speech title
- `speaker_name` (text) - Presenter name
- `duration_minutes` (integer, nullable) - Length
- `description` (text, nullable) - Speech description
- `display_order` (integer) - Sort order within session (ASC)

**Access Pattern**:
```sql
-- Fetch all speeches for a session, ordered
SELECT * FROM speeches WHERE session_id = $1 ORDER BY display_order ASC;
```

---

### slides
**Purpose**: Downloadable files attached to speeches

**Fields Used**:
- `id` (uuid, PK)
- `speech_id` (uuid, FK → speeches)
- `filename` (text) - Original filename
- `storage_path` (text) - Supabase Storage path
- `file_size` (bigint) - Size in bytes
- `mime_type` (text) - File type (PDF, PPT, etc.)
- `display_order` (integer) - Sort order within speech (ASC)
- `uploaded_at` (timestamp)

**Access Pattern**:
```sql
-- Fetch all slides for a speech, ordered
SELECT * FROM slides WHERE speech_id = $1 ORDER BY display_order ASC;

-- Download URL generation (backend)
const { data } = await supabase.storage
  .from('slides')
  .createSignedUrl(slide.storage_path, 60); // 60s expiry
```

---

### access_tokens
**Purpose**: Credentials for private event access

**Fields Used**:
- `id` (uuid, PK)
- `event_id` (uuid, FK → events)
- `token` (text, UNIQUE) - 21-character nanoid
- `token_type` ('admin' | 'organizer' | 'participant')
- `expires_at` (timestamptz) - Expiration time
- `last_used_at` (timestamptz, nullable) - Last validation
- `use_count` (integer, default 0) - Usage tracking

**Access Pattern**:
```sql
-- Validate token for private event
SELECT * FROM access_tokens
WHERE token = $1 AND event_id = $2 AND expires_at > NOW();

-- Update usage tracking (after validation)
UPDATE access_tokens
SET last_used_at = NOW(), use_count = use_count + 1
WHERE id = $1;
```

---

### event_metrics
**Purpose**: Public and premium analytics

**Fields Used**:
- `event_id` (uuid, PK, FK → events)
- `page_views` (bigint, default 0) - **PUBLIC**: Total page loads
- `total_slide_downloads` (bigint, default 0) - **PUBLIC**: Total downloads
- `premium` (jsonb) - **PRIVATE**: { unique_visitors: [], per_slide_downloads: {} }

**Access Pattern**:
```sql
-- Increment page view (on page load)
UPDATE event_metrics
SET page_views = page_views + 1
WHERE event_id = $1;

-- Increment download count (on slide download)
UPDATE event_metrics
SET total_slide_downloads = total_slide_downloads + 1
WHERE event_id = $1;

-- Fetch public metrics only
SELECT page_views, total_slide_downloads
FROM event_metrics WHERE event_id = $1;
```

**Privacy Rule**: `premium` JSONB field NEVER exposed via public API.

---

### activity_logs
**Purpose**: Download tracking and audit trail

**Fields Used**:
- `id` (uuid, PK)
- `tenant_id` (uuid, FK → tenants)
- `event_id` (uuid, FK → events)
- `actor_type` ('anonymous' | 'participant' | 'organizer')
- `action_type` ('download' | 'batch_download')
- `metadata` (jsonb) - { filename, file_size, slide_id, zip_type }
- `timestamp` (timestamptz)
- `retention_days` (integer) - Configurable per event

**Access Pattern**:
```sql
-- Log individual slide download
INSERT INTO activity_logs (tenant_id, event_id, actor_type, action_type, metadata, timestamp, retention_days)
VALUES ($1, $2, 'anonymous', 'download', '{"slide_id": "...", "filename": "..."}', NOW(), 90);

-- Log batch ZIP download
INSERT INTO activity_logs (tenant_id, event_id, actor_type, action_type, metadata, timestamp, retention_days)
VALUES ($1, $2, 'anonymous', 'batch_download', '{"zip_type": "session", "session_id": "..."}', NOW(), 90);
```

---

## Data Access Modifications

### New RLS Policies (Public Read)

Feature 004 requires **read-only** public access to events, sessions, speeches, and slides.

```sql
-- 004-public-read-policies.sql

-- Allow public read for public events
CREATE POLICY "public_events_read"
ON events FOR SELECT
USING (visibility = 'public');

-- Allow public read for sessions of public events
CREATE POLICY "public_sessions_read"
ON sessions FOR SELECT
USING (event_id IN (SELECT id FROM events WHERE visibility = 'public'));

-- Allow public read for speeches in public events
CREATE POLICY "public_speeches_read"
ON speeches FOR SELECT
USING (session_id IN (
  SELECT id FROM sessions WHERE event_id IN (
    SELECT id FROM events WHERE visibility = 'public'
  )
));

-- Allow public read for slides in public events
CREATE POLICY "public_slides_read"
ON slides FOR SELECT
USING (speech_id IN (
  SELECT id FROM speeches WHERE session_id IN (
    SELECT id FROM sessions WHERE event_id IN (
      SELECT id FROM events WHERE visibility = 'public'
    )
  )
));

-- Private event access with valid token (requires middleware setting app.current_token_id)
CREATE POLICY "private_events_read_with_token"
ON events FOR SELECT
USING (
  visibility = 'private' AND id IN (
    SELECT event_id FROM access_tokens
    WHERE id = app.current_token_id() AND expires_at > NOW()
  )
);
```

**Note**: `app.current_token_id()` is a PostgreSQL function that reads a session variable set by backend middleware after token validation.

---

## API Response Models

### PublicEventResponse
```typescript
interface PublicEventResponse {
  event: {
    id: string;
    slug: string;
    name: string;
    date: string; // ISO date
    description: string | null;
    status: 'upcoming' | 'past' | 'archived';
    visibility: 'public' | 'private';
  };
  sessions: {
    id: string;
    title: string;
    description: string | null;
    scheduled_time: string | null; // ISO timestamp
    speeches: {
      id: string;
      title: string;
      speaker_name: string;
      duration_minutes: number | null;
      description: string | null;
      slides: {
        id: string;
        filename: string;
        file_size: number;
        mime_type: string;
        download_url: string; // Signed URL
      }[];
    }[];
  }[];
  metrics: {
    page_views: number;
    total_slide_downloads: number;
  };
}
```

### TokenValidationRequest
```typescript
interface TokenValidationRequest {
  token: string; // 21 characters
  event_slug: string;
}
```

### TokenValidationResponse
```typescript
interface TokenValidationResponse {
  valid: boolean;
  token_type: 'participant' | 'organizer' | 'admin' | null;
  expires_at: string | null; // ISO timestamp
  message?: string; // Error message if invalid
}
```

### ZipDownloadRequest
```typescript
interface ZipDownloadRequest {
  type: 'speech' | 'session';
  id: string; // speech_id or session_id
}
```

---

## State Transitions

### Token Lifecycle
```
Created (expires_at in future)
  ↓ [user enters token]
Validated (last_used_at = NOW, use_count++)
  ↓ [stored in sessionStorage]
Auto-Revalidated (on page load)
  ↓ [expires_at < NOW]
Expired (validation fails)
```

### Download Flow
```
User clicks "Download"
  ↓ [rate limit check: < 50 in last hour?]
Rate Limit OK
  ↓ [generate signed URL / ZIP stream]
Download Initiated
  ↓ [log to activity_logs]
Metrics Updated (total_slide_downloads++)
```

---

## Performance Considerations

### Indexes (Already exist from Feature 003)
- `events.slug` (UNIQUE) - Fast `/events/{slug}` lookup
- `sessions.event_id, sessions.display_order` - Fast session ordering
- `speeches.session_id, speeches.display_order` - Fast speech ordering
- `slides.speech_id, slides.display_order` - Fast slide ordering
- `access_tokens.token` (UNIQUE) - Fast token validation
- `access_tokens.event_id, access_tokens.expires_at` - Fast private event checks

### Query Optimization
- **Parallel fetching**: Backend fetches event + sessions + speeches in parallel using Promise.all
- **Lazy loading**: Slides only fetched when speech expanded (reduces initial payload)
- **Pagination**: Limit 50 speeches per page for events with >50 speeches

---

## Validation Rules

### Slide Downloads
- **Rate Limit**: Max 50 downloads per hour per IP (tracked in-memory)
- **File Size**: Already validated on upload (Feature 003), no runtime check needed
- **MIME Type**: Restrict to ALLOWED_MIME_TYPES ('application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.presentation', 'application/vnd.apple.keynote')

### Token Validation
- **Format**: Must be exactly 21 characters (nanoid)
- **Expiration**: `expires_at` must be > NOW()
- **Event Match**: `event_id` must match requested event
- **Response**: Return 403 Forbidden if any check fails

---

## Summary

- **No new tables**: Feature 004 reads from existing Feature 003 schema
- **New RLS policies**: Add public read policies for `visibility='public'` events
- **New indexes**: None required (all existing indexes sufficient)
- **Modifications**: Add `app.current_token_id()` PostgreSQL function for middleware integration
