# shareHub Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-06

## Active Technologies
- TypeScript 5.3+ (Node.js 20 LTS for backend, React 18 for frontend) + Next.js 14 (frontend), Express.js (backend API), Supabase (database + auth), Tailwind CSS (styling) (001-voglio-creare-l)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) (002-facciamo-tutti-gli)
- Supabase PostgreSQL with RLS policies, Supabase Storage for logo files (002-facciamo-tutti-gli)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Express.js (backend), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling) (003-ora-facciamo-il)
- Supabase PostgreSQL with RLS policies, Supabase Storage for slide files (003-ora-facciamo-il)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Express.js (backend API), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling), archiver (ZIP generation) (004-facciamo-la-pagina)
- Supabase PostgreSQL with existing RLS policies (005-ora-facciamo-la)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Next.js 14 App Router, Tailwind CSS 3.x, Lucide React, Supabase Client (007-voglio-che-l)
- Supabase PostgreSQL (existing schema unchanged), Supabase Storage (for tenant logos) (007-voglio-che-l)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Next.js 14 App Router (frontend), CloudConvert API SDK, Supabase Client, Cloudflare R2 SDK, Email service (for failure notifications) (009-voglio-implementare-la)
- Supabase PostgreSQL (database), Cloudflare R2 (thumbnail storage), existing slide storage in R2 (009-voglio-implementare-la)

## Project Structure
```
backend/
frontend/
tests/
```

## Commands
npm test; npm run lint

## Code Style
TypeScript 5.3+ (Node.js 20 LTS for backend, React 18 for frontend): Follow standard conventions

## Recent Changes
- 009-voglio-implementare-la: Added TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Next.js 14 App Router (frontend), CloudConvert API SDK, Supabase Client, Cloudflare R2 SDK, Email service (for failure notifications)
- 007-voglio-che-l: Added TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Next.js 14 App Router, Tailwind CSS 3.x, Lucide React, Supabase Client
- 005-ora-facciamo-la: Added TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)

<!-- MANUAL ADDITIONS START -->

## Feature-Specific Patterns (002-facciamo-tutti-gli)

### Dynamic Branding with CSS Custom Properties
**Pattern**: Tenant-specific theming using CSS variables
**Location**: `frontend/src/contexts/TenantContext.tsx`

```typescript
// Apply branding dynamically to DOM
const applyBrandingToDOM = (branding: Branding) => {
  document.documentElement.style.setProperty('--color-primary', branding.primary_color);
  document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
};

// Use in Tailwind: bg-[var(--color-primary)]
```

**Benefits**:
- No runtime style recompilation
- Works with SSR
- Native CSS feature (no extra libs)
- Applies globally across all pages

### File Upload with Dual Validation
**Pattern**: Client + server validation for security
**Location**: `frontend/src/components/admin/LogoUpload.tsx`, `backend/src/routes/branding.ts`

**Client-side** (immediate feedback):
```typescript
const validateFile = (file: File): string | null => {
  if (file.size > 2 * 1024 * 1024) return 'File too large';
  if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) return 'Invalid type';
  return null;
};
```

**Server-side** (security):
```typescript
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});
```

**Benefits**: Defense in depth, better UX

### URL-Based State for Filtering/Sorting
**Pattern**: Shareable filter state via URL search params
**Location**: `frontend/src/components/admin/EventList.tsx`, `/admin/events/page.tsx`

```typescript
// Read params
const searchParams = useSearchParams();
const sort = searchParams.get('sort') || 'date-asc';
const filter = searchParams.get('filter') || 'all';

// Update params
const updateSort = (newSort: string) => {
  const params = new URLSearchParams(searchParams);
  params.set('sort', newSort);
  router.push(`?${params.toString()}`);
};
```

**Benefits**:
- Bookmarkable views
- Browser back/forward works
- SEO-friendly
- State persists on refresh

### Event Editing with Date-Based Constraints
**Pattern**: Business logic enforcement (past events read-only)
**Location**: `backend/src/services/eventService.ts`, RLS policies

```typescript
// Backend validation
if (event.event_date < new Date().toISOString().split('T')[0]) {
  throw new Error('Cannot edit past events');
}

// Frontend read-only mode
const isReadOnly = event.status === 'past' || event.event_date < today;
<EventForm mode="edit" isReadOnly={isReadOnly} />
```

**RLS Policy**:
```sql
CREATE POLICY "admin_can_edit_future_events" ON events FOR UPDATE
USING (event_date >= CURRENT_DATE AND tenant_id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));
```

**Benefits**: Enforced at DB, API, and UI levels

### Supabase Storage with RLS for Multi-Tenant Files
**Pattern**: Tenant-isolated file storage with public access
**Location**: `backend/src/services/brandingService.ts`

```typescript
// Upload to tenant-scoped path
const filePath = `logos/${tenantId}/${Date.now()}-${file.originalname}`;
const { data, error } = await supabase.storage
  .from('logos')
  .upload(filePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });

// RLS ensures only tenant admins can upload/delete
// But all users can view (public bucket)
```

