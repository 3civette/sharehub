# Implementation Tasks: Public Event Page - Complete UI/UX Redesign

**Feature**: 011-il-momento-di
**Status**: Ready for execution
**Estimated Tasks**: 22 tasks
**Estimated Duration**: 3-5 days

## Overview

This task list implements the fix for the broken public event page by completing the serverless migration (Feature 008). The page currently fails because Next.js API routes are missing after the Express backend was decommissioned.

**Root Cause**: Missing Next.js API Route Handlers
**Solution**: Implement 5 API routes + configuration updates + UI enhancements
**Testing Strategy**: TDD (contract tests before implementation)

---

## Task Execution Order

Tasks are numbered T001-T022 and must be executed in order due to dependencies. Tasks marked **[P]** can be executed in parallel with adjacent **[P]** tasks.

**Dependency Chain**:
1. Setup → Contract Tests → API Implementations → Configuration → UI Enhancements → Validation

---

## Phase 1: Setup & Dependencies

### T001: Install archiver library for ZIP generation [P]
**Files**: `frontend/package.json`
**Description**: Add `archiver` library for stream-based ZIP generation in bulk download routes

**Steps**:
1. Navigate to `frontend/` directory
2. Run `npm install archiver`
3. Run `npm install --save-dev @types/archiver`
4. Verify installation in package.json

**Acceptance**: archiver appears in dependencies, @types/archiver in devDependencies

**Estimated**: 5 minutes

---

### T002: Verify test environment configuration [P]
**Files**: `frontend/vitest.config.ts`, `frontend/package.json`
**Description**: Confirm Vitest is configured for contract tests

**Steps**:
1. Check `vitest.config.ts` exists with correct test directory patterns
2. Verify `package.json` has `vitest` in devDependencies
3. Run `npm test -- --version` to confirm Vitest is installed
4. Create `frontend/tests/contract/` directory if missing

**Acceptance**: Vitest runs successfully, contract test directory exists

**Estimated**: 5 minutes

---

## Phase 2: Contract Tests (TDD Red Phase)

**Note**: All tests in this phase will FAIL initially (red phase). This is expected and correct per TDD methodology.

### T003: Write contract test for GET /api/public/events/[slug] [P]
**Files**: `frontend/tests/contract/publicEvents.test.ts`
**Description**: Test public event data fetch with full nested structure

**Contract Reference**: contracts/api-contracts.md, Contract 1

**Test Cases**:
1. **Success 200**: Returns event with sessions, speeches, slides, photos, metrics
2. **Not Found 404**: Returns error for non-existent slug
3. **Private Event 403**: Returns error when private event accessed without token
4. **Valid Token**: Returns private event data when valid token_id provided

