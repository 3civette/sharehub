# Research: Admin Panel Secondary Screens

**Feature**: Admin Panel Secondary Screens
**Date**: 2025-10-07
**Status**: Complete

## Research Items

### 1. Color Picker Component

**Decision**: Use `react-colorful` library

**Rationale**:
- Lightweight (< 3KB gzipped) vs react-color (28KB)
- Modern React hooks API (no class components)
- Excellent TypeScript support
- Built-in HSL, RGB, Hex picker components
- Tailwind CSS compatible (uses CSS custom properties)
- Active maintenance and wide adoption

**Alternatives Considered**:
- **react-color**: Rejected due to large bundle size and legacy class component architecture
- **Custom picker**: Rejected - reinventing the wheel, accessibility concerns

**Implementation Notes**:
- Use `HexColorPicker` component for primary/secondary colors
- Store values as hex strings in database
- Apply via CSS custom properties: `--color-primary`, `--color-secondary`
- Install: `npm install react-colorful`

---

### 2. File Upload Validation

**Decision**: Client-side validation with `File` API + server-side validation with Multer

**Rationale**:
- Immediate user feedback (client-side) prevents unnecessary uploads
- Security validation (server-side) prevents malicious files
- File API supports size/type/MIME checking before upload
- Multer provides robust server-side file handling with size limits
- Two-layer defense follows security-first principle

**Alternatives Considered**:
- **Server-only validation**: Rejected - poor UX, wasted bandwidth
- **Custom upload handler**: Rejected - Multer is proven, maintained solution

**Implementation Notes**:
- Client-side: Check `file.size <= 2MB`, `file.type` matches PNG/JPG/SVG
- Show preview using `URL.createObjectURL(file)`
- Server-side: Multer with `fileFilter` for MIME type, `limits: { fileSize: 2 * 1024 * 1024 }`
- Store in Supabase Storage with tenant-scoped paths: `logos/{tenantId}/{filename}`
- Return public URL to client

---

### 3. Dynamic Branding (CSS Custom Properties)

**Decision**: CSS custom properties with Next.js `style` tag injection

**Rationale**:
- Native CSS feature, no extra libraries
- Scoped to tenant via inline `<style>` tag in layout
- Fast runtime updates (no style recompilation)
- Tailwind CSS natively supports custom properties
- Works with SSR (values injected server-side)

**Alternatives Considered**:
- **Styled Components**: Rejected - adds runtime overhead, bundle size
- **CSS Modules with dynamic imports**: Rejected - complex, poor caching
- **Inline styles**: Rejected - doesn't support pseudo-classes, media queries

**Implementation Notes**:
1. Fetch tenant branding on layout load
2. Inject CSS custom properties in root element:
   ```tsx
   <div style={{
     '--color-primary': branding.primary_color,
     '--color-secondary': branding.secondary_color
   }}>
   ```
3. Use in Tailwind: `bg-[var(--color-primary)]`, `text-[var(--color-secondary)]`
4. Cache branding in `TenantContext` to avoid refetching
5. Update context when branding changes (optimistic UI)

---

### 4. RLS Logo Access (Supabase Storage)

**Decision**: Public bucket with RLS policy on SELECT for tenant isolation

**Rationale**:
- Logos must be publicly accessible (displayed on attendee pages)
- RLS policy ensures only tenant admins can INSERT/UPDATE/DELETE
- Supabase Storage supports RLS policies on `storage.objects` table
- Tenant-scoped paths (`logos/{tenantId}/`) provide additional isolation layer
- No need for signed URLs (logos are public assets)

**Alternatives Considered**:
- **Private bucket with signed URLs**: Rejected - unnecessary complexity for public assets
- **Manual S3-style permissions**: Rejected - Supabase RLS is simpler and consistent with DB

**Implementation Notes**:
1. Create `logos` bucket with public access: `supabase storage create --public logos`
2. RLS policy for SELECT (read): Allow all authenticated users
3. RLS policy for INSERT/UPDATE/DELETE: Only admins of matching `tenant_id`
4. File path pattern: `logos/{tenantId}/{timestamp}-{filename}`
5. On branding update, delete old logo file (cleanup)
6. Return public URL: `{SUPABASE_URL}/storage/v1/object/public/logos/{path}`

---

### 5. Sort/Filter State (Next.js App Router)

**Decision**: URL search params with `useSearchParams` + `usePathname` hooks

**Rationale**:
- URL-based state is shareable (users can bookmark/share filtered views)
- Native Next.js App Router support with hooks
- No extra state management library needed
- SEO-friendly (crawlers can index different sort/filter views)
- Browser back/forward navigation works automatically

**Alternatives Considered**:
- **React state (useState)**: Rejected - not shareable, lost on refresh
- **Query-string library**: Rejected - Next.js hooks are sufficient
- **Zustand/Redux**: Rejected - overkill for simple URL params

**Implementation Notes**:
1. Read params: `const searchParams = useSearchParams(); const sort = searchParams.get('sort');`
2. Update params: Use `router.push()` with new query string
3. Supported params:
   - `sort`: `date-asc` (default), `date-desc`, `created-desc`
   - `filter`: `all` (default), `active`, `past`, `draft`
4. Parse and validate params, fallback to defaults on invalid values
5. Pass to API: `GET /events?tenant_id={id}&sort={sort}&filter={filter}`
6. Debounce filter changes to avoid excessive API calls

---

## Deferred Clarifications (Low Impact)

Based on spec review, these clarifications were deferred during planning with sensible defaults:

### Event Date Validation
**Decision**: Disallow past dates for new events
**Rationale**: Aligns with "create future events" use case. Past event creation can be added later if needed.

### Event Description Format
**Decision**: Plain text with line breaks
**Rationale**: Simpler implementation, avoids XSS risks. Rich text (Markdown) can be added in future iteration.

### Event Status Definition
**Decision**: Computed status based on date: `active` (future), `past` (past)
**Rationale**: Eliminates need for manual status management. "Draft" status can be added later with explicit `published` flag.

---

## Summary

All research complete. Technology choices align with ShareHub constitution (simplicity, proven libraries, security-first). No new dependencies required beyond `react-colorful` (already lightweight). Ready for Phase 1 design.
