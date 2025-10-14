# Research: Event Advertisement Banner System

**Feature**: 010-ok-now-i | **Date**: 2025-10-13
**Phase**: 0 (Research & Technology Decisions)

## Overview
This document captures technical research and decisions for implementing the advertisement banner system. All functional clarifications were resolved during the `/clarify` phase (8 questions answered). This research focuses on technical implementation patterns within the existing ShareHub architecture.

---

## Storage Strategy for Banner Files

### Decision
**Use Supabase Storage** with tenant-scoped bucket organization.

### Rationale
- **Consistency**: Existing features (007-008) use Supabase Storage for event photos and slide thumbnails
- **RLS Integration**: Supabase Storage supports Row Level Security policies that align with database RLS
- **Cost**: Included in current Supabase plan, no additional service fees
- **Performance**: CDN-backed URLs for public banner display, presigned URLs for uploads
- **Migration Path**: Easy to move to Cloudflare R2 later if needed (existing R2 integration exists from feature 008)

### Alternatives Considered
- **Cloudflare R2**: Better for high-traffic scenarios, but adds complexity for this initial implementation
- **Local File System**: Not suitable for multi-instance deployment (Netlify)
- **External CDN (Cloudinary)**: Additional service dependency and cost

### Implementation Pattern
```typescript
// Bucket structure: banners/
// Path pattern: tenant-{tenant_id}/event-{event_id}/banner-{banner_id}-slot-{slot_num}.{ext}

const bucketPath = `tenant-${tenantId}/event-${eventId}/banner-${bannerId}-slot-${slotNumber}.${ext}`;

const { data, error } = await supabase.storage
  .from('banners')
  .upload(bucketPath, file, {
    contentType: file.type,
    cacheControl: '31536000', // 1 year cache for banners
    upsert: false // Prevent accidental overwrites
  });
```

---

## Banner Slot Configuration Strategy

### Decision
**Hardcoded slot definitions** in frontend with database enforcement via check constraint.

### Rationale
- **Simplicity**: 5 slots is a fixed business requirement (from clarification session)
- **Performance**: No additional database queries to fetch slot configurations
- **Type Safety**: TypeScript enums provide compile-time validation
- **Flexibility**: Each slot can have unique dimensions/positions defined in frontend styling

### Alternatives Considered
- **Dynamic Slot Configuration Table**: Over-engineered for fixed 5-slot requirement
- **JSON Configuration in Events Table**: Less type-safe, harder to validate

### Implementation Pattern
```typescript
// frontend/src/lib/banner-slots.ts
export enum BannerSlot {
  HEADER_MAIN = 1,    // 1200x300px - Top of page
  SIDEBAR_TOP = 2,    // 300x600px - Right sidebar above content
  CONTENT_MID = 3,    // 970x250px - Between content sections
  SIDEBAR_BOTTOM = 4, // 300x250px - Right sidebar below content
  FOOTER = 5          // 728x90px - Bottom footer area
}

export const SLOT_DIMENSIONS: Record<BannerSlot, { width: number; height: number; label: string }> = {
  [BannerSlot.HEADER_MAIN]: { width: 1200, height: 300, label: 'Header Banner' },
  [BannerSlot.SIDEBAR_TOP]: { width: 300, height: 600, label: 'Sidebar Top' },
  [BannerSlot.CONTENT_MID]: { width: 970, height: 250, label: 'Content Banner' },
  [BannerSlot.SIDEBAR_BOTTOM]: { width: 300, height: 250, label: 'Sidebar Bottom' },
  [BannerSlot.FOOTER]: { width: 728, height: 90, label: 'Footer Banner' }
};
```

---

## File Validation Strategy

### Decision
**Dual validation** (client-side + server-side) using existing FileDropzone component pattern.

### Rationale
- **Reusability**: FileDropzone component (feature 007) already implements client validation
- **Security**: Server-side validation prevents bypass of client checks
- **UX**: Immediate feedback on invalid files before upload starts
- **Consistency**: Matches existing file upload patterns in the codebase

### Alternatives Considered
- **Server-only Validation**: Poor UX, wastes bandwidth on invalid uploads
- **Third-party Service (ImageKit)**: Unnecessary dependency for simple validation

