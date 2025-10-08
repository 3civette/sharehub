# API Contract: Sessions (Enhanced)

**Feature**: 005-ora-bisogna-implementare
**Version**: 2.0.0 (Enhanced from Feature 003)
**Base Path**: `/api/events/:eventId/sessions`

## Overview

Enhanced session management endpoints with smart chronological ordering, scheduled times, and improved deletion safeguards.

## Changes from Feature 003

1. **Smart Ordering**: Added `scheduled_time` field with hybrid ordering logic
2. **Deletion Safeguards**: Enhanced delete endpoint to check for speeches
3. **Update Scheduled Time**: New endpoint to update scheduled time and auto-reorder
4. **Manual Reordering**: Enhanced reorder endpoint with scheduled time prompt

## Authentication

All endpoints require authentication:
- **Organizer token**: For create/update/delete operations
- **Participant token**: For read-only access
- **Admin**: Full access via Supabase Auth

**Headers**:
```
Authorization: Bearer {token}
```

## Endpoints

### 1. Create Session

Create a new session within an event.

**Endpoint**: `POST /api/events/:eventId/sessions`

**Authentication**: Organizer or Admin

**Request**:
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
- **Body**:
```json
{
  "title": "Morning Keynote Session",
  "description": "Opening keynote speeches with industry leaders",
  "scheduled_time": "2025-10-15T09:00:00Z"
}
```

**Field Validations**:
- `title`: Required, max 100 characters
- `description`: Optional, max 500 characters
- `scheduled_time`: Optional (ISO 8601 timestamp with timezone)

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event_id": "650e8400-e29b-41d4-a716-446655440001",
  "tenant_id": "750e8400-e29b-41d4-a716-446655440002",
  "title": "Morning Keynote Session",
  "description": "Opening keynote speeches with industry leaders",
  "scheduled_time": "2025-10-15T09:00:00Z",
  "display_order": null,
  "created_at": "2025-10-08T14:30:00Z",
  "updated_at": "2025-10-08T14:30:00Z",
  "speech_count": 0
}
```

**Error Responses**:

- **422 Unprocessable Entity** (validation error):
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "title",
      "message": "Title must not exceed 100 characters"
    }
  ]
}
```

---

### 2. Get Session with Content

Get session details including all speeches.

**Endpoint**: `GET /api/sessions/:sessionId`

**Authentication**: Valid token (organizer or participant)

**Request**:
- **Path Parameters**:
  - `sessionId` (UUID): Session identifier

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event_id": "650e8400-e29b-41d4-a716-446655440001",
  "tenant_id": "750e8400-e29b-41d4-a716-446655440002",
  "title": "Morning Keynote Session",
  "description": "Opening keynote speeches with industry leaders",
  "scheduled_time": "2025-10-15T09:00:00Z",
  "display_order": null,
  "created_at": "2025-10-08T14:30:00Z",
  "updated_at": "2025-10-08T14:30:00Z",
  "speeches": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "title": "The Future of AI",
      "speaker_name": "Dr. Jane Smith",
      "duration": 45,
      "scheduled_time": "2025-10-15T09:15:00Z",
      "display_order": null,
      "slide_count": 3
    }
  ]
}
```

**Notes**:
- Speeches ordered by `COALESCE(display_order, EXTRACT(EPOCH FROM scheduled_time)::INTEGER)`
- `slide_count` included for each speech

---

### 3. Update Session

Update session details.

**Endpoint**: `PUT /api/sessions/:sessionId`

**Authentication**: Organizer or Admin

**Request**:
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `sessionId` (UUID): Session identifier
- **Body** (partial update):
```json
{
  "title": "Updated Morning Session",
  "description": "New description",
  "scheduled_time": "2025-10-15T09:30:00Z"
}
```

**Business Rules**:
- If `scheduled_time` changes, `display_order` is reset to `null` (auto-reorder)
- System returns `reordered: true` flag if auto-reorder occurred

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event_id": "650e8400-e29b-41d4-a716-446655440001",
  "tenant_id": "750e8400-e29b-41d4-a716-446655440002",
  "title": "Updated Morning Session",
  "description": "New description",
  "scheduled_time": "2025-10-15T09:30:00Z",
  "display_order": null,
  "updated_at": "2025-10-08T15:00:00Z",
  "reordered": true,
  "message": "Scheduled time updated - sessions automatically reordered chronologically"
}
```

---

### 4. Delete Session

Delete a session (with safeguard check).

**Endpoint**: `DELETE /api/sessions/:sessionId`

**Authentication**: Organizer or Admin

**Request**:
- **Path Parameters**:
  - `sessionId` (UUID): Session identifier
- **Query Parameters** (optional):
  - `confirm` (boolean): Set to `true` to bypass speech check (used after frontend confirmation)

**Business Rules**:
- If session has speeches and `confirm=false`, return error with speech count
- If `confirm=true`, proceed with deletion (cascades to speeches and slides)

**Success Response** (204 No Content):
```
(Empty body)
```

**Error Responses**:

- **400 Bad Request** (session has speeches):
```json
{
  "error": "Cannot delete session with speeches",
  "message": "This session contains 3 speech(es). Remove or move all speeches before deleting the session.",
  "speech_count": 3,
  "speeches": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "title": "The Future of AI",
      "speaker_name": "Dr. Jane Smith"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Cloud Computing Trends",
      "speaker_name": "John Doe"
    }
  ]
}
```

**Notes**:
- Frontend should display error message and prevent deletion
- Admin must manually delete or move speeches first

---

### 5. Reorder Sessions

Manually reorder sessions within an event.

**Endpoint**: `POST /api/events/:eventId/sessions/reorder`

