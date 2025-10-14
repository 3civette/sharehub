# API Contracts: Public Event Page

**Feature**: 011-il-momento-di
**Date**: 2025-10-14

## Contract 1: Get Public Event

**Endpoint**: `GET /api/public/events/[slug]`
**Purpose**: Fetch complete event data for public display

**Request**:
- Path param: `slug` (string, URL-safe)
- Optional query: `token_id` (UUID) for private event access

**Response 200** (Success):
```json
{
  "event": {
    "id": "uuid",
    "name": "Conference 2024",
    "slug": "conference-2024",
    "description": "Annual tech conference",
    "event_date": "2024-10-15",
    "visibility": "public"
  },
  "sessions": [{
    "id": "uuid",
    "name": "Opening Keynote",
    "time": "2024-10-15T09:00:00Z",
    "description": null,
    "speeches": [{
      "id": "uuid",
      "speaker": "John Doe",
      "title": "Future of AI",
      "description": null,
      "slides": [{
        "id": "uuid",
        "filename": "ai-future.pdf",
        "file_type": "pdf",
        "file_size": 2048576,
        "download_url": "https://r2.cloudflar..."
      }]
    }]
  }],
  "photos": [{
    "id": "uuid",
    "image_url": "https://supabase.co/...",
    "caption": "Group photo",
    "alt_text": "Conference attendees"
  }],
  "metrics": {
    "total_downloads": 42,
    "page_views": 0
  }
}
```

**Response 404** (Not Found):
```json
{
  "error": "Event not found"
}
```

**Response 403** (Private, No Token):
```json
{
  "error": "This is a private event. Please provide a valid access token."
}
```

---

## Contract 2: Validate Access Token

**Endpoint**: `POST /api/public/events/[slug]/validate-token`
**Purpose**: Validate private event access token

**Request**:
```json
{
  "token": "ABC123DEF456GHI789JKL"
}
```

**Response 200** (Valid):
```json
{
  "valid": true,
  "token_id": "uuid-of-token"
}
```

**Response 200** (Invalid):
```json
{
  "valid": false,
  "message": "Invalid or expired token"
}
```

**Response 400** (Bad Format):
```json
{
  "error": "Token must be exactly 21 characters"
}
```

---

## Contract 3: Get Event Metrics

**Endpoint**: `GET /api/public/events/[slug]/metrics`
**Purpose**: Fetch page views and download counts

**Request**:
- Path param: `slug` (string)

**Response 200**:
```json
{
  "event_id": "uuid",
  "total_downloads": 127,
  "page_views": 0
}
```

---

## Contract 4: Download Session ZIP

**Endpoint**: `GET /api/public/sessions/[id]/download-all`
**Purpose**: Download all slides in a session as ZIP

**Request**:
- Path param: `id` (UUID)

**Response 200**:
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="session-name.zip"`
- Body: Binary ZIP stream

**Response 404**:
```json
{
  "error": "Session not found"
}
```

---

## Contract 5: Download Speech ZIP

**Endpoint**: `GET /api/public/speeches/[id]/download-all`
**Purpose**: Download all slides in a speech as ZIP

**Request**:
- Path param: `id` (UUID)

**Response 200**:
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="speech-title.zip"`
- Body: Binary ZIP stream

**Response 404**:
```json
{
  "error": "Speech not found"
}
```

---

## Test Scenarios

Each contract will have corresponding contract tests in `frontend/tests/contract/publicEvents.test.ts`:
- Test public event fetch
- Test private event 403 response
- Test token validation (valid/invalid/expired)
- Test metrics endpoint
- Test ZIP generation
