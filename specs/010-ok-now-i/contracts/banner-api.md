# API Contract: Banner Management

**Feature**: 010-ok-now-i | **Date**: 2025-10-13
**Base Path**: `/api/events/[eventId]/banners` and `/api/banners/[bannerId]`

## Authentication
All endpoints require authentication via Supabase session cookie.
Tenant admin access verified via `admins` table join on `tenant_id`.

---

## POST /api/events/[eventId]/banners

### Description
Create a new banner for an event. Uploads file to Supabase Storage and creates database record.

### Request
**Method**: `POST`
**Content-Type**: `multipart/form-data`

**Path Parameters**:
- `eventId` (string, uuid): Event ID to associate banner with

**Form Data**:
```typescript
{
  file: File;              // Banner image file
  slot_number: 1 | 2 | 3 | 4 | 5;  // Target slot
  click_url?: string;      // Optional external URL
  is_active?: boolean;     // Optional, defaults to true
}
```

**Example**:
```bash
curl -X POST https://app.sharehub.com/api/events/123e4567-e89b-12d3-a456-426614174000/banners \
  -H "Cookie: sb-access-token=..." \
  -F "file=@banner.jpg" \
  -F "slot_number=1" \
  -F "click_url=https://sponsor.com" \
  -F "is_active=true"
```

### Response

**Success (201 Created)**:
```json
{
  "id": "banner-uuid",
  "event_id": "event-uuid",
  "slot_number": 1,
  "storage_url": "https://..../tenant-xxx/event-xxx/banner-xxx-slot-1.jpg",
  "filename": "banner.jpg",
  "file_size": 2048576,
  "click_url": "https://sponsor.com",
  "is_active": true,
  "created_at": "2025-10-13T10:30:00Z",
  "updated_at": "2025-10-13T10:30:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid file type, size > 5MB, invalid slot number, slot already occupied
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Not a tenant admin for this event
- `404 Not Found`: Event does not exist
- `413 Payload Too Large`: File exceeds 5MB
- `500 Internal Server Error`: Storage upload failure

**Example Error**:
```json
{
  "error": "INVALID_FILE_TYPE",
  "message": "Only JPEG, PNG, and WebP files are allowed.",
  "allowed_types": ["image/jpeg", "image/png", "image/webp"]
}
```

---

## GET /api/events/[eventId]/banners

### Description
Retrieve all banners for an event. Returns both active and inactive banners (excludes soft-deleted).

### Request
**Method**: `GET`

**Path Parameters**:
- `eventId` (string, uuid): Event ID

**Query Parameters** (optional):
- `active_only` (boolean): Filter to only active banners (default: false)

**Example**:
```bash
curl https://app.sharehub.com/api/events/123e4567-e89b-12d3-a456-426614174000/banners?active_only=true \
  -H "Cookie: sb-access-token=..."
