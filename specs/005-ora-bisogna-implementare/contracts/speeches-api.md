# API Contract: Speeches (Enhanced)

**Feature**: 005-ora-bisogna-implementare
**Version**: 2.0.0 (Enhanced from Feature 003)
**Base Path**: `/api/sessions/:sessionId/speeches`

## Overview

Enhanced speech management endpoints with smart chronological ordering, scheduled times, and cascade deletion with confirmation.

## Changes from Feature 003

1. **Smart Ordering**: Added `scheduled_time` field with hybrid ordering logic (same as sessions)
2. **Cascade Delete with Confirmation**: Enhanced delete endpoint to return slide count for confirmation
3. **Enhanced Metadata**: GET endpoints include slide metadata (speaker name, speech title)

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

### 1. Create Speech

Create a new speech within a session.

**Endpoint**: `POST /api/sessions/:sessionId/speeches`

**Authentication**: Organizer or Admin

**Request**:
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `sessionId` (UUID): Session identifier
- **Body**:
```json
{
  "title": "The Future of Artificial Intelligence",
  "speaker_name": "Dr. Jane Smith",
  "duration": 45,
  "description": "An exploration of emerging AI trends and their impact on society",
  "scheduled_time": "2025-10-15T09:15:00Z"
}
```

**Field Validations**:
- `title`: Required, max 150 characters
- `speaker_name`: Optional, max 100 characters
- `duration`: Optional, integer 1-600 (minutes)
- `description`: Optional, text
- `scheduled_time`: Optional (ISO 8601 timestamp with timezone)

**Success Response** (201 Created):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "750e8400-e29b-41d4-a716-446655440002",
  "title": "The Future of Artificial Intelligence",
  "speaker_name": "Dr. Jane Smith",
  "duration": 45,
  "description": "An exploration of emerging AI trends and their impact on society",
  "scheduled_time": "2025-10-15T09:15:00Z",
  "display_order": null,
  "created_at": "2025-10-08T14:30:00Z",
  "updated_at": "2025-10-08T14:30:00Z",
  "slide_count": 0
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
      "message": "Title must not exceed 150 characters"
    }
  ]
}
```

- **404 Not Found** (session not found):
```json
{
  "error": "Session not found"
}
```

---

### 2. Get Speech with Slides

Get speech details including all slides with enhanced metadata.

**Endpoint**: `GET /api/speeches/:speechId`

**Authentication**: Valid token (organizer or participant)

**Request**:
- **Path Parameters**:
  - `speechId` (UUID): Speech identifier

**Success Response** (200 OK):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "750e8400-e29b-41d4-a716-446655440002",
  "title": "The Future of Artificial Intelligence",
  "speaker_name": "Dr. Jane Smith",
  "duration": 45,
  "description": "An exploration of emerging AI trends and their impact on society",
  "scheduled_time": "2025-10-15T09:15:00Z",
  "display_order": null,
  "created_at": "2025-10-08T14:30:00Z",
  "updated_at": "2025-10-08T14:30:00Z",
  "slides": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "filename": "ai-trends-2025.pdf",
      "file_size": 3145728,
      "mime_type": "application/pdf",
      "display_order": 0,
      "uploaded_at": "2025-10-08T15:00:00Z",
      "download_url": "https://{supabase_url}/storage/v1/object/public/slides/.../ai-trends-2025.pdf",
      "metadata": {
        "speaker_name": "Dr. Jane Smith",
        "speech_title": "The Future of Artificial Intelligence",
        "formatted_size": "3.0 MB"
      }
    }
  ]
}
```

**Notes**:
- Slides ordered by `display_order` ASC
- Metadata includes speaker name and speech title for context
- `formatted_size` is human-readable (e.g., "3.0 MB", "512 KB")

---

### 3. Update Speech

Update speech details.

**Endpoint**: `PUT /api/speeches/:speechId`

**Authentication**: Organizer or Admin

