# API Contract: Access Tokens (Enhanced)

**Feature**: 005-ora-bisogna-implementare
**Version**: 2.0.0 (Enhanced from Feature 003)
**Base Path**: `/api/events/:eventId/tokens`

## Overview

Enhanced access token management with QR code generation, copy-to-clipboard support, and token revocation.

## Changes from Feature 003

1. **QR Code Generation**: New endpoint to generate QR codes for tokens
2. **Copy URL**: New endpoint to get formatted token URL for clipboard
3. **Token Revocation**: New endpoint to revoke tokens
4. **Enhanced List**: List endpoint now includes active/revoked status

## Authentication

All endpoints require authentication:
- **Admin**: Full access via Supabase Auth
- **Organizer token**: Can list and generate tokens for their events

**Headers**:
```
Authorization: Bearer {token_or_jwt}
```

## Endpoints

### 1. Generate Token

Generate a new access token for an event.

**Endpoint**: `POST /api/events/:eventId/tokens`

**Authentication**: Admin or Organizer

**Request**:
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
- **Body**:
```json
{
  "type": "participant",
  "expires_at": "2025-10-20T23:59:59Z"
}
```

**Field Validations**:
- `type`: Required, enum (`"organizer"` or `"participant"`)
- `expires_at`: Required, ISO 8601 timestamp (must be in future)

**Success Response** (201 Created):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "event_id": "650e8400-e29b-41d4-a716-446655440001",
  "token": "abc123xyz789def456ghi",
  "type": "participant",
  "expires_at": "2025-10-20T23:59:59Z",
  "created_at": "2025-10-08T14:30:00Z",
  "last_used_at": null,
  "use_count": 0,
  "is_active": true,
  "url": "https://{tenant}.sharehub.com/events/{slug}?token=abc123xyz789def456ghi"
}
```

**Notes**:
- Token is 21-character nanoid
- `url` is formatted for copy-to-clipboard
- `is_active` is computed: `revoked_at IS NULL AND expires_at > NOW()`

**Error Responses**:

- **422 Unprocessable Entity** (validation error):
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "expires_at",
      "message": "Expiration date must be in the future"
    }
  ]
}
```

- **403 Forbidden** (private event requirement):
```json
{
  "error": "Event is not private",
  "message": "Tokens can only be generated for private events"
}
```

---

### 2. List Tokens

Get all tokens for an event.

**Endpoint**: `GET /api/events/:eventId/tokens`

**Authentication**: Admin or Organizer

**Request**:
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
- **Query Parameters** (optional):
  - `status` (string): Filter by status (`"active"`, `"expired"`, `"revoked"`, `"all"`) - default: `"all"`

**Success Response** (200 OK):
```json
{
  "tokens": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "event_id": "650e8400-e29b-41d4-a716-446655440001",
      "token": "abc123xyz789def456ghi",
      "type": "participant",
      "expires_at": "2025-10-20T23:59:59Z",
      "created_at": "2025-10-08T14:30:00Z",
      "last_used_at": "2025-10-09T10:15:00Z",
      "use_count": 5,
      "revoked_at": null,
      "revoked_by": null,
      "is_active": true,
      "status": "active"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "event_id": "650e8400-e29b-41d4-a716-446655440001",
      "token": "xyz987abc321ghi654def",
      "type": "organizer",
      "expires_at": "2025-10-20T23:59:59Z",
      "created_at": "2025-10-07T12:00:00Z",
      "last_used_at": "2025-10-08T09:30:00Z",
      "use_count": 12,
      "revoked_at": "2025-10-08T14:00:00Z",
      "revoked_by": "750e8400-e29b-41d4-a716-446655440003",
      "is_active": false,
      "status": "revoked"
    }
  ],
  "total": 2,
  "active_count": 1,
  "revoked_count": 1,
  "expired_count": 0
}
```

**Status Values**:
- `"active"`: `revoked_at IS NULL AND expires_at > NOW()`
- `"expired"`: `revoked_at IS NULL AND expires_at <= NOW()`
- `"revoked"`: `revoked_at IS NOT NULL`

---

### 3. Get Token QR Code

Generate a QR code for a token.

**Endpoint**: `GET /api/events/:eventId/tokens/:tokenId/qr`

**Authentication**: Admin or Organizer

