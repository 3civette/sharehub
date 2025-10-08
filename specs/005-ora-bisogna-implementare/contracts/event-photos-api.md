# API Contract: Event Photos

**Feature**: 005-ora-bisogna-implementare
**Version**: 1.0.0
**Base Path**: `/api/events/:eventId/photos`

## Overview

Endpoints for managing event photos including upload, listing, setting cover image, reordering, and deletion.

## Authentication

All endpoints require admin authentication via Supabase Auth token.

**Headers**:
```
Authorization: Bearer {supabase_jwt_token}
```

## Endpoints

### 1. Upload Event Photo

Upload a new photo for an event.

**Endpoint**: `POST /api/events/:eventId/photos`

**Authentication**: Admin only (tenant isolation enforced)

**Request**:
- **Content-Type**: `multipart/form-data`
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
- **Form Data**:
  - `photo` (File): Image file (required)
  - `is_cover` (boolean): Set as cover image (optional, default: false)

**Validation**:
- File size: Maximum 50 MB (52,428,800 bytes)
- MIME types: `image/jpeg`, `image/png`, `image/webp`
- Event must exist and belong to admin's tenant
- If `is_cover=true` and cover already exists, unset previous cover

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event_id": "650e8400-e29b-41d4-a716-446655440001",
  "tenant_id": "750e8400-e29b-41d4-a716-446655440002",
  "storage_path": "event-photos/750e8400-e29b-41d4-a716-446655440002/650e8400-e29b-41d4-a716-446655440001/1696867200000-photo.jpg",
  "filename": "photo.jpg",
  "file_size": 2457600,
  "mime_type": "image/jpeg",
  "is_cover": false,
  "display_order": 0,
  "uploaded_at": "2025-10-08T14:30:00Z",
  "uploaded_by": "850e8400-e29b-41d4-a716-446655440003",
  "url": "https://{supabase_url}/storage/v1/object/public/event-photos/750e8400-e29b-41d4-a716-446655440002/650e8400-e29b-41d4-a716-446655440001/1696867200000-photo.jpg"
}
```

**Error Responses**:

- **400 Bad Request** (validation error):
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "photo",
      "message": "File size exceeds 50 MB limit"
    }
  ]
}
```

- **404 Not Found** (event not found):
```json
{
  "error": "Event not found"
}
```

- **413 Payload Too Large**:
```json
{
  "error": "File too large",
  "max_size": 52428800
}
```

- **415 Unsupported Media Type**:
```json
{
  "error": "Invalid file type",
  "allowed_types": ["image/jpeg", "image/png", "image/webp"]
}
```

---

### 2. List Event Photos

Get all photos for an event.

**Endpoint**: `GET /api/events/:eventId/photos`

**Authentication**: Admin or valid participant token

**Request**:
- **Path Parameters**:
  - `eventId` (UUID): Event identifier

**Success Response** (200 OK):
```json
{
  "photos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "event_id": "650e8400-e29b-41d4-a716-446655440001",
      "storage_path": "event-photos/750e8400-e29b-41d4-a716-446655440002/650e8400-e29b-41d4-a716-446655440001/1696867200000-cover.jpg",
      "filename": "cover.jpg",
      "file_size": 3145728,
      "mime_type": "image/jpeg",
      "is_cover": true,
      "display_order": 0,
      "uploaded_at": "2025-10-08T14:30:00Z",
      "url": "https://{supabase_url}/storage/v1/object/public/event-photos/.../cover.jpg"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "event_id": "650e8400-e29b-41d4-a716-446655440001",
      "storage_path": "event-photos/.../1696867300000-gallery1.jpg",
      "filename": "gallery1.jpg",
      "file_size": 2097152,
      "mime_type": "image/jpeg",
      "is_cover": false,
      "display_order": 1,
      "uploaded_at": "2025-10-08T14:35:00Z",
      "url": "https://{supabase_url}/storage/v1/object/public/event-photos/.../gallery1.jpg"
    }
  ],
  "total": 2,
  "cover": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://{supabase_url}/storage/v1/object/public/event-photos/.../cover.jpg"
  }
}
```

**Notes**:
- Photos ordered by `display_order` ASC
- `cover` object provides quick access to cover image
- If no cover exists, `cover` is `null`

---

### 3. Set Cover Image

Set a photo as the event cover image.

**Endpoint**: `PUT /api/events/:eventId/photos/:photoId/set-cover`

**Authentication**: Admin only

**Request**:
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
  - `photoId` (UUID): Photo identifier

**Success Response** (200 OK):
```json
{
  "message": "Cover image updated",
  "photo": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "is_cover": true,
    "url": "https://{supabase_url}/storage/v1/object/public/event-photos/.../gallery1.jpg"
  },
  "previous_cover": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "is_cover": false
  }
}
```

**Error Responses**:

- **404 Not Found**:
```json
{
  "error": "Photo not found"
}
```