**Benefits**: Data isolation + public accessibility

### Shared Form Component Pattern
**Pattern**: Reusable form for create/edit modes
**Location**: `frontend/src/components/admin/EventForm.tsx`

```typescript
interface EventFormProps {
  mode: 'create' | 'edit';
  initialData?: Event;
  onSubmit: (data: EventCreateInput | EventUpdateInput) => void;
  isReadOnly?: boolean;
}

// Conditional logic based on mode
const submitLabel = mode === 'create' ? 'Create Event' : 'Save Changes';
const defaultValues = mode === 'edit' ? initialData : {};
```

**Benefits**: DRY, consistent validation, easier maintenance

## Feature-Specific Patterns (004-facciamo-la-pagina)

### Public Event Access with RLS Token Validation
**Pattern**: Dual RLS policies for public/private event access
**Location**: `backend/migrations/004-public-read-policies.sql`, `backend/src/services/publicEventService.ts`

**RLS Policies**:
```sql
-- Public events accessible to all
CREATE POLICY "public_events_read" ON events FOR SELECT
USING (visibility = 'public');

-- Private events require valid token
CREATE POLICY "private_events_read_with_token" ON events FOR SELECT
USING (
  visibility = 'private' AND id IN (
    SELECT event_id FROM access_tokens
    WHERE id = app.current_token_id() AND expires_at > NOW()
  )
);
```

**Token Validation Function**:
```typescript
export async function validateToken(slug: string, token: string) {
  // Validate format (21 characters)
  if (!token || token.length !== 21) {
    return { valid: false, message: 'Token must be exactly 21 characters' };
  }

  // Check token in database
  const { data: tokenData } = await supabase
    .from('access_tokens')
    .select('id, token_type, expires_at')
    .eq('token', token)
    .eq('event_id', event.id)
    .single();

  // Update usage tracking
  await supabase.from('access_tokens').update({
    last_used_at: new Date().toISOString(),
    use_count: supabase.rpc('increment', { row_id: tokenData.id })
  });

  return { valid: true, token_id: tokenData.id };
}
```

**Benefits**: Database-level access control, automatic token tracking

### ZIP Streaming for Large File Downloads
**Pattern**: Stream ZIP generation without memory buffering
**Location**: `backend/src/services/zipGenerationService.ts`

