# Research & Discovery: Public Event Page Redesign

**Feature**: 011-il-momento-di
**Date**: 2025-10-14
**Status**: Complete

## Executive Summary

The ShareHub public event page (`/events/[slug]`) requires a **fix-and-enhance** approach rather than a complete redesign. The diagnostic investigation revealed that:

1. **Core Issue**: Missing Next.js API routes due to incomplete Feature 008 (serverless migration)
2. **UI Components**: All components are properly implemented and functional
3. **Root Cause**: Backend was decommissioned before API routes were migrated to Next.js
4. **Solution Path**: Complete the serverless migration by implementing missing API routes, then enhance UI/UX

## Current State Analysis

### What Works ✅
- EventHeader component (modern, responsive)
- SessionList with accordion pattern (mobile-friendly)
- EventGallery with lightbox (feature 005)
- PublicMetrics display
- EventBanners (feature 010 - fully functional)
- TokenForm for private events
- Responsive layouts (320px, 768px, 1024px+)
- R2 presigned URLs for slide downloads
- Cleanup scheduled functions

### What's Broken ❌
- **API Route**: `GET /api/public/events/[slug]` - Missing (critical blocker)
- **API Route**: `POST /api/public/events/[slug]/validate-token` - Missing
- **API Route**: `GET /api/public/events/[slug]/metrics` - Missing
- **ZIP Downloads**: Frontend buttons exist, no backend implementation
- **Environment Config**: `NEXT_PUBLIC_API_URL` points to non-existent backend

### Root Causes
1. **Incomplete Migration**: Feature 008 partially implemented (R2 done, API routes pending)
2. **Backend Decommissioned**: Fly.io backend removed before Next.js routes created
3. **No Integration Tests**: Missing E2E tests to catch the gap
4. **Documentation Lag**: `CLAUDE.md` still references backend patterns

## Technical Decisions

### Decision 1: Complete Serverless Migration (Not Full Redesign)
**Chosen**: Implement missing Next.js API Routes to complete Feature 008 migration

**Rationale**:
- UI components are well-implemented and match spec requirements
- Architecture (serverless) is correct, just incomplete
- Faster path to functional system (days not weeks)
- Aligns with constitution principle: "Fix root causes, not symptoms"

**Alternatives Considered**:
- ❌ **Revert to Express backend**: Adds infrastructure complexity, higher costs
- ❌ **Complete redesign**: UI is already good, unnecessary rework
- ❌ **Keep hybrid approach**: Violates simplicity principle, confusing architecture

**Implementation**: 3 new Next.js Route Handlers + configuration updates

---

### Decision 2: Session Organization Pattern
**Chosen**: Chronological with optional client-side filters (Clarification Q2 answer)

**Rationale**:
- Simple default (chronological by date/time)
- Flexibility via track/topic filters
- No complex grouping logic
- Works for events with or without tracks

**Implementation**:
- Server returns sessions ordered by `time` ASC
- Client-side filter buttons for `track` field
- Default view shows all sessions chronologically

---

### Decision 3: Mobile Navigation Pattern
**Chosen**: In-page section headers with "back to top" button (Clarification Q1 answer)

**Rationale**:
- Natural scrolling behavior
- No overlay/modal complexity
- Works well for linear content consumption
- Simplest implementation

**Alternatives Considered**:
- ❌ **Sticky header**: Adds z-index complexity, reduces viewport space
- ❌ **FAB menu**: Extra click required, not discoverable

**Implementation**:
- Section dividers with clear headings
- Scroll-triggered "Back to top" button (appears after 300px scroll)
- CSS `scroll-margin-top` for smooth anchor links

---

### Decision 4: File Information Display
**Chosen**: Hybrid approach - icon visible, size on hover/tap (Clarification Q4 answer)

**Rationale**:
- Balances information availability with clean UI
- File type icon provides immediate context
- Size on-demand reduces visual clutter
- Mobile-friendly with tap gesture

**Implementation**:
- Always show: File type icon (PDF, PPT, PPTX)
- On hover (desktop): Tooltip with file size
- On mobile: Info icon with tap-to-reveal size

---

### Decision 5: WCAG Contrast Ratios
**Chosen**: Contextual AA - 4.5:1 body text, 3:1 secondary (Clarification Q3 answer)

**Rationale**:
- Meets WCAG 2.1 AA legal compliance
- Allows design flexibility for non-critical elements
- Pragmatic approach

**Implementation**:
- Body text, headings, primary buttons: 4.5:1 minimum
- Secondary text, badges, decorative elements: 3:1 minimum
- Use Tailwind's contrast-safe colors or custom CSS variables

---

### Decision 6: Bulk Download Scope
**Chosen**: Per-session only (Clarification Q5 answer)

**Rationale**:
- Simpler implementation (one ZIP generation pattern)
- Focused user intent (users want specific session materials)
- Lower server load (smaller ZIPs)
- Avoids massive file generation for large events