---

### 4. Reorder Photos

Update display order of gallery photos.

**Endpoint**: `PUT /api/events/:eventId/photos/reorder`

**Authentication**: Admin only

**Request**:
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
- **Body**:
```json
{
  "photo_ids": [
    "550e8400-e29b-41d4-a716-446655440010",
    "550e8400-e29b-41d4-a716-446655440020",
    "550e8400-e29b-41d4-a716-446655440030"
  ]
}
```

**Validation**:
- All photo IDs must belong to the event
- Cover photo is not included in reordering (always first)
- Array length must match number of gallery photos

**Success Response** (200 OK):
```json
{
  "message": "Photos reordered successfully",
  "photos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "display_order": 1
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "display_order": 2
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "display_order": 3
    }
  ]
}
```

**Error Responses**:

- **400 Bad Request**:
```json
{
  "error": "Invalid photo IDs",
  "message": "All photo IDs must belong to this event"
}
```

---

### 5. Delete Photo

Delete an event photo.

**Endpoint**: `DELETE /api/events/:eventId/photos/:photoId`

**Authentication**: Admin only

**Request**:
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
  - `photoId` (UUID): Photo identifier

**Validation**:
- If deleting cover photo and other photos exist, error (must set new cover first)
- If deleting last photo (cover), allow deletion

**Success Response** (200 OK):
```json
{
  "message": "Photo deleted successfully",
  "deleted": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "filename": "gallery1.jpg"
  }
}
```

**Error Responses**:

- **400 Bad Request** (trying to delete cover with other photos):
```json
{
  "error": "Cannot delete cover image",
  "message": "Set another photo as cover before deleting this one",
  "gallery_count": 3
}
```

- **404 Not Found**:
```json
{
  "error": "Photo not found"
}
```

---

## Business Rules

1. **Cover Image Management**:
   - First uploaded photo automatically becomes cover
   - Only one cover per event (enforced)
   - Cannot delete cover if gallery photos exist (must set new cover first)
   - Setting new cover automatically unsets previous cover

2. **Display Order**:
   - Cover photo always displays first (display_order = 0)
   - Gallery photos ordered by display_order (1, 2, 3, ...)
   - Reordering updates display_order sequentially

3. **File Storage**:
   - Files stored in Supabase Storage `event-photos` bucket
   - Path: `{tenantId}/{eventId}/{timestamp}-{sanitized_filename}`
   - Deletion removes both database record and storage file

4. **Tenant Isolation**:
   - All queries filtered by admin's tenant_id
   - RLS policies enforce access control

---

## Storage Configuration

**Bucket**: `event-photos`
**Access**: Public (authenticated via URL)
**Max Size**: 50 MB per file
**Allowed MIME Types**: image/jpeg, image/png, image/webp

**RLS Policies**:
```sql
-- Allow admins to upload photos for their tenant's events
CREATE POLICY "admins_can_upload_photos" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-photos' AND
  auth.uid() IN (
    SELECT id FROM admins
    WHERE tenant_id = (storage.foldername(name))[1]::uuid
  )
);

-- Allow admins to delete photos for their tenant's events
CREATE POLICY "admins_can_delete_photos" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-photos' AND
  auth.uid() IN (
    SELECT id FROM admins
    WHERE tenant_id = (storage.foldername(name))[1]::uuid
  )
);

-- Public read access
CREATE POLICY "public_can_view_photos" ON storage.objects
FOR SELECT
USING (bucket_id = 'event-photos');
```

---

## Example Usage Flow

### Admin adds event photos:

1. **Upload cover image**:
```bash
POST /api/events/{eventId}/photos
Form-Data: photo=cover.jpg, is_cover=true
→ 201 Created { id, url, is_cover: true }
```

2. **Upload gallery images**:
```bash
POST /api/events/{eventId}/photos
Form-Data: photo=gallery1.jpg
→ 201 Created { id, url, is_cover: false, display_order: 1 }

POST /api/events/{eventId}/photos
Form-Data: photo=gallery2.jpg
→ 201 Created { id, url, is_cover: false, display_order: 2 }
```

3. **Reorder gallery**:
```bash
PUT /api/events/{eventId}/photos/reorder
Body: { photo_ids: [gallery2_id, gallery1_id] }
→ 200 OK { photos: [{ id: gallery2_id, display_order: 1 }, { id: gallery1_id, display_order: 2 }] }
```

4. **Change cover image**:
```bash
PUT /api/events/{eventId}/photos/{gallery1_id}/set-cover
→ 200 OK { message: "Cover image updated", photo: { is_cover: true }, previous_cover: { is_cover: false } }
```

5. **Delete old cover (now gallery)**:
```bash
DELETE /api/events/{eventId}/photos/{old_cover_id}
→ 200 OK { message: "Photo deleted successfully" }
```

---

**Status**: Ready for implementation