```typescript
import archiver from 'archiver';

export async function generateSpeechZip(speechId: string, res: Response) {
  // Set response headers for ZIP download
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.zip"`);

  // Create streaming ZIP archive
  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(res);

  // Add files one by one
  for (const slide of slides) {
    const { data: signedUrlData } = await supabase.storage
      .from('slides')
      .createSignedUrl(slide.storage_path, 60);
    const response = await fetch(signedUrlData.signedUrl);
    const buffer = await response.buffer();
    archive.append(buffer, { name: slide.filename });
  }

  await archive.finalize();
}
```

**Benefits**: Handles large file sets, low memory usage, streaming response

### Rate Limiting for Public API Endpoints
**Pattern**: express-rate-limit with IP-based throttling
**Location**: `backend/src/middleware/downloadRateLimit.ts`

```typescript
export const downloadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour per IP
  message: {
    error: 'Too many download requests',
    message: 'You have exceeded the download limit. Please try again later.'
  },
  standardHeaders: true, // Return rate limit info in headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many download requests',
      retryAfter: Math.ceil(60 * 60)
    });
  }
});
```

**Usage in routes**:
```typescript
router.get('/slides/:id/download', downloadRateLimit, async (req, res) => {
  // Download logic
});
```

**Benefits**: Prevents abuse, automatic retry-after headers, per-IP tracking

### Server Components with Error Boundaries
**Pattern**: Next.js Server Components with typed error handling
**Location**: `frontend/src/app/events/[slug]/page.tsx`

```typescript
export default async function PublicEventPage({ params, searchParams }: PageProps) {
  try {
    const eventData = await fetchPublicEvent(params.slug, searchParams.token);

    return (
      <div className="min-h-screen bg-gray-50">
        <EventHeader event={eventData.event} />
        <PublicMetrics slug={params.slug} initialMetrics={eventData.metrics} />
        <SessionList sessions={eventData.sessions} />
      </div>
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle specific error types
    if (errorMessage.includes('private event')) {
      return <TokenForm slug={params.slug} />;
    }
    if (errorMessage.includes('not found')) {
      notFound(); // Next.js 404 page
    }

    // Generic error UI
    return <ErrorDisplay message={errorMessage} />;
  }
}
```

**Benefits**: Type-safe error handling, proper HTTP status codes, SEO-friendly

### sessionStorage for Client-Side Token Persistence
**Pattern**: Browser storage for temporary auth tokens
**Location**: `frontend/src/components/public/TokenForm.tsx`

```typescript
const handleSuccess = (tokenId: string) => {
  // Store token in sessionStorage (cleared on tab close)
  sessionStorage.setItem(`event-token-${slug}`, token);
  sessionStorage.setItem(`event-token-id-${slug}`, tokenId);

  // Redirect with token in URL for server-side validation
  router.push(`/events/${slug}?token=${token}`);
};
```

**Benefits**: Persists across page refreshes, auto-clears on tab close, no cookies needed

## Testing Patterns

### Integration Tests with Real Database
**Location**: `backend/tests/integration/*.test.ts`

- Tests use actual Supabase instance (not mocked)
- Verify both API response AND database state
- Proper cleanup in afterAll hooks
- 58 test cases covering all flows

### Performance Validation Framework
**Location**: `PERFORMANCE_VALIDATION.md`

Targets:
- Page load: < 1s
- Event list (100 events): < 2s render
- API responses: < 500ms
- Logo upload (1.5MB): < 10s

## Commands Reference

```bash
# Backend
cd backend
npm run dev              # Start dev server (port 3001)
npm test                 # Run all tests
npm test tests/integration  # Run integration tests only
npm run lint             # Lint code

# Frontend
cd frontend
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # Lint code

# Database
# Apply migrations via Supabase Dashboard SQL Editor
# See backend/migrations/002_admin_screens.sql
```

## Troubleshooting

### Branding not applying after update
- Check TenantContext is providing branding
- Verify CSS custom properties in DOM inspector
- Ensure `applyBrandingToDOM()` called after update

### File upload fails with 413
- Check Multer limits configuration
- Verify nginx `client_max_body_size` if behind proxy

### RLS policy blocks query
- Verify admin user has correct tenant_id in admins table
- Check auth token is valid and not expired
- Ensure RLS is enabled on table

### Event list not updating after sort/filter
- Check URL params are updating (`useSearchParams`)
- Verify `useEffect` dependency includes `searchParams`
- Ensure backend supports query params

## Drag and Drop File Upload Pattern

### Reusable FileDropzone Component
**Pattern**: Drag-and-drop file upload with validation
**Location**: `frontend/src/components/common/FileDropzone.tsx`

```typescript
<FileDropzone
  onFilesSelected={(files) => handleUpload(files)}
  accept="image/jpeg,image/png"
  multiple={true}
  maxSize={50 * 1024 * 1024}
  disabled={uploading}
/>
```

**Features**:
- Drag and drop + click to upload
- Client-side validation (file type, size)
- Visual feedback on drag over
- Error messages with auto-hide
- Support for single/multiple files
- Customizable accept types
- File size validation with human-readable messages

**Usage in components**:
- `EventPhotoManager` - Photo uploads (JPEG/PNG/WebP, 50MB)
- `SlideUpload` - Presentation files (PDF/PPT/PPTX, 100MB)
- `LogoUpload` - Branding logos (JPEG/PNG/SVG, 2MB)

**Benefits**: Consistent UX, reusable validation, better accessibility

## Feature-Specific Patterns (008-voglio-implementare-la)

### Serverless Architecture with Cloudflare R2
**Pattern**: Direct client-to-storage uploads/downloads using presigned URLs
**Location**: `frontend/src/lib/r2.ts`, `frontend/src/app/api/slides/`

**Architecture**:
```
Client → Next.js API Route → Presigned URL → Direct R2 Upload/Download
   ↓
Supabase (metadata only: r2_key, file_size, mime_type)
```

**Key Benefits**:
- No backend proxy (zero bandwidth costs)
- Files up to 1GB (vs 100MB with proxied uploads)
- CDN-powered downloads (global edge caching)
- 99% cost reduction ($15/month → $0.15/month)

### R2 Client with Error Handling
**Pattern**: AWS SDK S3Client wrapper with custom error classes
**Location**: `frontend/src/lib/r2.ts`

```typescript
// Initialize R2 client (singleton)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Generate presigned upload URL
export async function generatePresignedUploadUrl(
  r2Key: string,
  contentType: string,
  expirySeconds: number = 3600
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: r2Key,
      ContentType: contentType,
    });

    return await getSignedUrl(r2Client, command, { expiresIn: expirySeconds });
  } catch (error) {
    // Handle specific errors: network, credentials, bucket, quota
    if (errorMessage.includes('network')) {
      throw new R2UploadError('Network error: Unable to connect to R2');
    }
    // ... other error handling
  }
}
```

**Custom Error Classes**:
- `R2ConfigError` - Missing or invalid environment variables
- `R2UploadError` - Upload URL generation failures
- `R2DownloadError` - Download URL generation failures (file not found, etc.)
- `R2DeleteError` - Deletion failures (permissions, network)

**Error Types Handled**:
- Network errors (ENOTFOUND, ECONNREFUSED)
- Credentials errors (InvalidAccessKeyId, access denied)
- Bucket errors (NoSuchBucket, wrong bucket name)
- Object errors (NoSuchKey, file not found)
- Quota errors (storage limit exceeded)
- Permission errors (missing delete permissions)

**Benefits**: Clear error messages for debugging, user-friendly error handling

### R2 Key Generation with Tenant Isolation
**Pattern**: Hierarchical object keys for multi-tenant security
**Location**: `frontend/src/lib/r2.ts:generateR2Key()`

```typescript
// Format: tenant-{uuid}/event-{uuid}/slide-{uuid}.{ext}
export function generateR2Key(
  tenantId: string,
  eventId: string,
  slideId: string,
  filename: string
): string {
  const extension = filename.split('.').pop()?.toLowerCase() || 'bin';
  return `tenant-${tenantId}/event-${eventId}/slide-${slideId}.${extension}`;
}

// Example: tenant-550e8400/event-6ba7b810/slide-f47ac10b.pdf
```

**Benefits**:
- Tenant isolation at storage level
- Easy to query/delete by tenant or event
- Prevents filename collisions
- Preserves original file extension

### Presigned URL Upload Flow
**Pattern**: Two-phase upload (generate URL → direct upload)
**Location**: `frontend/src/app/api/slides/presigned-upload/route.ts`

**Phase 1: Generate Presigned URL** (Next.js API Route)
```typescript
// POST /api/slides/presigned-upload
export async function POST(request: NextRequest) {
  const { filename, fileSize, mimeType, speechId } = await request.json();

  // Validate file
  if (!R2.validateFileType(mimeType)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Generate R2 key with tenant isolation
  const r2Key = R2.generateKey(tenantId, eventId, slideId, filename);

  // Generate presigned upload URL (expires in 1 hour)
  const uploadUrl = await R2.generateUploadUrl(r2Key, mimeType);

  // Save metadata to database
  await supabase.from('slides').insert({
    id: slideId,
    r2_key: r2Key,
    filename,
    file_size: fileSize,
    mime_type: mimeType,
    // storage_path: null (not using Supabase Storage)
  });

  return NextResponse.json({ uploadUrl, slideId });
}
```

**Phase 2: Client Direct Upload**
```typescript
// Client-side upload using presigned URL
const response = await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': mimeType },
  body: file, // File object from <input type="file">
});

if (response.ok) {
  console.log('Upload complete! File is on R2.');
}
```

**Benefits**:
- Backend only generates URLs (fast, <500ms)
- Client uploads directly to R2 (no bandwidth costs)
- Presigned URLs expire after 1 hour (security)
- Metadata saved before upload (prevents orphaned files)

### Presigned URL Download Flow
**Pattern**: Generate download URL on-demand
**Location**: `frontend/src/app/api/slides/[id]/download/route.ts`

```typescript
// GET /api/slides/:id/download
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Fetch slide metadata from database
  const { data: slide } = await supabase
    .from('slides')
    .select('r2_key, filename')
    .eq('id', params.id)
    .single();

  if (!slide.r2_key) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Generate presigned download URL (expires in 1 hour)
  const downloadUrl = await R2.generateDownloadUrl(slide.r2_key);

  // Track download metrics (async, don't block)
  trackDownload(params.id).catch(console.error);

  // Redirect to presigned URL
  return NextResponse.redirect(downloadUrl);
}
```

**Benefits**:
- Downloads served directly from R2 CDN
- URLs expire after 1 hour (security)
- No backend bandwidth costs
- Automatic download metrics tracking

### Netlify Scheduled Functions for Cleanup
**Pattern**: Cron-based serverless function for 48-hour retention
**Location**: `frontend/src/app/api/cleanup/route.ts`, `netlify.toml`

**Configure Schedule in netlify.toml**:
```toml
[functions]
  directory = ".netlify/functions"

[[functions]]
  path = "/api/cleanup"
  schedule = "0 */6 * * *"  # Every 6 hours
```

**Cleanup API Route**:
```typescript
// POST /api/cleanup (triggered by Netlify scheduler)
export async function POST(request: NextRequest) {
  const RETENTION_HOURS = 48;
  const cutoffTime = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);

  // Query expired slides using Supabase with service role key
  const { data: expiredSlides } = await supabase
    .from('slides')
    .select('id, r2_key')
    .lt('uploaded_at', cutoffTime.toISOString())
    .is('deleted_at', null)
    .not('r2_key', 'is', null);

  // Delete from R2 and mark as deleted in database
  for (const slide of expiredSlides) {
    try {
      await R2.deleteObject(slide.r2_key); // Delete from R2
      await supabase
        .from('slides')
        .update({ deleted_at: new Date() })
        .eq('id', slide.id); // Soft delete in DB
    } catch (error) {
      console.error(`Failed to delete slide ${slide.id}:`, error);
      // Continue processing other slides
    }
  }

  return NextResponse.json({
    deleted_count: deletedSlides.length,
    execution_time_ms: Date.now() - startTime,
  });
}