**Request**:
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `speechId` (UUID): Speech identifier
- **Body** (partial update):
```json
{
  "title": "Updated: The Future of AI",
  "duration": 50,
  "scheduled_time": "2025-10-15T09:20:00Z"
}
```

**Business Rules**:
- If `scheduled_time` changes, `display_order` is reset to `null` (auto-reorder within session)
- System returns `reordered: true` flag if auto-reorder occurred

**Success Response** (200 OK):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "750e8400-e29b-41d4-a716-446655440002",
  "title": "Updated: The Future of AI",
  "speaker_name": "Dr. Jane Smith",
  "duration": 50,
  "description": "An exploration of emerging AI trends and their impact on society",
  "scheduled_time": "2025-10-15T09:20:00Z",
  "display_order": null,
  "updated_at": "2025-10-08T16:00:00Z",
  "reordered": true,
  "message": "Scheduled time updated - speeches automatically reordered chronologically"
}
```

---

### 4. Delete Speech (with Confirmation)

Delete a speech with cascade deletion of slides.

**Endpoint**: `DELETE /api/speeches/:speechId`

**Authentication**: Organizer or Admin

**Request**:
- **Path Parameters**:
  - `speechId` (UUID): Speech identifier
- **Query Parameters** (optional):
  - `confirm` (boolean): Set to `true` to proceed with deletion after confirmation

**Business Rules**:
1. First call (without `confirm`): Returns slide count for confirmation
2. Second call (with `confirm=true`): Deletes speech and cascades to slides

**Success Response (200 OK)** - Requires Confirmation:
```json
{
  "requires_confirmation": true,
  "message": "This will delete 3 slide(s). Are you sure?",
  "slide_count": 3,
  "slides": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "filename": "slide1.pdf",
      "file_size": 2097152
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "filename": "slide2.pdf",
      "file_size": 1572864
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "filename": "slide3.pptx",
      "file_size": 5242880
    }
  ]
}
```

**Success Response (200 OK)** - Deletion Completed:
```json
{
  "message": "Speech deleted successfully",
  "deleted": {
    "speech_id": "660e8400-e29b-41d4-a716-446655440000",
    "title": "The Future of Artificial Intelligence",
    "slide_count": 3
  }
}
```

**Error Responses**:

- **404 Not Found**:
```json
{
  "error": "Speech not found"
}
```

---

### 5. Reorder Speeches

Manually reorder speeches within a session.

**Endpoint**: `POST /api/sessions/:sessionId/speeches/reorder`

**Authentication**: Organizer or Admin

**Request**:
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `sessionId` (UUID): Session identifier
- **Body**:
```json
{
  "speech_ids": [
    "660e8400-e29b-41d4-a716-446655440002",
    "660e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "update_scheduled_times": false
}
```

**Field Validations**:
- `speech_ids`: Required, array of UUIDs, must match all speeches in session
- `update_scheduled_times`: Optional boolean (default: false)

**Business Rules**:
- Same smart ordering logic as sessions
- Sets `display_order` to array index
- Returns warning if scheduled times don't match order

**Success Response** (200 OK):
```json
{
  "message": "Speeches reordered successfully",
  "speeches": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "title": "Speech C",
      "display_order": 0,
      "scheduled_time": "2025-10-15T11:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "title": "Speech A",
      "display_order": 1,
      "scheduled_time": "2025-10-15T09:15:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Speech B",
      "display_order": 2,
      "scheduled_time": "2025-10-15T10:00:00Z"
    }
  ],
  "warning": "Manual order set. Consider updating scheduled times to match this order.",
  "needs_time_update": true
}
```

---

### 6. List Speeches for Session

Get all speeches for a session (ordered).

**Endpoint**: `GET /api/sessions/:sessionId/speeches`

**Authentication**: Valid token (organizer or participant)

**Request**:
- **Path Parameters**:
  - `sessionId` (UUID): Session identifier

**Success Response** (200 OK):
```json
{
  "speeches": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "title": "The Future of AI",
      "speaker_name": "Dr. Jane Smith",
      "duration": 45,
      "scheduled_time": "2025-10-15T09:15:00Z",
      "display_order": null,
      "slide_count": 3,
      "created_at": "2025-10-08T14:30:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Cloud Computing Trends",
      "speaker_name": "John Doe",
      "duration": 30,
      "scheduled_time": "2025-10-15T10:00:00Z",
      "display_order": null,
      "slide_count": 2,
      "created_at": "2025-10-08T14:35:00Z"
    }
  ],
  "total": 2,
  "ordering": "chronological"
}
```

**Notes**:
- `ordering` indicates sort method: `"chronological"` or `"manual"`
- Same logic as sessions ordering

---

## Smart Ordering Logic

### Query Pattern

Speeches are ordered using this SQL:
```sql
SELECT *
FROM speeches
WHERE session_id = $1
ORDER BY COALESCE(display_order, EXTRACT(EPOCH FROM scheduled_time)::INTEGER);
```

### Behavior

Identical to sessions smart ordering:

1. **Default (Chronological)**: `display_order` is `NULL`, sorted by `scheduled_time`
2. **Manual Override**: `display_order` set via reorder endpoint
3. **Time Update (Auto-Reorder)**: Updating `scheduled_time` resets `display_order` to `NULL`

---

## Example Usage Flow

### Scenario: Admin creates speech and uploads slides, then deletes

1. **Create speech**:
```bash
POST /api/sessions/{sessionId}/speeches
Body: {
  title: "AI Trends",
  speaker_name: "Dr. Smith",
  duration: 45,
  scheduled_time: "2025-10-15T09:15:00Z"
}
→ 201 Created { id: speech1, slide_count: 0 }
```

2. **Upload slides** (via Slide Upload API):
```bash
POST /api/speeches/{speech1}/slides
Form-Data: file=slide1.pdf
→ 201 Created { id: slide1 }

