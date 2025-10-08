# API Contract: Event Dashboard

**Feature**: Event Management Dashboard
**Date**: 2025-10-08
**Format**: REST API

## Endpoint 1: Get Dashboard Data

### Request
```
GET /api/admin/events/:eventId/dashboard
```

**Path Parameters**:
- `eventId` (UUID, required): Event identifier

**Headers**:
- `Authorization: Bearer <supabase-jwt>` (required)

**Query Parameters**: None

### Response

**Success (200 OK)**:
```json
{
  "event": {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "string",
    "date": "2025-10-15",
    "slug": "string",
    "description": "string | null",
    "visibility": "public" | "private",
    "status": "draft" | "upcoming" | "ongoing" | "past",
    "created_by": "uuid",
    "created_at": "2025-10-08T10:00:00Z",
    "updated_at": "2025-10-08T10:00:00Z"
  },
  "tokens": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "token": "string (21 chars)",
      "type": "organizer" | "participant",
      "expires_at": "2025-12-31T23:59:59Z",
      "use_count": 42,
      "last_used_at": "2025-10-08T12:30:00Z | null",
      "created_at": "2025-10-08T10:00:00Z"
    }
  ],
  "sessions": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "title": "string",
      "start_time": "2025-10-15T09:00:00Z",
      "end_time": "2025-10-15T10:30:00Z",
      "room": "string | null",
      "created_at": "2025-10-08T10:00:00Z",
      "updated_at": "2025-10-08T10:00:00Z"
    }
  ],
  "speeches": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "title": "string",
      "speaker": "string",
      "description": "string | null",
      "slide_count": 12,
      "session": {
        "title": "string"
      },
      "created_at": "2025-10-08T10:00:00Z",
      "updated_at": "2025-10-08T10:00:00Z"
    }
  ],
  "photos": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "storage_path": "string",
      "caption": "string | null",
      "uploaded_at": "2025-10-08T10:00:00Z"
    }
  ],
  "metrics": {
    "pageViews": 1234,
    "slideDownloads": 567,
    "participantCount": 89,
    "lastRefreshed": "2025-10-08T14:55:00Z"
  }
}
```

**Error (403 Forbidden)** - Event not owned by admin's tenant:
```json
{
  "error": "Forbidden",
  "message": "You do not have access to this event"
}
```

**Error (404 Not Found)** - Event does not exist:
```json
{
  "error": "Not Found",
  "message": "Event not found"
}
```

**Error (401 Unauthorized)** - Missing or invalid auth token:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Validation Rules
1. `eventId` must be valid UUID format
2. Authenticated user must be admin with valid tenant
3. Event must belong to admin's tenant (RLS enforced)
4. For public events (visibility='public'), `tokens` array will be empty
5. All timestamps in ISO 8601 format with timezone

### Business Rules
- Tokens only returned for private events
- Sessions ordered by start_time ascending
- Speeches include parent session title for display
- Photos ordered by uploaded_at descending
- Metrics are cached (may be up to 5 minutes stale)

### Performance SLA
- Response time: < 2s (p95)
- Timeout: 10s
- Rate limit: 100 req/min per user

---

## Endpoint 2: Generate Token QR Code

### Request
```
GET /api/admin/events/:eventId/tokens/:tokenId/qr
```

**Path Parameters**:
- `eventId` (UUID, required): Event identifier
- `tokenId` (UUID, required): Token identifier

**Headers**:
- `Authorization: Bearer <supabase-jwt>` (required)

**Query Parameters**: None

### Response

**Success (200 OK)**:
```
Content-Type: image/png
Content-Disposition: attachment; filename="participant-token-{slug}.png"

<PNG binary data>
```

**PNG Specifications**:
- Format: PNG (image/png)
- Dimensions: 300x300 pixels
- Error correction: Medium (M level)
- Margin: 2 modules
- Content: `https://{FRONTEND_URL}/events/{slug}?token={token}`

**Error (403 Forbidden)** - Token not owned by admin's tenant or wrong type:
```json
{
  "error": "Forbidden",
  "message": "You do not have access to this token or QR generation is only available for participant tokens"
}
```

**Error (404 Not Found)** - Token does not exist:
```json
{
  "error": "Not Found",
  "message": "Token not found"
}
```

**Error (401 Unauthorized)** - Missing or invalid auth token:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Validation Rules
1. `eventId` and `tokenId` must be valid UUID format
2. Token must belong to specified event
3. Token must be type='participant' (organizer tokens cannot generate QR)
4. Event must belong to admin's tenant (RLS enforced)
5. Token must not be expired

### Business Rules
- QR codes encode full event access URL with token parameter
- Filename includes event slug for easy identification
- QR code content includes tenant-specific frontend URL
- Download triggers browser save dialog (Content-Disposition: attachment)

### Performance SLA
- Response time: < 500ms (p95)
- QR generation: < 200ms
- File size: ~2-5KB (typical PNG)
- Rate limit: 50 req/min per user

---

## Security Considerations

### Authentication
- All endpoints require valid Supabase JWT
- JWT must contain valid admin user ID
- Token expiration checked on every request

### Authorization (RLS)
- Event access filtered by admin's tenant_id
- Token access filtered through event → tenant relationship
- No cross-tenant data leakage possible

### Input Validation
- UUIDs validated format before database queries
- Path parameters sanitized to prevent injection
- File generation limits prevent DoS (max 300x300px QR)

### Audit Logging
- Dashboard access logged to activity_logs table
- QR downloads tracked in token usage metrics
- Failed authorization attempts logged for security monitoring

---

## Contract Test Scenarios

### Test 1: Dashboard Returns Complete Data
```typescript
describe('GET /api/admin/events/:eventId/dashboard', () => {
  it('returns complete dashboard data for owned event', async () => {
    const response = await request(app)
      .get(`/api/admin/events/${testEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('event');
    expect(response.body).toHaveProperty('tokens');
    expect(response.body).toHaveProperty('sessions');
    expect(response.body).toHaveProperty('speeches');
    expect(response.body).toHaveProperty('photos');
    expect(response.body).toHaveProperty('metrics');
    expect(response.body.metrics).toHaveProperty('pageViews');
  });
});
```

### Test 2: Dashboard Enforces Tenant Isolation
```typescript
it('returns 403 for event from different tenant', async () => {
  const response = await request(app)
    .get(`/api/admin/events/${otherTenantEventId}/dashboard`)
    .set('Authorization', `Bearer ${adminToken}`);

  expect(response.status).toBe(403);
  expect(response.body.error).toBe('Forbidden');
});
```

### Test 3: QR Returns Valid PNG
```typescript
describe('GET /api/admin/events/:eventId/tokens/:tokenId/qr', () => {
  it('generates valid PNG QR code for participant token', async () => {
    const response = await request(app)
      .get(`/api/admin/events/${testEventId}/tokens/${participantTokenId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(1000); // Valid PNG should be >1KB
  });
});
```

### Test 4: QR Rejects Organizer Tokens
```typescript
it('returns 403 for organizer token QR request', async () => {
  const response = await request(app)
    .get(`/api/admin/events/${testEventId}/tokens/${organizerTokenId}/qr`)
    .set('Authorization', `Bearer ${adminToken}`);

  expect(response.status).toBe(403);
  expect(response.body.message).toContain('participant tokens');
});
```

---

## Change Log

**v1.0 (2025-10-08)**: Initial contract definition
- Dashboard aggregation endpoint
- QR generation endpoint
- Full contract test specifications