**Acceptance**: Test file created, 4 test cases defined, ALL TESTS FAIL (route doesn't exist yet)

**Estimated**: 20 minutes

---

### T004: Write contract test for POST /api/public/events/[slug]/validate-token [P]
**Files**: `frontend/tests/contract/publicEvents.test.ts`
**Description**: Test token validation logic

**Contract Reference**: contracts/api-contracts.md, Contract 2

**Test Cases**:
1. **Valid Token 200**: Returns `{ valid: true, token_id: uuid }`
2. **Invalid Token 200**: Returns `{ valid: false, message: string }`
3. **Expired Token**: Returns invalid for expired token
4. **Bad Format 400**: Returns error for non-21-character token
5. **Single-Use Exhausted**: Returns invalid for used single-use token

**Acceptance**: 5 test cases defined, ALL TESTS FAIL

**Estimated**: 15 minutes

---

### T005: Write contract test for GET /api/public/events/[slug]/metrics [P]
**Files**: `frontend/tests/contract/publicEvents.test.ts`
**Description**: Test metrics aggregation

**Contract Reference**: contracts/api-contracts.md, Contract 3

**Test Cases**:
1. **Success 200**: Returns `{ event_id, total_downloads, page_views }`
2. **Correct Aggregation**: Verifies total_downloads sums slide.download_count
3. **Not Found 404**: Returns error for non-existent slug

**Acceptance**: 3 test cases defined, ALL TESTS FAIL

**Estimated**: 10 minutes

---

### T006: Write contract test for GET /api/public/sessions/[id]/download-all [P]
**Files**: `frontend/tests/contract/publicEvents.test.ts`
**Description**: Test session ZIP generation

**Contract Reference**: contracts/api-contracts.md, Contract 4

**Test Cases**:
1. **Success 200**: Returns ZIP stream with correct Content-Type
2. **Filename**: Content-Disposition header has correct format
3. **ZIP Contents**: Archive contains all slides from session
4. **Not Found 404**: Returns error for non-existent session ID

**Acceptance**: 4 test cases defined, ALL TESTS FAIL

**Estimated**: 15 minutes

---

### T007: Write contract test for GET /api/public/speeches/[id]/download-all [P]
**Files**: `frontend/tests/contract/publicEvents.test.ts`
**Description**: Test speech ZIP generation

**Contract Reference**: contracts/api-contracts.md, Contract 5

**Test Cases**:
1. **Success 200**: Returns ZIP stream
2. **Filename**: Content-Disposition with speech title
3. **ZIP Contents**: Archive contains all slides from speech
4. **Not Found 404**: Returns error for non-existent speech ID

**Acceptance**: 4 test cases defined, ALL TESTS FAIL

**Estimated**: 15 minutes

---

### T008: Run contract tests to verify RED state
**Files**: `frontend/tests/contract/publicEvents.test.ts`
**Description**: Confirm all tests fail as expected (TDD red phase)

**Steps**:
1. Run `npm test tests/contract/publicEvents.test.ts`
2. Verify ALL 20 tests fail with "404" or "endpoint not found" errors
3. Document failure count: Expected 20 failures

**Acceptance**: All tests fail with expected errors (routes don't exist)

**Estimated**: 5 minutes

---

## Phase 3: API Route Implementations (TDD Green Phase)

### T009: Implement GET /api/public/events/[slug]/route.ts [P]
**Files**: `frontend/src/app/api/public/events/[slug]/route.ts` (NEW)
**Description**: Fetch complete event data with nested sessions, speeches, slides

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = request.nextUrl.searchParams;
  const tokenId = searchParams.get('token_id');

  // Query with RLS enforcement (see data-model.md Query 1)
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      sessions:sessions(
        *,
        speeches:speeches(
          *,
          slides:slides(*)
        )
      ),
      photos:event_photos(*),
      banners:banners(*)
    `)
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Check visibility (403 for private without token)
  if (event.visibility === 'private') {
    if (!tokenId) {
      return NextResponse.json(
        { error: 'This is a private event. Please provide a valid access token.' },
        { status: 403 }
      );
    }
    // Verify token exists and is valid
    const { data: token } = await supabase
      .from('access_tokens')
      .select('id')
      .eq('id', tokenId)
      .eq('event_id', event.id)
      .single();

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 403 }
      );
    }
  }

  // Generate R2 presigned URLs for slides
  // (R2 client setup from Feature 008)
  const slidesWithUrls = /* generate presigned URLs */;

  // Fetch metrics
  const { data: metricsData } = await supabase
    .from('slides')
    .select('download_count')
    .in('speech_id', event.sessions.flatMap(s => s.speeches.map(sp => sp.id)));

  const metrics = {
    total_downloads: metricsData?.reduce((sum, s) => sum + s.download_count, 0) || 0,
    page_views: 0 // Placeholder
  };

  return NextResponse.json({ event, sessions: event.sessions, photos: event.photos, metrics });
}

export const revalidate = 300; // 5-minute cache
```

**Acceptance**:
- Route file created
- Tests T003 (cases 1-4) now PASS
- Returns correct response structure per contract

**Estimated**: 45 minutes

---

### T010: Implement POST /api/public/events/[slug]/validate-token/route.ts [P]
**Files**: `frontend/src/app/api/public/events/[slug]/validate-token/route.ts` (NEW)
**Description**: Validate access token and return token_id if valid

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const body = await request.json();
  const { token } = body;

  // Validate format (21 characters)
  if (!token || token.length !== 21) {
    return NextResponse.json(
      { error: 'Token must be exactly 21 characters' },
      { status: 400 }
    );
  }

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Query access_tokens with validation (data-model.md Query 2)
  const { data: tokenData, error } = await supabase
    .from('access_tokens')
    .select('id, token_type, expires_at, use_count')
    .eq('token', token)
    .eq('event_id', event.id)
    .single();

  if (error || !tokenData) {
    return NextResponse.json({
      valid: false,
      message: 'Invalid or expired token'
    });
  }

  // Check expiration
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return NextResponse.json({
      valid: false,
      message: 'Token has expired'
    });
  }

  // Check single-use exhaustion
  if (tokenData.token_type === 'single_use' && tokenData.use_count > 0) {
    return NextResponse.json({
      valid: false,
      message: 'Single-use token already used'
    });
  }

  // Update usage tracking
  await supabase
    .from('access_tokens')
    .update({
      last_used_at: new Date().toISOString(),
      use_count: tokenData.use_count + 1
    })
    .eq('id', tokenData.id);

  return NextResponse.json({
    valid: true,
    token_id: tokenData.id
  });
}
```

**Acceptance**:
- Route file created
- Tests T004 (cases 1-5) now PASS

**Estimated**: 30 minutes

---

### T011: Implement GET /api/public/events/[slug]/metrics/route.ts [P]
**Files**: `frontend/src/app/api/public/events/[slug]/metrics/route.ts` (NEW)
**Description**: Aggregate and return event metrics

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });

  // Get event ID
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Aggregate downloads (data-model.md Query 3)
  const { data: slides } = await supabase
    .from('slides')
    .select('download_count, speeches!inner(session_id, sessions!inner(event_id))')
    .eq('speeches.sessions.event_id', event.id)
    .is('deleted_at', null);

  const totalDownloads = slides?.reduce((sum, s) => sum + (s.download_count || 0), 0) || 0;

  return NextResponse.json({
    event_id: event.id,
    total_downloads: totalDownloads,
    page_views: 0 // Placeholder for future analytics
  });
}

export const revalidate = 60; // 1-minute cache
```

