# API Contracts: Event Details Management

**Feature**: 005-ora-bisogna-implementare
**Created**: 2025-10-08

## Overview

This directory contains OpenAPI-style endpoint contracts for the Event Details Management feature.

## Contract Files

### 1. event-photos-api.md
**Purpose**: Event photo upload and management
**Endpoints**:
- `POST /api/events/:eventId/photos` - Upload photo
- `GET /api/events/:eventId/photos` - List photos
- `PUT /api/events/:eventId/photos/:photoId/set-cover` - Set cover image
- `PUT /api/events/:eventId/photos/reorder` - Reorder gallery
- `DELETE /api/events/:eventId/photos/:photoId` - Delete photo

**Key Features**:
- Cover image + gallery support
- File size validation (50 MB max)
- Format validation (JPG, PNG, WebP)
- Drag-and-drop reordering

---

### 2. sessions-api.md
**Purpose**: Enhanced session management with smart ordering
**Endpoints**:
- `POST /api/events/:eventId/sessions` - Create session
- `GET /api/sessions/:sessionId` - Get session with speeches
- `PUT /api/sessions/:sessionId` - Update session
- `DELETE /api/sessions/:sessionId` - Delete session (with safeguard)
- `POST /api/events/:eventId/sessions/reorder` - Manual reordering
- `GET /api/events/:eventId/sessions` - List sessions

**Key Features**:
- Smart chronological ordering (scheduled_time)
- Manual override with display_order
- Auto-reorder when scheduled_time changes
- Deletion safeguard (prevents delete if speeches exist)

---

### 3. speeches-api.md
**Purpose**: Enhanced speech management with metadata display
**Endpoints**:
- `POST /api/sessions/:sessionId/speeches` - Create speech
- `GET /api/speeches/:speechId` - Get speech with slides
- `PUT /api/speeches/:speechId` - Update speech
- `DELETE /api/speeches/:speechId` - Delete speech (with confirmation)
- `POST /api/sessions/:sessionId/speeches/reorder` - Manual reordering
- `GET /api/sessions/:sessionId/speeches` - List speeches

**Key Features**:
- Same smart ordering as sessions
- Cascade delete with confirmation dialog
- Enhanced slide metadata (speaker name, speech title)
- Belongs to exactly one session

---

### 4. tokens-api.md
**Purpose**: Enhanced token management with QR codes
**Endpoints**:
- `POST /api/events/:eventId/tokens` - Generate token
- `GET /api/events/:eventId/tokens` - List tokens
- `GET /api/events/:eventId/tokens/:tokenId/qr` - Generate QR code
- `GET /api/events/:eventId/tokens/:tokenId/copy-url` - Get copy URL
- `POST /api/events/:eventId/tokens/:tokenId/revoke` - Revoke token
- `GET /api/tokens/validate` - Validate token (public)

**Key Features**:
- QR code generation (PNG/SVG)
- Copy-to-clipboard URL formatting
- Token revocation with audit trail
- Active/revoked/expired status

---

## Common Patterns

### Authentication
All admin endpoints require Supabase Auth JWT or organizer token:
```
Authorization: Bearer {token}
```

### Tenant Isolation
All queries automatically filtered by:
- Admin's `tenant_id` (from JWT)
- Organizer token's `tenant_id`

### Error Responses
Standard error format across all endpoints:
```json
{
  "error": "Error type",
  "message": "Detailed message",
  "details": [] // Optional validation errors
}
```

### File Upload
Uses `multipart/form-data` with Multer:
- Max file size configured per endpoint
- MIME type validation
- Filename sanitization

### Pagination
Not implemented in Phase 1 (small datasets expected)
Future enhancement for events with >100 sessions/speeches

---

## Implementation Order

Recommended implementation sequence:

1. **Event Photos API** - Independent, no dependencies
2. **Sessions API (Enhanced)** - Update existing endpoints
3. **Speeches API (Enhanced)** - Update existing endpoints
4. **Tokens API (Enhanced)** - Update existing endpoints

---

## Testing

Each contract includes:
- Request/response examples
- Validation rules
- Error scenarios
- Example usage flows

Use these for:
- Contract tests (backend/tests/contract/)
- Integration tests (backend/tests/integration/)
- Frontend API client generation

---

## Related Documents

- **data-model.md** - Entity definitions and relationships
- **quickstart.md** - End-to-end test scenario
- **spec.md** - Feature requirements and acceptance criteria
- **research.md** - Technical decisions and patterns

---

**Status**: Ready for implementation
