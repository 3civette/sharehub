# Research: Event Details Management

**Feature**: 005-ora-bisogna-implementare
**Date**: 2025-10-08
**Status**: Complete

## Research Questions

All technical unknowns were resolved through the `/clarify` process. This document consolidates research findings from the specification clarifications and existing project patterns.

## Technology Decisions

### 1. File Upload Library
**Decision**: Multer (already in use)
**Rationale**:
- Already used for logo uploads in Feature 002
- Proven integration with Express.js
- Supports multi-format validation and size limits
- Memory and disk storage options available

**Alternatives Considered**:
- `formidable`: More complex API, no benefit over Multer
- Custom implementation: Reinvents wheel, increases maintenance

**Implementation Pattern** (from `backend/src/routes/branding.ts`):
```typescript
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.ms-powerpoint',
                     'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});
```

### 2. QR Code Generation
**Decision**: `qrcode` npm package
**Rationale**:
- Lightweight (minimal dependencies)
- Supports data URLs for easy embedding in responses
- SVG and PNG output options
- Widely used (5M+ weekly downloads)

**Alternatives Considered**:
- `qr-image`: Less maintained, smaller community
- `node-qrcode`: Deprecated in favor of `qrcode`
- Client-side generation: Adds frontend bundle size

**Usage Pattern**:
```typescript
import QRCode from 'qrcode';

const generateTokenQR = async (token: string): Promise<string> => {
  return await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300
  });
};
```

### 3. Smart Ordering Logic
**Decision**: Hybrid approach (DB sort + manual override column)
**Rationale**:
- Default: ORDER BY scheduled_time (automatic chronological)
- Manual: display_order column overrides when set
- UI prompts user to sync scheduled_time when manually reordering
- Auto-clears display_order when scheduled_time changes

**Alternatives Considered**:
- Manual only: Loses chronological benefits
- Automatic only: No flexibility for edge cases
- Complex state machine: Over-engineered for MVP

**Database Pattern**:
```sql
CREATE TABLE sessions (
  ...
  scheduled_time TIMESTAMPTZ,
  display_order INTEGER, -- NULL = use scheduled_time order
  ...
);

-- Query pattern
SELECT * FROM sessions
WHERE event_id = $1
ORDER BY
  COALESCE(display_order, EXTRACT(EPOCH FROM scheduled_time)::INTEGER);
```

### 4. Cascade Deletion Strategy
**Decision**: Application-level cascade with user confirmation
**Rationale**:
- DB foreign keys set to RESTRICT (prevent accidental cascades)
- Application layer checks for dependencies
- Shows user impact (count of affected records)
- Gives user choice to proceed or cancel

**Alternatives Considered**:
- DB CASCADE: No user feedback, irreversible
- Soft delete only: Complicates queries with WHERE deleted_at IS NULL
- Prevent all deletion: Too restrictive

**Implementation Pattern**:
```typescript
// Service layer
const deleteSpeech = async (speechId: string) => {
  const slideCount = await countSlides(speechId);

  // Caller must have confirmed deletion
  if (slideCount > 0) {
    // Frontend showed confirmation dialog:
    // "This will delete ${slideCount} slides. Are you sure?"
  }

  await deleteSlides(speechId); // Manual cascade
  await db.delete('speeches').where({ id: speechId });
};
```

### 5. File Storage Structure
**Decision**: Tenant-scoped Supabase Storage buckets
**Rationale**:
- Follows existing pattern from Feature 002 (logos bucket)
- RLS applies at bucket level for security
- Path structure: `{bucket}/{tenantId}/{entityType}/{timestamp}-{filename}`
- Public URLs for easy frontend access

**Alternatives Considered**:
- Single flat bucket: No tenant isolation
- Separate buckets per tenant: Scalability issues
- File system storage: Complicates multi-server deployments

**Bucket Configuration**:
- `event-photos`: Public bucket for event images
- `slides`: Public bucket for downloadable files
- RLS Policy: Upload restricted to tenant admins
- Public read: Allowed (URLs are unguessable due to timestamp)