POST /api/speeches/{speech1}/slides
Form-Data: file=slide2.pdf
→ 201 Created { id: slide2 }
```

3. **Get speech with slides**:
```bash
GET /api/speeches/{speech1}
→ 200 OK {
  ...,
  slides: [
    { filename: "slide1.pdf", metadata: { speaker_name: "Dr. Smith", ... } },
    { filename: "slide2.pdf", metadata: { speaker_name: "Dr. Smith", ... } }
  ]
}
```

4. **Delete speech (first attempt)**:
```bash
DELETE /api/speeches/{speech1}
→ 200 OK {
  requires_confirmation: true,
  message: "This will delete 2 slide(s). Are you sure?",
  slide_count: 2,
  slides: [{ filename: "slide1.pdf", ... }, { filename: "slide2.pdf", ... }]
}
```

5. **Frontend shows confirmation dialog**: "This will delete 2 slide(s). Are you sure?"

6. **User confirms, delete speech (second attempt)**:
```bash
DELETE /api/speeches/{speech1}?confirm=true
→ 200 OK {
  message: "Speech deleted successfully",
  deleted: { speech_id: speech1, slide_count: 2 }
}
```

---

## Enhanced Slide Metadata Display

### Query Pattern

When fetching slides for a speech, include speaker and speech context:

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

### Usage in UI

Display slide with context:
```
presentation.pdf (2.3 MB)
Speaker: Dr. Jane Smith
Speech: The Future of Artificial Intelligence
```

---

## Data Model Changes

### speeches table (updated schema)

```sql
ALTER TABLE speeches
ADD COLUMN scheduled_time TIMESTAMPTZ NULL;

ALTER TABLE speeches
ALTER COLUMN display_order DROP NOT NULL,
ALTER COLUMN display_order SET DEFAULT NULL;

-- Update existing data: preserve current order, clear scheduled_time
UPDATE speeches SET scheduled_time = NULL;
```

---

**Status**: Ready for implementation
