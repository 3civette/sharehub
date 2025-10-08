# shareHub Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-06

## Active Technologies
- TypeScript 5.3+ (Node.js 20 LTS for backend, React 18 for frontend) + Next.js 14 (frontend), Express.js (backend API), Supabase (database + auth), Tailwind CSS (styling) (001-voglio-creare-l)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) (002-facciamo-tutti-gli)
- Supabase PostgreSQL with RLS policies, Supabase Storage for logo files (002-facciamo-tutti-gli)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Express.js (backend), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling) (003-ora-facciamo-il)
- Supabase PostgreSQL with RLS policies, Supabase Storage for slide files (003-ora-facciamo-il)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Express.js (backend API), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling), archiver (ZIP generation) (004-facciamo-la-pagina)

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
- 004-facciamo-la-pagina: Added TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Express.js (backend API), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling), archiver (ZIP generation)
- 003-ora-facciamo-il: Added TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) + Express.js (backend), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling)
- 002-facciamo-tutti-gli: Added TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)

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

<!-- MANUAL ADDITIONS END -->