**Request**:
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
  - `tokenId` (UUID): Token identifier
- **Query Parameters** (optional):
  - `format` (string): QR code format (`"png"`, `"svg"`) - default: `"png"`
  - `size` (integer): QR code size in pixels (100-1000) - default: `300`

**Success Response** (200 OK):
```json
{
  "token_id": "880e8400-e29b-41d4-a716-446655440000",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "format": "png",
  "size": 300,
  "url": "https://{tenant}.sharehub.com/events/{slug}?token=abc123xyz789def456ghi"
}
```

**Notes**:
- QR code encodes the full token URL
- Data URL can be directly used in `<img src="...">`
- QR code is generated on-demand (not stored in database for now)

**Error Responses**:

- **404 Not Found**:
```json
{
  "error": "Token not found"
}
```

- **410 Gone** (token revoked or expired):
```json
{
  "error": "Token is no longer active",
  "status": "revoked",
  "revoked_at": "2025-10-08T14:00:00Z"
}
```

---

### 4. Get Token Copy URL

Get formatted URL for copy-to-clipboard.

**Endpoint**: `GET /api/events/:eventId/tokens/:tokenId/copy-url`

**Authentication**: Admin or Organizer

**Request**:
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
  - `tokenId` (UUID): Token identifier

**Success Response** (200 OK):
```json
{
  "token_id": "880e8400-e29b-41d4-a716-446655440000",
  "url": "https://acme-corp.sharehub.com/events/tech-summit-2025?token=abc123xyz789def456ghi",
  "token": "abc123xyz789def456ghi",
  "short_url": "https://acme-corp.sharehub.com/t/abc123xyz789def456ghi"
}
```

**Notes**:
- `url`: Full event URL with token parameter
- `token`: Token value only (for custom formatting)
- `short_url`: Shortened URL format (redirects to event page)
- Frontend copies `url` to clipboard and shows success toast

---

### 5. Revoke Token

Revoke an access token.

**Endpoint**: `POST /api/events/:eventId/tokens/:tokenId/revoke`

**Authentication**: Admin or Organizer

**Request**:
- **Path Parameters**:
  - `eventId` (UUID): Event identifier
  - `tokenId` (UUID): Token identifier

**Success Response** (200 OK):
```json
{
  "message": "Token revoked successfully",
  "token": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "token": "abc123xyz789def456ghi",
    "revoked_at": "2025-10-08T16:00:00Z",
    "revoked_by": "750e8400-e29b-41d4-a716-446655440003",
    "is_active": false
  }
}
```

**Business Rules**:
- Revoked tokens remain in database for audit purposes
- Cannot revoke already revoked token (idempotent - returns same response)
- Revocation is immediate - token validation fails immediately

**Error Responses**:

- **404 Not Found**:
```json
{
  "error": "Token not found"
}
```

---

### 6. Validate Token (Public)

Validate a token for event access.

**Endpoint**: `GET /api/tokens/validate`

**Authentication**: None (public endpoint)

**Request**:
- **Query Parameters**:
  - `token` (string): 21-character token value
  - `event_id` (UUID): Event identifier (optional, for extra validation)

**Success Response** (200 OK):
```json
{
  "valid": true,
  "token_id": "880e8400-e29b-41d4-a716-446655440000",
  "event_id": "650e8400-e29b-41d4-a716-446655440001",
  "type": "participant",
  "expires_at": "2025-10-20T23:59:59Z"
}
```

**Invalid Token Response** (200 OK):
```json
{
  "valid": false,
  "reason": "Token has been revoked",
  "revoked_at": "2025-10-08T14:00:00Z"
}
```

**Validation Rules**:
1. Token exists in database
2. Token not revoked (`revoked_at IS NULL`)
3. Token not expired (`expires_at > NOW()`)
4. If `event_id` provided, token belongs to that event

**Possible Reasons**:
- `"Token not found"`
- `"Token has been revoked"`
- `"Token has expired"`
- `"Token does not belong to this event"`

---

## QR Code Generation

### Library

Uses `qrcode` npm package:
```typescript
import QRCode from 'qrcode';

const generateTokenQR = async (
  url: string,
  format: 'png' | 'svg' = 'png',
  size: number = 300
): Promise<string> => {
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: size,
    margin: 1
  });
};
```

