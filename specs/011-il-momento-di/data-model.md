# Data Model: Public Event Page Redesign

**Feature**: 011-il-momento-di
**Date**: 2025-10-14

## Overview

This feature uses **existing database schema** - no migrations required. All tables have multi-tenant RLS policies already configured.

## Entities

### Event
**Table**: `events`
**Purpose**: Conference/workshop container with public/private visibility

**Fields**:
```typescript
{
  id: UUID (PK)
  tenant_id: UUID (FK → tenants, indexed)
  name: string (not null)
  slug: string (unique, indexed)
  description: string (nullable)
  event_date: date (not null, indexed)
  visibility: 'public' | 'private' (default: 'public')
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp (soft delete)
}
```

**Relationships**:
- Has many: Sessions, Photos, Banners
- Belongs to: Tenant

**RLS Policies** (existing):
- Public events: Readable by anyone where `visibility = 'public'` and `deleted_at IS NULL`
- Private events: Readable with valid token via `access_tokens` join

**Validation**:
- `slug` must be URL-safe (lowercase, hyphens, alphanumeric)
- `event_date` must be valid date
- `visibility` must be 'public' or 'private'

---

### Session
**Table**: `sessions`
**Purpose**: Time-bound segments within an event

**Fields**:
```typescript
{
  id: UUID (PK)
  event_id: UUID (FK → events, indexed)
  name: string (not null)
  time: timestamp (nullable)
  description: string (nullable)
  created_at: timestamp
  deleted_at: timestamp
}
```

**Relationships**:
- Belongs to: Event
- Has many: Speeches

**RLS Policies** (existing):
- Inherit event visibility (join events table, check RLS)