// IMPORTANT: Use service role key to bypass RLS
export const runtime = 'nodejs';
export const maxDuration = 10; // Allow up to 10 seconds
```

**Benefits**:
- Automatic 48-hour retention (no manual cleanup)
- Runs every 6 hours (configurable)
- Soft deletes (can restore if needed)
- Error handling (continues on individual failures)
- Execution time tracking

### Soft Deletes with deleted_at Column
**Pattern**: Mark files as deleted instead of hard delete
**Location**: Database migration 009, cleanup route

```sql
-- Add soft delete column
ALTER TABLE slides ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Query active slides (exclude soft-deleted)
SELECT * FROM slides WHERE deleted_at IS NULL;

-- Soft delete slide
UPDATE slides SET deleted_at = NOW() WHERE id = 'slide-uuid';

-- Hard delete after retention period (optional)
DELETE FROM slides WHERE deleted_at < NOW() - INTERVAL '90 days';
```

**Benefits**:
- Can restore deleted files if needed
- Audit trail (when file was deleted)
- Queries exclude soft-deleted automatically
- Database cleanup separate from R2 cleanup

### Backward Compatibility with Dual Storage
**Pattern**: Support both Supabase Storage and R2 in same codebase
**Location**: Database schema, download route

**Database Schema**:
```sql
-- Slide can have either storage_path (old) OR r2_key (new)
ALTER TABLE slides ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE slides ADD CONSTRAINT slides_storage_location_check
  CHECK ((storage_path IS NOT NULL) OR (r2_key IS NOT NULL));
