# shareHub Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-06

## Active Technologies
- TypeScript 5.3+ (Node.js 20 LTS for backend, React 18 for frontend) + Next.js 14 (frontend), Express.js (backend API), Supabase (database + auth), Tailwind CSS (styling) (001-voglio-creare-l)
- TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend) (002-facciamo-tutti-gli)
- Supabase PostgreSQL with RLS policies, Supabase Storage for logo files (002-facciamo-tutti-gli)

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
- 002-facciamo-tutti-gli: Added TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
- 001-voglio-creare-l: Added TypeScript 5.3+ (Node.js 20 LTS for backend, React 18 for frontend) + Next.js 14 (frontend), Express.js (backend API), Supabase (database + auth), Tailwind CSS (styling)

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