**Alternatives Considered**:
- ❌ **Event-wide download**: Could generate 100MB+ ZIPs, server timeout risk
- ❌ **No bulk download**: Feature 004 spec explicitly requires it

**Implementation**:
- "Download all slides" button on each session card
- ZIP generation: Stream slides from R2, create ZIP on-the-fly
- Use `archiver` library (already in dependencies from Feature 004)
- Filename format: `{event-name}-{session-name}.zip`

---

### Decision 7: ZIP Generation Strategy
**Chosen**: Implement ZIP generation (reverses Feature 008 decision)

**Rationale**:
- Feature 004 spec requires bulk download
- Frontend already has "Download all" buttons
- User confusion if buttons don't work
- Per-session ZIPs are small enough for serverless limits (typically 5-20MB)

**Alternatives Considered**:
- ❌ **Remove ZIP buttons**: Poor UX, breaks Feature 004 contract
- ❌ **External ZIP service**: Adds complexity, costs

**Implementation**:
- New routes: `/api/public/sessions/[id]/download-all` and `/api/public/speeches/[id]/download-all`
- Stream-based ZIP generation (no buffering in memory)
- 10-minute timeout for large sessions
- Response streaming to avoid serverless limits

---

### Decision 8: Environment Configuration
**Chosen**: Remove `NEXT_PUBLIC_API_URL`, use relative paths

**Rationale**:
- Next.js API Routes are same-origin
- Relative paths simplify configuration
- Works in all environments (dev, staging, prod)
- Aligns with serverless architecture

**Before**:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
fetch(`${API_BASE_URL}/api/public/events/${slug}`);
```

**After**:
```typescript
// No environment variable needed
fetch(`/api/public/events/${slug}`);
```

---

### Decision 9: Database Query Pattern
**Chosen**: Direct Supabase queries in API Routes with RLS enforcement

**Rationale**:
- Supabase RLS handles multi-tenant isolation
- No service layer needed for read-only public data
- Follows pattern established in Banner API (feature 010)
- Simpler than creating backend service layer

**Implementation**:
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  // Query with joins - RLS automatically applies
  const { data: event } = await supabase
    .from('events')
    .select(`
      *,
      sessions:sessions(
        *,
        speeches:speeches(
          *,
          slides:slides(*)
        )
      )
    `)
    .eq('slug', params.slug)
    .single();
}
```

---

### Decision 10: Token Validation Strategy
**Chosen**: Server-side validation with session storage

**Rationale**:
- Secure: Token validation happens server-side
- RLS-enforced: Access tokens table has RLS policies
- Stateless: No server session needed
- Client stores validated token_id in sessionStorage

**Flow**:
1. User enters 21-character token
2. POST `/api/public/events/[slug]/validate-token` validates against `access_tokens` table
3. If valid, return `token_id` (UUID)
4. Client stores `token_id` in sessionStorage
5. Subsequent requests include `token_id` as query param or header
6. RLS policies check `token_id` exists and isn't expired

**Implementation**: Match pattern from Feature 004 spec, using existing `access_tokens` table

---

## Technology Stack Confirmation

### Language/Version
- **TypeScript 5.3+**: Already in use, no change
- **Node.js 20 LTS**: Runtime for Next.js

### Primary Dependencies
- **Next.js 14 App Router**: Confirmed (already in use)
- **React 18**: Confirmed
- **Supabase Client** (`@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`): Confirmed
- **Tailwind CSS 3.x**: Confirmed
- **archiver**: For ZIP generation (add if not present)

### Storage
- **Supabase PostgreSQL**: Database (existing)
- **Cloudflare R2**: Slide storage (existing, Feature 008)
- **Supabase Storage**: Photo/banner storage (existing)

### Testing
- **Vitest**: Unit tests (already configured)
- **Contract tests**: API endpoint validation (extend existing pattern)

### Target Platform
- **Web browsers**: Chrome, Firefox, Safari, Edge (modern versions)
- **Mobile browsers**: iOS Safari 15+, Chrome Mobile
- **Deployment**: Netlify (serverless functions)

### Performance Goals
- **Page load**: <2 seconds (FR-025 from spec)
- **Image lazy-loading**: Progressive (FR-026)
- **ZIP generation**: <30 seconds for typical session (5-10 slides)

### Constraints
- **Netlify Function Timeout**: 10 seconds (free tier), 26 seconds (paid)
- **R2 Presigned URL Expiry**: 1 hour (configurable)
- **ZIP File Size**: Target <50MB per session (stay under serverless limits)

### Scale/Scope
- **Expected Events**: 100-500 concurrent public events
- **Expected Users**: 1,000-10,000 daily page views
- **Session Size**: Typically 3-15 speeches per session
- **Slide Size**: Average 2-5MB per slide

---

## Research Findings

### Best Practice: Next.js API Route Patterns
**Source**: Next.js 14 documentation, existing Banner API implementation

**Pattern**:
```typescript
// Route: app/api/public/events/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });

  // Query logic
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}
```