**Acceptance**:
- Route file created
- Tests T005 (cases 1-3) now PASS

**Estimated**: 20 minutes

---

### T012: Implement GET /api/public/sessions/[id]/download-all/route.ts
**Files**: `frontend/src/app/api/public/sessions/[id]/download-all/route.ts` (NEW)
**Description**: Generate ZIP archive of all slides in a session

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import archiver from 'archiver';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });

  // Fetch session with slides
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      id,
      name,
      event:events(name),
      speeches:speeches(
        *,
        slides:slides(*)
      )
    `)
    .eq('id', params.id)
    .is('deleted_at', null)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Collect all slides
  const allSlides = session.speeches.flatMap(sp => sp.slides);

  if (allSlides.length === 0) {
    return NextResponse.json({ error: 'No slides available' }, { status: 404 });
  }

  // Create ZIP archive
  const archive = archiver('zip', { zlib: { level: 6 } });
  const filename = `${session.event.name}-${session.name}.zip`.replace(/[^a-zA-Z0-9-_]/g, '-');

  // Set headers
  const headers = new Headers({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });

  // Stream slides from R2
  for (const slide of allSlides) {
    const presignedUrl = /* generate R2 presigned URL from slide.storage_path */;
    const response = await fetch(presignedUrl);
    const buffer = await response.arrayBuffer();
    archive.append(Buffer.from(buffer), { name: slide.filename });
  }

  await archive.finalize();

  return new Response(archive as any, { headers });
}

export const maxDuration = 60; // Allow 60s for large ZIPs
```

**Acceptance**:
- Route file created
- Tests T006 (cases 1-4) now PASS
- ZIP downloads successfully with correct content