### Implementation Pattern
```typescript
// Client-side (reuse existing FileDropzone)
<FileDropzone
  onFilesSelected={(files) => handleBannerUpload(files)}
  accept="image/jpeg,image/png,image/webp"
  maxSize={5 * 1024 * 1024} // 5MB
  multiple={false}
/>

// Server-side validation
function validateBannerFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 5MB limit.' };
  }

  return { valid: true };
}
```

---

## RLS Policy Pattern

### Decision
**Multi-policy approach** similar to existing tables (events, slides).

### Rationale
- **Proven Pattern**: Existing RLS policies avoid infinite recursion issues (Constitution principle II)
- **Granular Control**: Separate policies for public read vs. admin write
- **Tenant Isolation**: Enforce tenant_id checks without self-referencing queries

### Alternatives Considered
- **Single Catch-All Policy**: Less maintainable, harder to debug authorization issues
- **Application-Level Security Only**: Violates Constitution principle II (Security First)

### Implementation Pattern
```sql
-- Public read access (for event visitors)
CREATE POLICY "banners_public_read" ON banners
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = banners.event_id
    AND events.visibility = 'public'
    AND events.deleted_at IS NULL
  )
  AND banners.deleted_at IS NULL
  AND banners.is_active = true
);

-- Admin write access (tenant-scoped)
CREATE POLICY "banners_admin_write" ON banners
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM admins WHERE id = auth.uid()
  )
);
```

---

## Banner Display Responsiveness

### Decision
**CSS-based responsive sizing** with aspect-ratio preservation.

### Rationale
- **Native Support**: CSS `aspect-ratio` property widely supported (95%+ browsers)
- **Performance**: No JavaScript required for responsive sizing
- **Maintainability**: Standard CSS patterns, easy to adjust

### Alternatives Considered
- **Multiple Image Sizes (srcset)**: Over-engineered for banner use case
- **JavaScript Resize Handlers**: Unnecessary performance overhead

### Implementation Pattern
```typescript
// Component with responsive container
<div className="banner-slot" data-slot={slot}>
  {banner.click_url ? (
    <a href={banner.click_url} target="_blank" rel="noopener noreferrer">
      <img
        src={banner.storage_url}
        alt={`Banner slot ${slot}`}
        className="w-full h-auto object-contain"
        style={{ aspectRatio: `${width}/${height}` }}
        loading="lazy"
      />
    </a>
  ) : (
    <img
      src={banner.storage_url}
      alt={`Banner slot ${slot}`}
      className="w-full h-auto object-contain"
      style={{ aspectRatio: `${width}/${height}` }}
      loading="lazy"
    />
  )}
</div>
```

---

## API Endpoint Design

### Decision
**RESTful nested routes** under event resources.

### Rationale
- **RESTful Conventions**: Banners belong to events, reflected in URL structure
- **Clarity**: `/api/events/[id]/banners` clearly shows resource hierarchy
- **Authorization**: Easy to verify event access before banner operations

### Alternatives Considered
- **Flat Structure** (`/api/banners`): Less clear resource ownership
- **GraphQL**: Over-engineered for CRUD operations, adds complexity

### Implementation Pattern
```
POST   /api/events/[id]/banners           # Create banner
GET    /api/events/[id]/banners           # List banners for event
GET    /api/banners/[bannerId]            # Get single banner (optional)
PATCH  /api/banners/[bannerId]            # Update banner (slot, URL, active status)
DELETE /api/banners/[bannerId]            # Soft delete banner
```

---

## Summary of Technical Decisions

| Decision Area | Chosen Approach | Key Rationale |
|--------------|-----------------|---------------|
| Storage | Supabase Storage | Consistency with existing features 007-008 |
| Slot Configuration | Hardcoded enum + DB constraint | Fixed business requirement (5 slots) |
| File Validation | Dual (client + server) | Security + UX, reuses FileDropzone |
| RLS Policies | Multi-policy (read/write split) | Proven pattern from existing tables |
| Responsive Display | CSS aspect-ratio | Native browser support, no JS needed |
| API Design | RESTful nested routes | Clear resource hierarchy, easy authorization |

**All Research Complete**: No NEEDS CLARIFICATION items remain. Ready for Phase 1 (Design & Contracts).