```

**Download Route Logic**:
```typescript
// GET /api/slides/:id/download
const { data: slide } = await supabase
  .from('slides')
  .select('storage_path, r2_key')
  .eq('id', slideId)
  .single();

// Check which storage system this slide uses
if (slide.r2_key) {
  // New: Generate presigned R2 URL
  const downloadUrl = await R2.generateDownloadUrl(slide.r2_key);
  return NextResponse.redirect(downloadUrl);
} else if (slide.storage_path) {
  // Old: Use Supabase Storage
  const { data } = await supabase.storage
    .from('slides')
    .createSignedUrl(slide.storage_path, 3600);
  return NextResponse.redirect(data.signedUrl);
}
```

**Benefits**:
- Zero-downtime migration (both systems work)
- Old slides remain accessible
- New uploads use R2 automatically
- Can migrate old slides gradually

### File Validation with Type Guards
**Pattern**: Client + server file validation
**Location**: `frontend/src/lib/r2.ts`, upload component

```typescript
// Allowed MIME types (server-side source of truth)
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export const MAX_FILE_SIZE = 1073741824; // 1GB

// Validation functions
export function validateFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

export function validateFileSize(fileSize: number): boolean {
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE;
}

// Error messages
export function getFileTypeError(mimeType: string): string {
  return `File type "${mimeType}" not allowed. Use: PDF, PPT, PPTX`;
}