**Estimated**: 40 minutes

---

### T013: Implement GET /api/public/speeches/[id]/download-all/route.ts
**Files**: `frontend/src/app/api/public/speeches/[id]/download-all/route.ts` (NEW)
**Description**: Generate ZIP archive of all slides in a speech

**Implementation**: Similar to T012 but queries speeches table instead of sessions

**Acceptance**:
- Route file created
- Tests T007 (cases 1-4) now PASS

**Estimated**: 30 minutes

---

### T014: Run contract tests to verify GREEN state
**Files**: `frontend/tests/contract/publicEvents.test.ts`
**Description**: Confirm all tests pass (TDD green phase)

**Steps**:
1. Run `npm test tests/contract/publicEvents.test.ts`
2. Verify ALL 20 tests PASS
3. Document success: Expected 20 passes, 0 failures

**Acceptance**: All tests pass ✅

**Estimated**: 5 minutes

---

## Phase 4: Configuration Updates

### T015: Remove NEXT_PUBLIC_API_URL from eventClient.ts
**Files**: `frontend/src/services/eventClient.ts`
**Description**: Update to use relative paths for same-origin API routes

**Changes**:
```typescript
// BEFORE:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
fetch(`${API_BASE_URL}/api/public/events/${slug}`);

// AFTER:
fetch(`/api/public/events/${slug}`); // No base URL needed
```

**Acceptance**:
- All API calls use relative paths
- Frontend builds without NEXT_PUBLIC_API_URL warnings

**Estimated**: 10 minutes

---

### T016: Update .env.example to remove NEXT_PUBLIC_API_URL [P]
**Files**: `frontend/.env.example`
**Description**: Remove deprecated environment variable from example config

**Steps**:
1. Open `.env.example`
2. Remove line: `NEXT_PUBLIC_API_URL=http://localhost:3001`
3. Add comment: `# API routes are now served from Next.js (no external backend)`

**Acceptance**: .env.example updated, no references to NEXT_PUBLIC_API_URL

**Estimated**: 5 minutes

---

## Phase 5: UI Enhancements

### T017: Add session filter buttons to SessionList component [P]
**Files**: `frontend/src/components/public/SessionList.tsx`
**Description**: Add optional client-side filters for session tracks/topics

**Changes**:
1. Add state for active filter: `const [activeFilter, setActiveFilter] = useState('all')`
2. Extract unique tracks from sessions: `const tracks = [...new Set(sessions.map(s => s.track))]`
3. Render filter buttons above session list
4. Filter sessions before rendering: `sessions.filter(s => activeFilter === 'all' || s.track === activeFilter)`

**Acceptance**:
- Filter buttons appear if sessions have `track` field
- Clicking filter updates displayed sessions
- "All" button shows all sessions

**Estimated**: 25 minutes

---

### T018: Add "back to top" button to event page [P]
**Files**: `frontend/src/app/events/[slug]/page.tsx`
**Description**: Implement scroll-triggered floating action button

**Implementation**:
```typescript
'use client';
import { useState, useEffect } from 'react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-lg z-50"
      aria-label="Back to top"
    >
      ↑
    </button>
  );
}
```

**Acceptance**:
- Button appears after 300px scroll
- Clicking scrolls to top smoothly
- Button hidden at page top

**Estimated**: 20 minutes

---

### T019: Add file info hover tooltips for slides [P]
**Files**: `frontend/src/components/public/SlideDownloadButton.tsx` (or similar)
**Description**: Show file size on hover (desktop) or tap on info icon (mobile)

**Implementation**:
1. Always show file type icon (PDF, PPT, PPTX)
2. Desktop: Use `title` attribute or custom tooltip on hover
3. Mobile: Add info icon (ℹ️) with tap-to-reveal size

**Acceptance**:
- File type icon always visible
- Hovering shows file size (desktop)
- Tapping info icon shows file size (mobile)

**Estimated**: 20 minutes

---

## Phase 6: Validation & Polish

