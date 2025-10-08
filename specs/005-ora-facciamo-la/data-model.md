# Data Model: Event Management Dashboard

**Feature**: Event Management Dashboard
**Date**: 2025-10-08

## Overview
This dashboard aggregates existing data from Feature 005 (Event Flow Management) without introducing new database tables. All entities already exist with proper RLS policies and tenant isolation.

## Existing Entities (from Feature 005)

### Event
**Table**: `events`
**Purpose**: Core event information

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique event identifier |
| tenant_id | UUID | FK → tenants, NOT NULL | Tenant ownership (RLS filter) |
| name | TEXT | NOT NULL | Event display name |
| date | DATE | NOT NULL | Event occurrence date |
| slug | TEXT | UNIQUE, NOT NULL | URL-safe identifier |
| description | TEXT | NULL | Optional event description |
| visibility | ENUM | 'public' \| 'private' | Access control |
| status | ENUM | 'draft' \| 'upcoming' \| 'ongoing' \| 'past' | Current state |
| created_by | UUID | FK → admins | Creator admin |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- Has many: `access_tokens`, `sessions`, `event_photos`

---

### AccessToken
**Table**: `access_tokens`
**Purpose**: Private event access tokens (organizer/participant)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique token identifier |
| event_id | UUID | FK → events, NOT NULL | Associated event |
| token | TEXT | UNIQUE, NOT NULL, LENGTH=21 | Access token string (nanoid) |
| type | ENUM | 'organizer' \| 'participant' | Permission level |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiration timestamp |
| use_count | INTEGER | DEFAULT 0 | Number of times used |
| last_used_at | TIMESTAMPTZ | NULL | Last usage timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Relationships**:
- Belongs to: `events` (event_id)

**Dashboard Display**:
- For private events only (visibility='private')
- Read-only display with copy/download actions
- No regeneration or expiration editing

---

### Session
**Table**: `sessions`
**Purpose**: Time blocks within an event

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique session identifier |
| event_id | UUID | FK → events, NOT NULL | Parent event |
| title | TEXT | NOT NULL | Session name |
| start_time | TIMESTAMPTZ | NOT NULL | Session start |
| end_time | TIMESTAMPTZ | NOT NULL | Session end |
| room | TEXT | NULL | Location/room identifier |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- Belongs to: `events` (event_id)
- Has many: `speeches`

**Dashboard Actions**: Add, Edit, Delete (inline)

---

### Speech
**Table**: `speeches`
**Purpose**: Presentations within sessions

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique speech identifier |
| session_id | UUID | FK → sessions, NOT NULL | Parent session |
| title | TEXT | NOT NULL | Speech title |
| speaker | TEXT | NOT NULL | Speaker name |
| description | TEXT | NULL | Optional description |
| slide_count | INTEGER | DEFAULT 0 | Number of attached slides |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- Belongs to: `sessions` (session_id)
- Has many: `slides`

**Dashboard Actions**: Add, Edit, Delete (inline, organized by session)

---

### EventPhoto
**Table**: `event_photos`
**Purpose**: Gallery photos for events

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique photo identifier |
| event_id | UUID | FK → events, NOT NULL | Parent event |
| storage_path | TEXT | NOT NULL | Supabase storage path |
| caption | TEXT | NULL | Optional photo caption |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

**Relationships**:
- Belongs to: `events` (event_id)

**Dashboard Actions**: Upload, Delete (inline gallery view)

---

### Slide (Reference Only)
**Table**: `slides`
**Purpose**: Presentation files (not directly managed on dashboard)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique slide identifier |
| speech_id | UUID | FK → speeches, NOT NULL | Parent speech |
| filename | TEXT | NOT NULL | Original filename |
| storage_path | TEXT | NOT NULL | Supabase storage path |
| file_size | INTEGER | NOT NULL | File size in bytes |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

**Dashboard Display**: Slide count shown in speech metadata (no direct management)

---

## New Aggregated Types (TypeScript)

### DashboardData
**Purpose**: Consolidated dashboard response
**Source**: Backend aggregation service

```typescript
interface DashboardData {
  event: Event;
  tokens: AccessToken[];       // Empty array for public events
  sessions: Session[];
  speeches: Speech[];           // Includes session relationship
  photos: EventPhoto[];
  metrics: MetricsSummary;
}
```

