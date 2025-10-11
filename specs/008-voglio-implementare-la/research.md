# Research: Cloudflare R2 Integration with Next.js

**Feature**: 008-voglio-implementare-la
**Date**: 2025-10-11

## Research Questions

### 1. Cloudflare R2 Presigned URL Generation

**Question**: How to generate presigned URLs for R2 using AWS SDK?

**Answer**: R2 is S3-compatible, use AWS SDK v3 with R2 endpoint:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize client with R2 endpoint
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Generate presigned upload URL
async function generateUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
}

// Generate presigned download URL
async function generateDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
}
```

**Key Decisions**:
- Use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- Region must be `'auto'` for R2
- Endpoint format: `https://{accountId}.r2.cloudflarestorage.com`
- Expiry: 1 hour (3600 seconds) for both upload and download

---

### 2. Netlify Scheduled Functions

**Question**: How to configure cron jobs on Netlify?

**Answer**: Use Netlify Scheduled Functions in `netlify.toml`:

```toml
[[functions]]
  path = "/api/cleanup"
  schedule = "0 */6 * * *"  # Every 6 hours
```

**Alternative Configuration**:
```toml
[functions]
  external_node_modules = ["@aws-sdk/client-s3"]
  node_bundler = "esbuild"

[[functions]]
  path = "/api/cleanup"
  schedule = "@every 6h"  # Simplified cron syntax
```

**Cron Syntax**:
- `0 */6 * * *` = Every 6 hours at minute 0
- `@every 6h` = Every 6 hours (simplified syntax)
- `0 0 * * *` = Daily at midnight
- `0 */3 * * *` = Every 3 hours

**Key Decisions**:
- Use `schedule` field in `netlify.toml`
- Run every 6 hours to ensure 48h retention
- Function must be in `/api/` directory for Next.js App Router
- No special authentication needed (internal trigger)

---

### 3. Next.js API Routes for File Operations

**Question**: Best practices for Next.js 14 App Router API routes?

**Answer**: Use Route Handlers in `app/api/` directory:

```typescript
// app/api/slides/presigned-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, filename, file_size, mime_type } = body;

    // Validate inputs
    if (file_size > 1073741824) { // 1GB
      return NextResponse.json(
        { error: 'File size exceeds limit' },
        { status: 400 }
      );
    }

    // Generate presigned URL
    const uploadUrl = await generateUploadUrl(r2Key, mime_type);

    return NextResponse.json({
      upload_url: uploadUrl,
      slide_id: slideId,
      r2_key: r2Key,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

export const runtime = 'edge'; // Optional: Use Edge Runtime for faster responses
```

**Key Decisions**:
- Use `NextRequest` and `NextResponse` from `next/server`
- File structure: `app/api/{resource}/{action}/route.ts`
- Export HTTP method functions: `GET`, `POST`, `PUT`, `DELETE`
- Use `runtime = 'edge'` for URL generation (fast, no file processing)
- Error handling with proper HTTP status codes

---

### 4. R2 Bucket Configuration

**Question**: What CORS and access settings for R2?

**Answer**: Configure via Cloudflare Dashboard:

**CORS Configuration**:
```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Bucket Policy**:
- No public access (presigned URLs only)
- Bucket listing: disabled
- Public read: disabled
- All access via signed URLs

**R2 Key Structure**:
```
tenant-{tenant_id}/event-{event_id}/slide-{slide_id}.{extension}
```

Example: `tenant-abc123/event-xyz789/slide-uuid123.pdf`

**Key Decisions**:
- CORS required for direct browser uploads
- Allow localhost for development
- No public bucket access (security)
- Hierarchical key structure for organization

---

### 5. Migration Strategy for Existing Slides

**Question**: How to handle slides already in current storage?

**Answer**: **Out of scope** - keep dual storage temporarily:

**Approach**:
1. New uploads → R2 only
2. Existing slides → remain on current storage
3. Download logic checks: if `r2_key` exists, use R2; else use old storage
4. Future migration: optional background job (not in this feature)

**Code Pattern**:
```typescript
async function getDownloadUrl(slideId: string): Promise<string> {
  const slide = await getSlideMetadata(slideId);

  if (slide.r2_key) {
    // New: Use R2
    return generateR2DownloadUrl(slide.r2_key);
  } else {
    // Legacy: Use old storage
    return getLegacyDownloadUrl(slideId);
  }
}
```

**Key Decisions**:
- No data migration in this feature (too risky)
- Dual storage supported during transition
- All new uploads use R2
- Existing functionality unaffected

---

## Implementation Checklist

- [x] R2 SDK researched (@aws-sdk/client-s3 + s3-request-presigner)
- [x] Netlify Scheduled Functions syntax documented
- [x] Next.js API Routes patterns established
- [x] R2 CORS configuration defined
- [x] Migration strategy: no migration (dual storage)

---

## Dependencies to Install

```bash
cd frontend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Environment Variables Required

```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=sharehub-slides
```

---

**Next Steps**: Create data-model.md and contracts/