**Validation**:
- `name` required
- `time` nullable (some events don't have strict schedules)

---

### Speech
**Table**: `speeches`
**Purpose**: Individual presentations within a session

**Fields**:
```typescript
{
  id: UUID (PK)
  session_id: UUID (FK → sessions, indexed)
  speaker: string (nullable)
  title: string (not null)
  description: string (nullable)
  created_at: timestamp
  deleted_at: timestamp
}
```

**Relationships**:
- Belongs to: Session
- Has many: Slides

**RLS Policies** (existing):
- Inherit session visibility (join sessions → events, check RLS)

**Validation**:
- `title` required
- `speaker` optional (some speeches don't attribute speakers)

---

### Slide
**Table**: `slides`
**Purpose**: Presentation files attached to speeches

**Fields**:
```typescript
{
  id: UUID (PK)
  speech_id: UUID (FK → speeches, indexed)
  filename: string (not null)
  storage_path: string (not null) // R2 object key
  file_type: string (not null) // 'pdf', 'ppt', 'pptx'
  file_size: bigint (not null) // bytes
  uploaded_at: timestamp (default: now())
  downloaded_at: timestamp (nullable) // last download time
  download_count: integer (default: 0)
  deleted_at: timestamp
}
```

**Relationships**:
- Belongs to: Speech

**RLS Policies** (existing):
- Inherit speech visibility (join speeches → sessions → events)

**Validation**:
- `file_type` must be 'pdf', 'ppt', or 'pptx'
- `file_size` must be > 0
- `storage_path` must be valid R2 key

---

### AccessToken
**Table**: `access_tokens`
**Purpose**: Private event access control

**Fields**:
```typescript
{
  id: UUID (PK)
  event_id: UUID (FK → events, indexed)
  token: string (unique, indexed, 21 chars)
  token_type: 'single_use' | 'multi_use'
  expires_at: timestamp (nullable)
  last_used_at: timestamp (nullable)
  use_count: integer (default: 0)
  created_at: timestamp
}
```

**Relationships**:
- Belongs to: Event

**RLS Policies** (existing):
- Tokens readable only when valid (not expired, not deleted)

**Validation**:
- `token` must be exactly 21 characters
- `token_type` must be 'single_use' or 'multi_use'
- `expires_at` nullable (permanent tokens allowed)

---

### EventPhoto
**Table**: `event_photos`
**Purpose**: Event gallery images

**Fields**:
```typescript
{
  id: UUID (PK)
  event_id: UUID (FK → events, indexed)
  storage_path: string (not null) // Supabase Storage path
  caption: string (nullable)
  alt_text: string (not null)
  uploaded_at: timestamp
  deleted_at: timestamp
}
```

**Relationships**:
- Belongs to: Event

**RLS Policies** (existing):
- Inherit event visibility

---

### Banner
**Table**: `banners`
**Purpose**: Advertisement placements (Feature 010)

**Fields**:
```typescript
{
  id: UUID (PK)
  tenant_id: UUID (FK → tenants)
  event_id: UUID (FK → events, indexed)
  slot_number: integer (1-5)
  filename: string (not null)
  storage_path: string (not null)
  click_url: string (nullable)
  active: boolean (default: true)
  created_at: timestamp
  deleted_at: timestamp
}
```

**Relationships**:
- Belongs to: Event

**RLS Policies** (existing):
- Inherit event visibility, only show active banners

---

### Metrics (Virtual)
**Note**: Not a database table, computed on-demand

**Computed Fields**:
```typescript
{
  event_id: UUID
  page_views: integer // count from access logs (future)
  total_downloads: integer // sum of slide.download_count
  unique_participants: integer // count of unique tokens used (if private)
}
```

**Computation**:
```sql
-- Total downloads for an event
SELECT
  e.id as event_id,
  COALESCE(SUM(sl.download_count), 0) as total_downloads
FROM events e
LEFT JOIN sessions sess ON sess.event_id = e.id
LEFT JOIN speeches sp ON sp.session_id = sess.id
LEFT JOIN slides sl ON sl.speech_id = sp.id
WHERE e.id = $1
  AND sess.deleted_at IS NULL
  AND sp.deleted_at IS NULL
  AND sl.deleted_at IS NULL
GROUP BY e.id;
```

---

## API Response Structures

### PublicEventResponse
**Endpoint**: `GET /api/public/events/[slug]`

```typescript
interface PublicEventResponse {
  event: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    event_date: string; // ISO 8601
    visibility: 'public' | 'private';
    tenant_branding?: {
      logo_url: string | null;
      primary_color: string;
      secondary_color: string;
    };
  };
  sessions: Array<{
    id: string;
    name: string;
    time: string | null; // ISO 8601
    description: string | null;
    speeches: Array<{
      id: string;
      speaker: string | null;
      title: string;
      description: string | null;
      slides: Array<{
        id: string;
        filename: string;
        file_type: 'pdf' | 'ppt' | 'pptx';
        file_size: number; // bytes
        download_url: string; // Presigned R2 URL (1h expiry)
      }>;
    }>;
  }>;
  photos: Array<{
    id: string;
    image_url: string; // Signed Supabase Storage URL
    caption: string | null;
    alt_text: string;
  }>;
  metrics: {
    total_downloads: number;
    page_views: number;
  };
}
```

### TokenValidationRequest
**Endpoint**: `POST /api/public/events/[slug]/validate-token`

```typescript
interface TokenValidationRequest {
  token: string; // 21 characters
}

interface TokenValidationResponse {
  valid: boolean;
  token_id?: string; // UUID if valid
  message?: string; // Error message if invalid
}
```

---

## Database Queries

### Query 1: Fetch Public Event with Full Data
```sql
-- Used in: GET /api/public/events/[slug]/route.ts
SELECT
  e.*,
  json_agg(
    json_build_object(
      'id', sess.id,
      'name', sess.name,
      'time', sess.time,
      'description', sess.description,
      'speeches', (
        SELECT json_agg(
          json_build_object(
            'id', sp.id,
            'speaker', sp.speaker,
            'title', sp.title,
            'description', sp.description,
            'slides', (
              SELECT json_agg(
                json_build_object(
                  'id', sl.id,
                  'filename', sl.filename,
                  'file_type', sl.file_type,
                  'file_size', sl.file_size,
                  'storage_path', sl.storage_path
                )
              )
              FROM slides sl
              WHERE sl.speech_id = sp.id
                AND sl.deleted_at IS NULL
            )
          )
        )
        FROM speeches sp
        WHERE sp.session_id = sess.id
          AND sp.deleted_at IS NULL
      )
    )
  ) as sessions
FROM events e
LEFT JOIN sessions sess ON sess.event_id = e.id AND sess.deleted_at IS NULL
WHERE e.slug = $1
  AND e.deleted_at IS NULL
  AND (
    e.visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM access_tokens at
      WHERE at.event_id = e.id
        AND at.id = $2 -- token_id from request
        AND (at.expires_at IS NULL OR at.expires_at > NOW())
    )
  )
GROUP BY e.id;
```

### Query 2: Validate Access Token
```sql
-- Used in: POST /api/public/events/[slug]/validate-token/route.ts
SELECT
  at.id,
  at.token_type,
  at.expires_at,
  at.use_count
FROM access_tokens at
JOIN events e ON e.id = at.event_id
WHERE e.slug = $1
  AND at.token = $2
  AND (at.expires_at IS NULL OR at.expires_at > NOW())
  AND (at.token_type = 'multi_use' OR at.use_count = 0);

-- If valid, update usage:
UPDATE access_tokens
SET
  last_used_at = NOW(),
  use_count = use_count + 1
WHERE id = $1;
```

### Query 3: Get Event Metrics
```sql
-- Used in: GET /api/public/events/[slug]/metrics/route.ts
SELECT
  e.id,
  COALESCE(SUM(sl.download_count), 0)::integer as total_downloads,
  0 as page_views -- Placeholder, implement analytics later
FROM events e
LEFT JOIN sessions sess ON sess.event_id = e.id
LEFT JOIN speeches sp ON sp.session_id = sess.id
LEFT JOIN slides sl ON sl.speech_id = sp.id
WHERE e.slug = $1
  AND e.deleted_at IS NULL
  AND sess.deleted_at IS NULL
  AND sp.deleted_at IS NULL
  AND sl.deleted_at IS NULL
GROUP BY e.id;
```

---

## State Transitions

### Slide Download State
```
[Uploaded] → [Available] → [Downloaded (increment count)] → [Downloaded Multiple Times]
                                                           ↓
                                                    [Archived after 48h]
```

### Token State
```
[Created] → [Unused] → [Used Once] → [Used Multiple] → [Expired]
                                   ↘ [Single Use Exhausted]
```

### Event Visibility State
```
[Draft] → [Public] ⇄ [Private] → [Archived (soft delete)]
```

---

## Indexes (Existing)

All required indexes already exist:
- `events.slug` (unique)
- `events.tenant_id` (for RLS)
- `events.event_date` (for listing)
- `sessions.event_id`
- `speeches.session_id`
- `slides.speech_id`
- `access_tokens.token` (unique)
- `access_tokens.event_id`

---

**Data Model Status**: ✅ Complete (no schema changes needed)