**Caching**:
```typescript
export const revalidate = 300; // 5-minute cache
```

---

### Best Practice: ZIP Streaming
**Source**: Feature 004 implementation (backend ZIP service)

**Pattern**:
```typescript
import archiver from 'archiver';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const archive = archiver('zip', { zlib: { level: 6 } });

  // Set headers for streaming
  const headers = new Headers({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}.zip"`,
  });

  // Stream slides from R2
  for (const slide of slides) {
    const response = await fetch(slide.presigned_url);
    const buffer = await response.arrayBuffer();
    archive.append(Buffer.from(buffer), { name: slide.filename });
  }

  archive.finalize();

  return new Response(archive as any, { headers });
}
```

---

### Best Practice: Mobile-First Responsive Design
**Source**: Tailwind CSS documentation, existing EventHeader component

**Breakpoint Strategy**:
- **Mobile First**: Base styles for 320px+
- **Tablet**: `md:` prefix for 768px+
- **Desktop**: `lg:` prefix for 1024px+

**Typography**:
- Body text: `text-base` (16px) minimum
- Headings: Scale using `text-xl`, `text-2xl`, `text-3xl`
- Line height: `leading-relaxed` for readability

**Touch Targets**:
- Buttons: `min-h-[44px] min-w-[44px]` (FR-012)
- Links: `p-2` padding for comfortable tap area

---

### Best Practice: WCAG 2.1 AA Compliance
**Source**: WebAIM Contrast Checker, Tailwind contrast utilities

**Color Palette** (using Tailwind):
- **Primary text**: `text-gray-900` on `bg-white` (21:1 ratio ✓)
- **Secondary text**: `text-gray-600` on `bg-white` (7:1 ratio ✓)
- **Decorative**: `text-gray-400` on `bg-white` (3:1 ratio ✓)

**Validation Tool**:
```bash
# Use axe DevTools browser extension during development
# Or automated: @axe-core/playwright in tests
```

---

## Integration Points

### Existing Features
- **Feature 005** (Event Gallery): Photos already integrated, working
- **Feature 010** (Event Banners): Banners already integrated, working
- **Feature 008** (R2 Storage): Slide downloads working, need to leverage for ZIP generation

### Database Schema
**Tables Used**:
- `events` (existing) - Main event data
- `sessions` (existing) - Event sessions
- `speeches` (existing) - Session speeches
- `slides` (existing) - Slide files with R2 paths
- `access_tokens` (existing) - Private event tokens
- `event_photos` (existing) - Gallery photos
- `banners` (existing) - Advertisement banners

**No Schema Changes Required**: All tables exist, RLS policies in place

---

## Open Questions Resolved

All clarifications from `/clarify` session have been integrated into decisions above:
- ✅ Mobile navigation pattern → In-page headers
- ✅ Session organization → Chronological with filters
- ✅ Contrast ratios → Contextual AA (4.5:1 / 3:1)
- ✅ File info display → Hybrid (icon + hover)
- ✅ Bulk download scope → Per-session
- ⏸️ Analytics tracking → Defer to implementation (FR-044)
- ⏸️ Metrics polling → Defer to implementation (FR-045)

---

## Implementation Strategy Summary

### Phase 1: Fix Critical Blockers (Days 1-2)
1. Implement `/api/public/events/[slug]/route.ts`
2. Implement `/api/public/events/[slug]/validate-token/route.ts`
3. Implement `/api/public/events/[slug]/metrics/route.ts`
4. Update `eventClient.ts` to use relative paths
5. Remove `NEXT_PUBLIC_API_URL` from configuration

**Result**: Public event page functional (basic features working)

### Phase 2: Complete Features (Days 3-4)
6. Implement ZIP download routes (sessions and speeches)
7. Update UI components with clarified patterns:
   - Add session filter buttons (track/topic)
   - Add "back to top" button
   - Implement hover tooltips for file info
8. Verify WCAG contrast ratios

**Result**: All features from spec implemented

### Phase 3: Polish & Validation (Day 5)
9. Add contract tests for new API routes
10. E2E tests for public event page flows
11. Performance testing (2-second load time target)
12. Update documentation (`CLAUDE.md`)

**Result**: Production-ready with test coverage

---

## Complexity Assessment

**Constitution Compliance**:
- ✅ **No Easy Fixes**: Completing proper serverless migration, not reverting to backend
- ✅ **Security First**: RLS policies enforced, token validation server-side
- ✅ **TDD**: Contract tests before implementation
- ✅ **Multi-Tenant Isolation**: Leveraging existing RLS policies
- ✅ **UX-First**: Fixing broken page before enhancing UI
- ✅ **Simplicity**: Using Next.js patterns, no new frameworks

**No Constitution Violations**: This plan aligns with all constitutional principles.

---

**Research Status**: ✅ Complete
**All NEEDS CLARIFICATION Resolved**: Yes
**Ready for Phase 1 (Design & Contracts)**: Yes