### 6. Multi-Format Validation
**Decision**: Configurable allow-list per event
**Rationale**:
- Default formats: PDF, PPTX, PPT
- Stored in events table: `allowed_slide_formats JSONB`
- Runtime validation checks against event settings
- Admin UI provides format selection checkboxes

**Alternatives Considered**:
- Global setting: Not flexible enough
- No validation: Security risk
- Magic number detection: Overkill for MVP

**Validation Flow**:
```
1. Admin configures allowed formats in event settings
2. Upload request includes event_id
3. Middleware loads event.allowed_slide_formats
4. Multer fileFilter checks file.mimetype against allow-list
5. Reject if not allowed, accept otherwise
```

## Best Practices Research

### Supabase Storage with RLS
**Pattern**: Tenant-scoped paths + RLS policies
**Source**: Feature 002 implementation (`backend/src/services/brandingService.ts`)

**Key Findings**:
- Always include tenantId in file paths for isolation
- Use RLS SELECT policy for public read access
- Use RLS INSERT/DELETE policies for admin-only write
- Generate signed URLs for temporary access (not needed here - public buckets)

### React File Upload UX
**Pattern**: Dual validation (client + server)
**Source**: `frontend/src/components/admin/LogoUpload.tsx`

**Key Findings**:
- Client validation provides immediate feedback
- Server validation ensures security (never trust client)
- Show upload progress for files >1MB
- Display file preview after upload (images only)
- Error messages must be specific (size vs. format)

### Accessibility for File Uploads
**Pattern**: WCAG 2.1 AA compliance
**Requirements**:
- Keyboard-accessible file input (native `<input type="file">`)
- ARIA labels for screen readers
- Error announcements via `role="alert"`
- File size/type constraints in visible text (not just validation)

## Integration Points

### Existing Features
1. **Feature 002** (Admin Event Management):
   - Event edit page exists at `/admin/events/[id]/edit`
   - Already has branding upload pattern to follow
   - RLS policies established for events table

2. **Feature 003** (Event Flow Management):
   - Slides, access_tokens tables exist
   - Download metrics tracking in place
   - Storage bucket patterns established

3. **Feature 004** (Public Event Page):
   - Public page exists at `/events/[slug]`
   - Token validation logic in place
   - Hierarchical layout pattern to extend

### Dependencies
- **Database**: Supabase PostgreSQL (existing connection)
- **Storage**: Supabase Storage (logos bucket exists as template)
- **Auth**: Supabase Auth (admin/participant roles defined)
- **Frontend Router**: Next.js 14 App Router (dynamic routes pattern)

## Performance Considerations

### File Upload Optimization
- Chunked uploads for files >10MB (Multer supports via `memoryStorage`)
- Client-side image compression for photos before upload
- Background processing for file metadata extraction

### Query Optimization
- Index on `event_id` foreign keys (sessions, speeches, slides)
- Index on `scheduled_time` for chronological sorting
- Composite index on `(event_id, display_order)` for manual ordering
- Eager loading for hierarchical queries (Event → Sessions → Speeches → Slides)

### Caching Strategy
- Public event data cached for 5 minutes (Supabase realtime updates not needed)
- Admin data not cached (always fresh)
- Slide download URLs cached in browser (immutable content)

## Security Considerations

### RLS Policy Patterns
```sql
-- Event Photos: Admins can insert/delete, everyone can view
CREATE POLICY "tenant_admins_manage_photos" ON event_photos
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));

CREATE POLICY "public_view_photos" ON event_photos
  FOR SELECT
  USING (true); -- Public bucket, URL-based access control

-- Sessions: Same pattern as event_photos
-- Speeches: Same pattern as event_photos
```

### File Upload Security
1. **Size Limit**: 50MB enforced at Multer + nginx levels
2. **Type Validation**: MIME type + file extension check
3. **Path Traversal**: Sanitize filenames (remove `../` patterns)
4. **Virus Scanning**: Out of scope for MVP (future enhancement)

## Conclusion

**Status**: ✅ All research complete
**Blockers**: None
**Ready for**: Phase 1 (Design & Contracts)

All technical unknowns resolved through clarification process. Implementation can proceed using established patterns from Features 002-004.