**Authentication**: Organizer or Admin

**Request**:
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
- **Body**:
```json
{
  "session_ids": [
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "update_scheduled_times": false
}
```

**Field Validations**:
- `session_ids`: Required, array of UUIDs, must match all sessions in event
- `update_scheduled_times`: Optional boolean (default: false)

**Business Rules**:
- Sets `display_order` to array index (0, 1, 2, ...)
- If `update_scheduled_times=false`, returns warning to prompt user
- If `update_scheduled_times=true`, updates `scheduled_time` based on order

**Success Response** (200 OK):
```json
{
  "message": "Sessions reordered successfully",
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "title": "Session C",
      "display_order": 0,
      "scheduled_time": "2025-10-15T14:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Session A",
      "display_order": 1,
      "scheduled_time": "2025-10-15T09:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Session B",
      "display_order": 2,
      "scheduled_time": "2025-10-15T11:00:00Z"
    }
  ],
  "warning": "Manual order set. Consider updating scheduled times to match this order.",
  "needs_time_update": true
}
```

**Notes**:
- `needs_time_update: true` indicates scheduled times don't match display order
- Frontend should show prompt: "Update scheduled times to match new order?"

---

### 6. List Sessions for Event

Get all sessions for an event (ordered).

**Endpoint**: `GET /api/events/:eventId/sessions`

**Authentication**: Valid token (organizer or participant)

**Request**:
- **Path Parameters**:
  - `eventId` (UUID): Event identifier

**Success Response** (200 OK):
```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Morning Keynote Session",
      "description": "Opening keynote speeches",
      "scheduled_time": "2025-10-15T09:00:00Z",
      "display_order": null,
      "speech_count": 2,
      "created_at": "2025-10-08T14:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Afternoon Workshop",
      "description": "Hands-on technical sessions",
      "scheduled_time": "2025-10-15T14:00:00Z",
      "display_order": null,
      "speech_count": 3,
      "created_at": "2025-10-08T14:35:00Z"
    }
  ],
  "total": 2,
  "ordering": "chronological"
}
```

**Notes**:
- `ordering` field indicates how sessions are sorted:
  - `"chronological"`: All `display_order` are null, sorted by `scheduled_time`
  - `"manual"`: At least one `display_order` is set, sorted by `display_order`

---

## Smart Ordering Logic

### Query Pattern

Sessions are ordered using this SQL:
```sql
SELECT *
FROM sessions
WHERE event_id = $1
ORDER BY COALESCE(display_order, EXTRACT(EPOCH FROM scheduled_time)::INTEGER);
```

### Behavior

1. **Default (Chronological)**:
   - All `display_order` are `NULL`
   - Sessions sorted by `scheduled_time` ASC
   - Changing `scheduled_time` automatically reorders

2. **Manual Override**:
   - Admin uses reorder endpoint
   - Sets `display_order` to 0, 1, 2, ...
   - Sessions sorted by `display_order` ASC
   - Warning shown if `scheduled_time` doesn't match order

3. **Time Update (Auto-Reorder)**:
   - Admin updates `scheduled_time`
   - System resets `display_order` to `NULL`
   - Sessions revert to chronological ordering

---

## Example Usage Flow

### Scenario: Admin creates and reorders sessions

1. **Create sessions with scheduled times**:
```bash
POST /api/events/{eventId}/sessions
Body: { title: "Morning Session", scheduled_time: "2025-10-15T09:00:00Z" }
→ 201 Created { id: session1, display_order: null }

POST /api/events/{eventId}/sessions
Body: { title: "Afternoon Session", scheduled_time: "2025-10-15T14:00:00Z" }
→ 201 Created { id: session2, display_order: null }

GET /api/events/{eventId}/sessions
→ 200 OK { sessions: [session1, session2], ordering: "chronological" }
```

2. **Manually reorder (swap)**:
```bash
POST /api/events/{eventId}/sessions/reorder
Body: { session_ids: [session2, session1], update_scheduled_times: false }
→ 200 OK {
  sessions: [
    { id: session2, display_order: 0, scheduled_time: "14:00" },
    { id: session1, display_order: 1, scheduled_time: "09:00" }
  ],
  warning: "Consider updating scheduled times",
  needs_time_update: true
}
```

3. **Frontend shows prompt**: "Update scheduled times to match new order?"

4. **Admin confirms, reorder with time update**:
```bash
POST /api/events/{eventId}/sessions/reorder
Body: { session_ids: [session2, session1], update_scheduled_times: true }
→ 200 OK {
  sessions: [
    { id: session2, display_order: 0, scheduled_time: "09:00" },
    { id: session1, display_order: 1, scheduled_time: "14:00" }
  ],
  warning: null,
  needs_time_update: false
}
```

5. **Later, admin updates session1 time**:
```bash
PUT /api/sessions/{session1}
Body: { scheduled_time: "2025-10-15T08:00:00Z" }
→ 200 OK {
  ...,
  display_order: null,
  reordered: true,
  message: "Scheduled time updated - sessions automatically reordered chronologically"
}

GET /api/events/{eventId}/sessions
→ 200 OK { sessions: [session1, session2], ordering: "chronological" }
```

---

## Data Model Changes

### sessions table (updated schema)

```sql
ALTER TABLE sessions
ALTER COLUMN display_order DROP NOT NULL,
ALTER COLUMN display_order SET DEFAULT NULL;

ALTER TABLE sessions
RENAME COLUMN start_time TO scheduled_time;

-- Update existing data: preserve current order, clear scheduled_time
UPDATE sessions SET scheduled_time = NULL;
```

---

**Status**: Ready for implementation