### Error Correction

- Level M (Medium): 15% error recovery
- Suitable for most use cases
- Balances size and reliability

---

## Copy-to-Clipboard Flow

### Frontend Implementation

```typescript
const copyTokenURL = async (tokenId: string) => {
  const response = await fetch(`/api/events/${eventId}/tokens/${tokenId}/copy-url`);
  const { url } = await response.json();

  await navigator.clipboard.writeText(url);

  toast.success('Token URL copied to clipboard!');
};
```

### URL Format

**Full URL**:
```
https://acme-corp.sharehub.com/events/tech-summit-2025?token=abc123xyz789def456ghi
```

**Short URL** (future enhancement):
```
https://acme-corp.sharehub.com/t/abc123xyz789def456ghi
```

---

## Token Revocation

### Database Update

```sql
UPDATE access_tokens
SET
  revoked_at = NOW(),
  revoked_by = $1
WHERE id = $2;
```

### Validation Query

```sql
SELECT *
FROM access_tokens
WHERE token = $1
  AND revoked_at IS NULL
  AND expires_at > NOW();
```

### Audit Trail

Revoked tokens remain in database with:
- `revoked_at`: Timestamp of revocation
- `revoked_by`: Admin/organizer who revoked it
- Visible in token list with `status: "revoked"`

---

## Example Usage Flow

### Scenario: Admin generates token, sends QR code to participant

1. **Generate participant token**:
```bash
POST /api/events/{eventId}/tokens
Body: { type: "participant", expires_at: "2025-10-20T23:59:59Z" }
→ 201 Created { id: token1, token: "abc123...", url: "https://..." }
```

2. **Get QR code**:
```bash
GET /api/events/{eventId}/tokens/{token1}/qr?size=500
→ 200 OK { qr_code: "data:image/png;base64,...", url: "https://..." }
```

3. **Frontend displays QR code**:
```html
<img src="data:image/png;base64,..." alt="Token QR Code" />
<button onclick="copyTokenURL()">Copy Link</button>
```

4. **Admin clicks "Copy Link"**:
```bash
GET /api/events/{eventId}/tokens/{token1}/copy-url
→ 200 OK { url: "https://acme-corp.sharehub.com/events/tech-summit-2025?token=abc123..." }
```

5. **Frontend copies URL to clipboard**:
```javascript
navigator.clipboard.writeText(url);
toast.success('Token URL copied to clipboard!');
```

6. **Participant uses token**:
```bash
GET /api/tokens/validate?token=abc123...&event_id={eventId}
→ 200 OK { valid: true, type: "participant" }
```

7. **Admin revokes token (e.g., participant left)**:
```bash
POST /api/events/{eventId}/tokens/{token1}/revoke
→ 200 OK { message: "Token revoked successfully", revoked_at: "..." }
```

8. **Participant tries to use revoked token**:
```bash
GET /api/tokens/validate?token=abc123...
→ 200 OK { valid: false, reason: "Token has been revoked" }
```

---

## Data Model Changes

### access_tokens table (updated schema)

```sql
ALTER TABLE access_tokens
ADD COLUMN qr_code_data_url TEXT NULL,
ADD COLUMN revoked_at TIMESTAMPTZ NULL,
ADD COLUMN revoked_by UUID REFERENCES admins(id);

COMMENT ON COLUMN access_tokens.qr_code_data_url IS 'Cached QR code data URL (optional, generated on-demand)';
COMMENT ON COLUMN access_tokens.revoked_at IS 'Timestamp when token was revoked (NULL = active)';
COMMENT ON COLUMN access_tokens.revoked_by IS 'Admin who revoked the token';
```

### Validation Function (PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION validate_access_token(token_value TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  reason TEXT,
  token_id UUID,
  event_id UUID,
  type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (revoked_at IS NULL AND expires_at > NOW()) AS valid,
    CASE
      WHEN revoked_at IS NOT NULL THEN 'Token has been revoked'
      WHEN expires_at <= NOW() THEN 'Token has expired'
      ELSE NULL
    END AS reason,
    id AS token_id,
    access_tokens.event_id,
    access_tokens.type
  FROM access_tokens
  WHERE token = token_value;
END;
$$ LANGUAGE plpgsql;
```

---

**Status**: Ready for implementation