```

### Response

**Success (200 OK)**:
```json
{
  "banners": [
    {
      "id": "banner-uuid-1",
      "slot_number": 1,
      "storage_url": "https://.../banner-1.jpg",
      "filename": "header-banner.jpg",
      "file_size": 2048576,
      "click_url": "https://sponsor1.com",
      "is_active": true,
      "created_at": "2025-10-13T10:30:00Z",
      "updated_at": "2025-10-13T10:30:00Z"
    },
    {
      "id": "banner-uuid-3",
      "slot_number": 3,
      "storage_url": "https://.../banner-3.jpg",
      "filename": "content-banner.jpg",
      "file_size": 1524288,
      "click_url": null,
      "is_active": true,
      "created_at": "2025-10-13T11:00:00Z",
      "updated_at": "2025-10-13T11:00:00Z"
    }
  ],
  "total": 2,
  "available_slots": [2, 4, 5]
}
```

**Errors**:
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Not a tenant admin
- `404 Not Found`: Event does not exist

---

## PATCH /api/banners/[bannerId]

### Description
Update banner properties (slot, click URL, or active status). File replacement not supported (delete and recreate instead).

### Request
**Method**: `PATCH`
**Content-Type**: `application/json`

**Path Parameters**:
- `bannerId` (string, uuid): Banner ID

**Body** (all fields optional):
```typescript
{
  slot_number?: 1 | 2 | 3 | 4 | 5;
  click_url?: string | null;    // null removes click URL
  is_active?: boolean;
}
```

**Example**:
```bash
curl -X PATCH https://app.sharehub.com/api/banners/banner-uuid \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{"slot_number": 2, "is_active": false}'
```

### Response

**Success (200 OK)**:
```json
{
  "id": "banner-uuid",
  "slot_number": 2,
  "storage_url": "https://.../banner.jpg",
  "filename": "banner.jpg",
  "file_size": 2048576,
  "click_url": "https://sponsor.com",
  "is_active": false,
  "created_at": "2025-10-13T10:30:00Z",
  "updated_at": "2025-10-13T12:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid slot number, new slot already occupied, invalid click URL format
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Not a tenant admin
- `404 Not Found`: Banner does not exist or already deleted
- `409 Conflict`: Target slot is occupied by another banner

---

## DELETE /api/banners/[bannerId]

### Description
Soft-delete a banner. Sets `deleted_at` timestamp and removes from public display. Frees up the slot for reuse.

### Request
**Method**: `DELETE`

**Path Parameters**:
- `bannerId` (string, uuid): Banner ID

**Example**:
```bash
curl -X DELETE https://app.sharehub.com/api/banners/banner-uuid \
  -H "Cookie: sb-access-token=..."
```

### Response

**Success (204 No Content)**: Empty body

**Errors**:
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Not a tenant admin
- `404 Not Found`: Banner does not exist or already deleted

---

## Public API (No Auth)

### GET /api/public/events/[slug]/banners

### Description
Retrieve active banners for public event page display. No authentication required.

### Request
**Method**: `GET`

**Path Parameters**:
- `slug` (string): Event slug

**Example**:
```bash
curl https://app.sharehub.com/api/public/events/conference-2025/banners
```

### Response

**Success (200 OK)**:
```json
{
  "banners": [
    {
      "slot_number": 1,
      "storage_url": "https://.../banner-1.jpg",
      "click_url": "https://sponsor.com",
      "dimensions": { "width": 1200, "height": 300 }
    },
    {
      "slot_number": 3,
      "storage_url": "https://.../banner-3.jpg",
      "click_url": null,
      "dimensions": { "width": 970, "height": 250 }
    }
  ]
}
```

**Notes**:
- Only returns `is_active = true` and `deleted_at IS NULL` banners
- Sorted by `slot_number` ascending
- Includes dimensions from frontend slot configuration

---

## Validation Rules

### File Upload (POST)
1. **File Type**: MIME type must be `image/jpeg`, `image/png`, or `image/webp`
2. **File Size**: Max 5MB (5,242,880 bytes)
3. **Slot Number**: Must be 1-5 (integer)
4. **Slot Availability**: Target slot must not have an active banner
5. **Click URL**: Must start with `http://` or `https://` if provided

### Update (PATCH)
1. **Slot Change**: New slot must not be occupied (unless same banner)
2. **Click URL**: Must be valid HTTP(S) URL or explicitly `null`
3. **At Least One Field**: Request must update at least one field

### Authorization (All Endpoints)
1. **Session**: Valid Supabase auth session required
2. **Tenant Admin**: User must be admin of event's tenant
3. **Event Ownership**: Event must belong to admin's tenant

---

## Rate Limits

- **Upload (POST)**: 10 requests per minute per user
- **List (GET)**: 60 requests per minute per user
- **Update/Delete**: 30 requests per minute per user
- **Public API**: 100 requests per minute per IP

---

**Contract Version**: 1.0 | **Status**: Draft - Ready for contract test generation