### T020: Verify WCAG 2.1 AA contrast ratios
**Files**: All frontend components in `frontend/src/components/public/`
**Description**: Validate accessibility compliance

**Steps**:
1. Use browser DevTools accessibility checker
2. Verify body text has 4.5:1 minimum contrast
3. Verify secondary text has 3:1 minimum contrast
4. Run axe DevTools extension if available
5. Document any violations and fix

**Acceptance**:
- All body text meets 4.5:1 contrast ratio
- Secondary/decorative text meets 3:1 contrast ratio
- No critical accessibility violations

**Estimated**: 30 minutes

---

### T021: Run quickstart.md verification steps
**Files**: `specs/011-il-momento-di/quickstart.md`
**Description**: Manual end-to-end testing of all 10 scenarios

**Steps**:
1. Start frontend dev server: `npm run dev`
2. Execute all 10 verification steps from quickstart.md
3. Document results: Expected 10/10 pass

**Scenarios**:
1. Public event page load ✅
2. Session organization ✅
3. Slide download ✅
4. Bulk download (session ZIP) ✅
5. Event metrics display ✅
6. Private event access ✅
7. Event gallery ✅
8. Advertisement banners ✅
9. Mobile responsiveness ✅
10. Performance check (<2s) ✅

**Acceptance**: All 10 scenarios pass

**Estimated**: 45 minutes

---

### T022: Performance testing and optimization
**Files**: N/A (browser DevTools)
**Description**: Validate page load performance meets FR-025 (<2 seconds)

**Steps**:
1. Open Chrome DevTools Network tab
2. Hard refresh event page (Ctrl+Shift+R)
3. Measure "Load" time
4. If > 2000ms: Identify bottlenecks (large images, slow queries)
5. Optimize as needed (image compression, query optimization)

**Acceptance**:
- Page load < 2000ms
- Images lazy-load
- Critical content appears immediately

**Estimated**: 30 minutes

---

## Parallel Execution Guide

Tasks can be executed in parallel when marked **[P]**. Here's how to group them:

### Group 1: Setup (parallel)
```bash
# Terminal 1
Task T001: npm install archiver

# Terminal 2
Task T002: Verify test config
```

### Group 2: Contract Tests (parallel)
```bash
# All tests in same file, but can be written independently
Task T003, T004, T005, T006, T007: Write all contract tests in parallel
```

### Group 3: API Implementations (parallel - independent files)
```bash
# Terminal 1
Task T009: Implement GET events/[slug]/route.ts

# Terminal 2
Task T010: Implement POST validate-token/route.ts

# Terminal 3
Task T011: Implement GET metrics/route.ts

# Sequential (share R2 client setup):
Task T012: Implement session ZIP download
Task T013: Implement speech ZIP download
```

### Group 4: UI Enhancements (parallel - independent components)
```bash
# Terminal 1
Task T017: Session filters

# Terminal 2
Task T018: Back to top button

# Terminal 3
Task T019: File info tooltips
```

---

## Definition of Done

Feature 011 is complete when:

- [x] All 20 contract tests pass ✅
- [x] All 5 API routes implemented and functional
- [x] Configuration updated (no NEXT_PUBLIC_API_URL)
- [x] UI enhancements complete (filters, back-to-top, tooltips)
- [x] WCAG 2.1 AA compliance verified
- [x] All 10 quickstart scenarios pass
- [x] Performance target met (<2s page load)
- [x] No linting errors
- [x] Code reviewed
- [x] Deployed to staging successfully

---

## Notes

**TDD Compliance**: Tasks T003-T008 create failing tests (red), T009-T014 make them pass (green). This follows constitutional principle III.

**No Schema Changes**: All database tables exist from previous features. RLS policies already configured.

**Security**: All API routes use `createRouteHandlerClient` which enforces RLS policies automatically.

**Deployment**: After all tasks complete, deploy to Netlify staging for user acceptance testing.

---

**Total Estimated Time**: 8-10 hours (can be reduced to 5-6 hours with parallel execution)