export function getFileSizeError(fileSize: number): string {
  const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  return `File size ${sizeMB}MB exceeds 1GB limit`;
}
```

**Client-side validation** (immediate feedback):
```typescript
const handleFileSelect = (file: File) => {
  if (!R2.validateFileType(file.type)) {
    setError(R2.getFileTypeError(file.type));
    return;
  }
  if (!R2.validateFileSize(file.size)) {
    setError(R2.getFileSizeError(file.size));
    return;
  }
  uploadFile(file);
};
```

**Server-side validation** (security):
```typescript
// API route validates before generating presigned URL
if (!R2.validateFileType(mimeType)) {
  return NextResponse.json(
    { error: R2.getFileTypeError(mimeType) },
    { status: 400 }
  );
}
```

**Benefits**:
- Defense in depth (client + server)
- Consistent error messages
- Type-safe MIME type checks
- Human-readable size errors

### Next.js Runtime Configuration
**Pattern**: Configure Next.js API routes for R2 operations
**Location**: All `frontend/src/app/api/*/route.ts` files

```typescript
// Export runtime configuration at end of route file

// Use Node.js runtime (required for AWS SDK)
export const runtime = 'nodejs'; // Not 'edge'

// Set max duration for long operations (cleanup, large uploads)
export const maxDuration = 10; // 10 seconds (default is 5)

// For quick operations (presigned URL generation)
export const maxDuration = 5; // 5 seconds
```

**Why Node.js runtime:**
- AWS SDK requires Node.js APIs (not available in Edge runtime)
- R2 operations need full Node.js crypto support
- Supabase client works best with Node.js runtime

**Why maxDuration matters:**
- Cleanup may process many slides (needs 10s)
- Presigned URL generation is fast (5s is enough)
- Netlify free tier allows up to 10s per function

**Benefits**: Prevents timeouts, optimizes for operation type

## R2 Troubleshooting Patterns

### R2 Connection Errors
**Pattern**: Test script for validating R2 credentials
**Location**: `frontend/test-r2-config.js`

```javascript
// Quick test to verify R2 configuration
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const testR2Config = async () => {
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const command = new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME,
    MaxKeys: 1,
  });

  await r2Client.send(command);
  console.log('✅ R2 connection successful!');
};
```

**Common Errors:**
- `NoSuchBucket` → Bucket name wrong or doesn't exist
- `InvalidAccessKeyId` → Access key is invalid
- `SignatureDoesNotMatch` → Secret key is wrong
- `getaddrinfo ENOTFOUND` → Account ID is wrong

**Benefits**: Quick validation before deployment

### CORS Configuration for R2
**Pattern**: Allow direct client uploads from browser
**Location**: Cloudflare Dashboard → R2 → Bucket Settings

```json
[
  {
    "AllowedOrigins": [
      "https://your-app.netlify.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

**IMPORTANT**:
- Add production domain (Netlify URL)
- Add localhost for development
- Must include `PUT` for uploads
- `DELETE` needed for cleanup function

**Benefits**: Prevents CORS errors on upload/download

## Feature-Specific Patterns (009-voglio-implementare-la)

### Async Processing with Webhook Architecture
**Pattern**: Non-blocking thumbnail generation using external API with webhook completion
**Location**: `frontend/src/services/cloudConvertService.ts`, `/api/webhooks/cloudconvert/route.ts`

**Flow**:
```
Client Upload → API Initiate (202 Accepted) → CloudConvert Queue → [2-5 min]
                                                                      ↓
                                                            Webhook Callback
                                                                      ↓
                                                        Download → Upload to R2 → Update DB → Realtime UI
```

**Initiation** (`cloudConvertService.ts`):
```typescript
export async function initiateThumbnailGeneration({
  slideId,
  tenantId,
  eventId,
}: GenerateThumbnailParams): Promise<ThumbnailGenerationResult> {
  // 1. Check and increment quota atomically
  const quotaResult = await supabase.rpc('check_and_increment_thumbnail_quota', {
    p_tenant_id: tenantId,
    p_event_id: eventId,
  });

  if (!quotaResult.success) {
    return { success: false, status: 'quota_exhausted', message: 'Quota exhausted' };
  }

  try {
    // 2. Generate R2 download URL for CloudConvert
    const downloadUrl = await generatePresignedDownloadUrl(slide.r2_key, 3600);

    // 3. Create CloudConvert job
    const job = await cloudConvert.jobs.create({
      tasks: {
        import: { operation: 'import/url', url: downloadUrl },
        convert: {
          operation: 'convert',
          input: ['import'],
          output_format: 'jpg',
          page_range: '1-1', // First slide only
        },
        export: { operation: 'export/url', input: ['convert'] },
      },
      webhook_url: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/cloudconvert`,
    });

    // 4. Save job to database
    await supabase.from('cloudconvert_jobs').insert({
      cloudconvert_job_id: job.id,
      slide_id: slideId,
      tenant_id: tenantId,
      event_id: eventId,
      status: 'pending',
    });

    // 5. Update slide status
    await supabase.from('slides').update({ thumbnail_status: 'processing' }).eq('id', slideId);

    return { success: true, status: 'processing', job_id: job.id };
  } catch (error) {
    // Rollback quota on failure
    await supabase.rpc('decrement_thumbnail_quota', { p_tenant_id: tenantId });
    throw error;
  }
}
```

**Webhook Processing** (`/api/webhooks/cloudconvert/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  // 1. Verify webhook signature
  const signature = request.headers.get('CloudConvert-Signature');
  const isValid = verifyWebhookSignature(await request.text(), signature);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = await request.json();

  // 2. Idempotent check - if webhook already processed, return success
  const { data: existingJob } = await supabase
    .from('cloudconvert_jobs')
    .select('webhook_received_at')
    .eq('cloudconvert_job_id', payload.job.id)
    .single();

  if (existingJob?.webhook_received_at) {
    return NextResponse.json({ message: 'Already processed' }, { status: 200 });
  }

  // 3. Download thumbnail from CloudConvert
  const thumbnailUrl = payload.job.tasks.find(t => t.name === 'export').result.files[0].url;
  const thumbnailBuffer = await fetch(thumbnailUrl).then(r => r.arrayBuffer());

  // 4. Upload to R2
  const thumbnailKey = `thumbnails/${slideId}.jpg`;
  await uploadToR2(thumbnailKey, thumbnailBuffer, 'image/jpeg');

  // 5. Update database atomically
  await supabase.from('slides').update({
    thumbnail_r2_key: thumbnailKey,
    thumbnail_status: 'completed',
    thumbnail_generated_at: new Date(),
  }).eq('id', slideId);

  await supabase.from('cloudconvert_jobs').update({
    status: 'completed',
    webhook_received_at: new Date(),
    completed_at: new Date(),
  }).eq('cloudconvert_job_id', payload.job.id);

  return NextResponse.json({ message: 'Processed' }, { status: 200 });
}
```

**Benefits**:
- Non-blocking: Slide upload returns immediately (<1s)
- Scalable: External API handles processing
- Reliable: Webhook-based completion (no polling)
- Idempotent: Safe for duplicate webhooks

### Atomic Quota Management with PostgreSQL Functions
**Pattern**: Row-level locking with atomic check-and-increment
**Location**: `supabase/migrations/009_006_create_atomic_quota_functions.sql`

**PostgreSQL Function**:
```sql
CREATE OR REPLACE FUNCTION check_and_increment_thumbnail_quota(
  p_tenant_id UUID,
  p_event_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  quota_used INTEGER,
  quota_total INTEGER,
  quota_remaining INTEGER
) AS $$
DECLARE
  v_tenant_quota_used INTEGER;
  v_tenant_quota_total INTEGER;
  v_event_enabled BOOLEAN;
BEGIN
  -- Check event toggle (no lock needed)
  SELECT thumbnail_generation_enabled INTO v_event_enabled
  FROM events
  WHERE id = p_event_id;

  IF NOT v_event_enabled THEN
    RETURN QUERY SELECT FALSE, 0, 0, 0;
    RETURN;
  END IF;

  -- Lock tenant row and get quota (prevents race conditions)
  SELECT thumbnail_quota_used, thumbnail_quota_total
  INTO v_tenant_quota_used, v_tenant_quota_total
  FROM tenants
  WHERE id = p_tenant_id
  FOR UPDATE; -- Row-level lock

  -- Check if quota available
  IF v_tenant_quota_used >= v_tenant_quota_total THEN
    RETURN QUERY SELECT
      FALSE,
      v_tenant_quota_used,
      v_tenant_quota_total,
      (v_tenant_quota_total - v_tenant_quota_used);
    RETURN;
  END IF;

  -- Increment quota (within same transaction)
  UPDATE tenants
  SET thumbnail_quota_used = thumbnail_quota_used + 1
  WHERE id = p_tenant_id;

  -- Return success with updated quota
  RETURN QUERY SELECT
    TRUE,
    v_tenant_quota_used + 1,
    v_tenant_quota_total,
    (v_tenant_quota_total - v_tenant_quota_used - 1);
END;
$$ LANGUAGE plpgsql;
```

**Usage in Service**:
```typescript
const { data: quotaResult } = await supabase.rpc('check_and_increment_thumbnail_quota', {
  p_tenant_id: tenantId,
  p_event_id: eventId,
});

if (!quotaResult.success) {
  return res.status(403).json({
    error: 'QUOTA_EXHAUSTED',
    quota: {
      used: quotaResult.quota_used,
      total: quotaResult.quota_total,
      remaining: quotaResult.quota_remaining,
    },
  });
}
```

**Benefits**:
- Prevents race conditions (multiple concurrent requests)
- Atomic operation (check + increment in single transaction)
- Row-level locking (only blocks same tenant)
- Returns updated quota in single call

### Webhook Signature Verification (HMAC-SHA256)
**Pattern**: Verify webhook authenticity using cryptographic signatures
**Location**: `frontend/src/services/cloudConvertService.ts:verifyWebhookSignature()`

```typescript
import { createHmac } from 'crypto';

export function verifyWebhookSignature(
  payload: string,
  receivedSignature: string | null
): boolean {
  if (!receivedSignature) {
    console.error('[CloudConvert] No signature provided');
    return false;
  }

  const webhookSecret = process.env.CLOUDCONVERT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('CLOUDCONVERT_WEBHOOK_SECRET not configured');
  }

  // Compute HMAC-SHA256 signature
  const computedSignature = createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison (prevents timing attacks)
  return computedSignature === receivedSignature;
}
```

**Webhook Route Usage**:
```typescript
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('CloudConvert-Signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('[Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Process webhook...
}
```

**Benefits**:
- Prevents unauthorized webhook calls
- Protects against replay attacks
- Industry-standard cryptographic verification
- Constant-time comparison prevents timing attacks

### Real-time UI Updates with Supabase Realtime
**Pattern**: Subscribe to database changes for live progress updates
**Location**: `frontend/src/hooks/useThumbnailProgress.ts`

**Hook Implementation**:
```typescript
export function useThumbnailProgress(options: UseThumbnailProgressOptions = {}) {
  const { eventId, onUpdate, debug = false } = options;
  const supabaseRef = useRef(createClientComponentClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!onUpdate) return;

    const supabase = supabaseRef.current;
    const channelName = `thumbnail-progress-event-${eventId}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'slides',
        filter: eventId ? `speeches.sessions.event_id=eq.${eventId}` : undefined,
      }, (payload) => {
        const newData = payload.new as any;

        // Only process thumbnail-related updates
        if (!('thumbnail_status' in newData)) return;

        const update: ThumbnailUpdate = {
          slide_id: newData.id,
          thumbnail_status: newData.thumbnail_status,
          thumbnail_r2_key: newData.thumbnail_r2_key,
          thumbnail_generated_at: newData.thumbnail_generated_at,
        };

        onUpdate(update);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [eventId, onUpdate]);
}
```

**Component Usage**:
```typescript
// In DashboardSessionsSpeeches component
useThumbnailProgress({
  eventId,
  onUpdate: async (update) => {
    // Fetch slide to get speech_id
    const { data: slide } = await supabase
      .from('slides')
      .select('speech_id')
      .eq('id', update.slide_id)
      .single();

    // Update speech state
    setSpeeches(prevSpeeches =>
      prevSpeeches.map(speech => {
        if (speech.id === slide.speech_id) {
          return {
            ...speech,
            thumbnail_status: update.thumbnail_status,
            first_slide_thumbnail: update.thumbnail_r2_key,
          };
        }
        return speech;
      })
    );
  },
});
```

**Benefits**:
- Live progress updates (no polling)
- WebSocket-based (efficient)
- Event-scoped subscriptions (reduces noise)
- Automatic cleanup on unmount

### Netlify Scheduled Functions for Batch Processing
**Pattern**: Cron-based serverless function for retroactive generation
**Location**: `frontend/netlify/functions/scheduled-thumbnail-generation.ts`

```typescript
export const handler: Handler = async (event, context) => {
  const CONFIG = {
    MAX_SLIDES_PER_RUN: 50,
    MAX_SLIDES_PER_TENANT: 10,
    PROCESSING_DELAY_MS: 2000,
  };

  // 1. Query eligible slides (no thumbnail, event toggle enabled, <30 days old)
  const eligibleSlides = await getEligibleSlides();

  // 2. Group by tenant for quota management
  const slidesByTenant = groupSlidesByTenant(eligibleSlides);

  // 3. Process tenant by tenant
  for (const [tenantId, slides] of Object.entries(slidesByTenant)) {
    // Check quota before processing
    const hasQuota = await hasQuotaAvailable(tenantId);
    if (!hasQuota) continue;

    // Process up to 10 slides per tenant (fairness)
    const slidesToProcess = slides.slice(0, CONFIG.MAX_SLIDES_PER_TENANT);

    for (const slide of slidesToProcess) {
      await initiateThumbnailGeneration({ slideId: slide.id, tenantId, eventId: slide.event_id });

      // Rate limiting delay
      await sleep(CONFIG.PROCESSING_DELAY_MS);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ processed: result.processed }) };
};
```

**Schedule Configuration** (`netlify.toml`):
```toml
# Configure via Netlify Dashboard or CLI
# netlify functions:schedule scheduled-thumbnail-generation "0 2 * * *"
```

**Benefits**:
- Automated retroactive generation
- Quota-aware processing
- Fair distribution across tenants
- Rate limiting prevents CloudConvert throttling

### Email Notifications with React Email + Resend
**Pattern**: Template-based transactional emails with React components
**Location**: `frontend/emails/ThumbnailFailureEmail.tsx`, `frontend/src/services/emailNotificationService.ts`

**React Email Template**:
```tsx
export default function ThumbnailFailureEmail({
  eventName,
  failedSlides,
  eventDashboardUrl,
}: ThumbnailFailureEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif' }}>
        <Container>
          <Heading>⚠️ Thumbnail Generation Failures Detected</Heading>
          <Text>Event: <strong>{eventName}</strong></Text>

          <Section>
            <Heading as="h2">Failed Slides ({failedSlides.length})</Heading>
            {failedSlides.map((slide) => (
              <Row key={slide.id}>
                <Column>{slide.filename}</Column>
                <Column><code>{slide.errorType}</code></Column>
              </Row>
            ))}
          </Section>

          <Button href={eventDashboardUrl}>View Event Dashboard</Button>
          <Button href={`${eventDashboardUrl}?action=retry-all`}>Retry All Failed</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

**Email Service**:
```typescript
export async function sendThumbnailFailureNotification({
  tenantId,
  eventId,
  adminEmail,
}: SendThumbnailFailureParams) {
  // 1. Query failure log for event
  const failures = await queryFailureLog(eventId);

  if (failures.length < 3) {
    return; // Only send after 3+ failures
  }

  // 2. Render React Email template
  const emailHtml = render(
    <ThumbnailFailureEmail
      eventName={event.name}
      failedSlides={failures}
      eventDashboardUrl={`${process.env.NEXT_PUBLIC_APP_URL}/admin/events/${eventId}`}
    />
  );

  // 3. Send via Resend
  await resend.emails.send({
    from: process.env.NOTIFICATION_FROM_EMAIL!,
    to: adminEmail,
    subject: `⚠️ Thumbnail Generation Failures Detected - ${event.name}`,
    html: emailHtml,
  });
}
```

**Benefits**:
- Type-safe templates with React
- Styled emails with inline CSS
- Testable templates (can render in browser)
- Resend handles deliverability

### Idempotent Webhook Processing
**Pattern**: Detect and skip duplicate webhook calls
**Location**: `/api/webhooks/cloudconvert/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const payload = await request.json();

  // Check if webhook already processed
  const { data: existingJob } = await supabase
    .from('cloudconvert_jobs')
    .select('webhook_received_at, completed_at')
    .eq('cloudconvert_job_id', payload.job.id)
    .single();

  if (existingJob?.webhook_received_at) {
    console.log(`[Webhook] Already processed job ${payload.job.id}, skipping`);
    return NextResponse.json({ message: 'Already processed' }, { status: 200 });
  }

  // Process webhook (download, upload, update DB)
  await processWebhook(payload);

  return NextResponse.json({ message: 'Processed' }, { status: 200 });
}
```

**Benefits**:
- Safe for duplicate webhooks (CloudConvert may retry)
- Prevents double-processing
- Returns 200 (prevents further retries)
- No side effects on duplicate calls

<!-- MANUAL ADDITIONS END -->