---

### MetricsSummary
**Purpose**: Cached analytics data
**Source**: Metrics service (aggregated from logs)

```typescript
interface MetricsSummary {
  pageViews: number;            // Total event page views
  slideDownloads: number;       // Total slide downloads across all speeches
  participantCount: number;     // Sum of token use_count
  lastRefreshed: string;        // ISO timestamp of cache update
}
```

**Calculation Logic**:
```sql
-- Page views (from event_views log table)
SELECT COUNT(*) FROM event_views WHERE event_id = ?;

-- Slide downloads (from slide_downloads log table)
SELECT COUNT(*) FROM slide_downloads
WHERE speech_id IN (
  SELECT s.id FROM speeches s
  JOIN sessions sess ON s.session_id = sess.id
  WHERE sess.event_id = ?
);

-- Participant count (from token usage)
SELECT COALESCE(SUM(use_count), 0) FROM access_tokens
WHERE event_id = ? AND type = 'participant';
```

**Caching Strategy**:
- **TTL**: 5 minutes (300 seconds)
- **Storage**: In-memory (node-cache)
- **Invalidation**: Time-based expiry

---

## RLS Policies (Existing from Feature 005)

All queries automatically enforce tenant isolation via RLS:

```sql
-- Events: Admin can only see their tenant's events
CREATE POLICY "admin_tenant_events" ON events
FOR SELECT USING (tenant_id IN (
  SELECT tenant_id FROM admins WHERE id = auth.uid()
));

-- Access Tokens: Scoped to tenant's events
CREATE POLICY "admin_tenant_tokens" ON access_tokens
FOR SELECT USING (event_id IN (
  SELECT id FROM events WHERE tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
));

-- Sessions: Scoped to tenant's events
CREATE POLICY "admin_tenant_sessions" ON sessions
FOR ALL USING (event_id IN (
  SELECT id FROM events WHERE tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
));

-- (Similar policies for speeches, event_photos, slides)
```

**Security Guarantee**: Dashboard service queries automatically filtered by tenant_id. No additional security layer needed.

---

## State Transitions

### Event Status Lifecycle
```
draft → upcoming → ongoing → past
```

**Dashboard Implications**:
- **draft**: Full edit access
- **upcoming**: Full edit access
- **ongoing**: Limited edits (no date/time changes)
- **past**: Read-only (per Feature 002 patterns)

---

## Validation Rules

### From Functional Requirements:
- **FR-008**: Dashboard access requires authenticated admin + tenant ownership
- **FR-016**: Empty states handled gracefully (no sessions/speeches/photos)
- **FR-004**: QR download only for participant tokens (not organizer)
- **FR-006**: Tokens section hidden for public events (visibility='public')

### Business Rules:
- Token expiration checked but not modifiable from dashboard
- Session times must not overlap within same event (existing validation)
- Photos limited to 5MB each (existing validation)
- Slide count automatically calculated from speeches.slides relationship

---

## Performance Considerations

### Indexed Fields (Existing):
- `events.tenant_id` (B-tree index)
- `events.slug` (unique index)
- `access_tokens.event_id` (B-tree index)
- `sessions.event_id` (B-tree index)
- `speeches.session_id` (B-tree index)
- `event_photos.event_id` (B-tree index)

### Query Optimization:
- **Parallel fetching**: 6 queries execute concurrently (Promise.all)
- **Selective fields**: Only fetch needed columns (no SELECT *)
- **Pagination**: Photos/sessions/speeches support limit/offset (if needed)

### Expected Query Times:
- Event fetch: ~20ms
- Tokens fetch: ~30ms
- Sessions fetch: ~40ms (with speech counts)
- Speeches fetch: ~50ms (with session join)
- Photos fetch: ~40ms
- Metrics fetch: ~10ms (cached) or ~100ms (cache miss)

**Total**: 1.2-1.5s estimated (within < 2s requirement)

---

## Summary

✅ **No new tables required** - All data structures exist from Feature 005
✅ **RLS policies in place** - Tenant isolation automatic
✅ **Indexed for performance** - All foreign keys and lookups indexed
✅ **Validation defined** - Business rules clear and testable

**Ready for Contract Definition** (Phase 1, Step 2)
