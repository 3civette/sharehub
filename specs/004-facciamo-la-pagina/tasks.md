# Tasks: Pagina Pubblica Evento

**Feature**: 004-facciamo-la-pagina
**Input**: Design documents from `/specs/004-facciamo-la-pagina/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Status
- [x] plan.md loaded (web app structure: backend + frontend)
- [x] data-model.md loaded (RLS policies, API models)
- [x] contracts/ loaded (public-event-api.yaml with 6 endpoints)
- [x] research.md loaded (8 technical decisions)
- [x] quickstart.md loaded (5 test scenarios)

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Database Setup (T001-T003)

- [x] **T001** Create RLS policies migration file `backend/migrations/004-public-read-policies.sql` with:
  - Policy `public_events_read` (allow SELECT on events WHERE visibility='public')
  - Policy `public_sessions_read` (allow SELECT on sessions for public events)
  - Policy `public_speeches_read` (allow SELECT on speeches for public events)
  - Policy `public_slides_read` (allow SELECT on slides for public events)
  - Policy `private_events_read_with_token` (allow SELECT on private events with valid token)

- [x] **T002** Create PostgreSQL function `backend/migrations/004-current-token-function.sql`:
  - Function `app.current_token_id()` that returns uuid from session variable
  - Used by RLS policies to check token validation

- [x] **T003** Apply database migrations via Supabase Dashboard SQL Editor (MANUAL STEP):
  - Run `004-public-read-policies.sql`
  - Run `004-current-token-function.sql`
  - Verify RLS policies active with `SELECT * FROM pg_policies WHERE tablename IN ('events', 'sessions', 'speeches', 'slides')`

---

## Phase 3.2: Backend Contract Tests (T004-T011) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] **T00** [P] Contract test GET /api/public/events/:slug (public event) in `backend/tests/contract/publicEvents.test.ts`:
  - Test: Public event returns 200 with event + sessions + speeches + slides
  - Test: Response matches PublicEventResponse schema
  - Test: Sessions ordered by display_order ASC
  - Test: Speeches ordered by display_order ASC within sessions

- [x] **T00** [P] Contract test GET /api/public/events/:slug (private event, no token) in `backend/tests/contract/publicEvents.test.ts`:
  - Test: Private event without token returns 403 Forbidden
  - Test: Error message: "This is a private event. Please provide a valid access token."

- [x] **T00** [P] Contract test POST /api/public/events/:slug/validate-token in `backend/tests/contract/publicEvents.test.ts`:
  - Test: Valid token returns 200 with {valid: true, token_type, expires_at}
  - Test: Invalid format (not 21 chars) returns 400
  - Test: Expired token returns 403 with {valid: false, message}
  - Test: Token updates last_used_at and use_count in database

- [x] **T00** [P] Contract test GET /api/public/events/:slug/metrics in `backend/tests/contract/publicEvents.test.ts`:
  - Test: Returns {page_views, total_slide_downloads}
  - Test: Premium metrics (unique_visitors, per_slide_downloads) NOT included
  - Test: 404 if event not found

- [x] **T00** [P] Contract test GET /api/public/slides/:slideId/download in `backend/tests/contract/publicEvents.test.ts`:
  - Test: Returns 302 redirect to signed Supabase Storage URL
  - Test: Location header contains Supabase domain
  - Test: Signed URL expires in 60s
  - Test: Increments total_slide_downloads in event_metrics

- [x] **T00** [P] Contract test GET /api/public/speeches/:speechId/download-zip in `backend/tests/contract/publicEvents.test.ts`:
  - Test: Returns 200 with application/zip content-type
  - Test: Content-Disposition header includes speech title
  - Test: ZIP contains all slides for speech
  - Test: 404 if speech not found or no slides

- [x] **T010** [P] Contract test GET /api/public/sessions/:sessionId/download-zip in `backend/tests/contract/publicEvents.test.ts`:
  - Test: Returns 200 with application/zip content-type
  - Test: ZIP organized as /speech-title/slide-filename.pdf
  - Test: Contains slides from all speeches in session
  - Test: 404 if session not found or no slides

- [x] **T011** [P] Contract test rate limiting on download endpoints in `backend/tests/contract/publicEvents.test.ts`:
  - Test: 50 downloads from same IP succeed (HTTP 302)
  - Test: 51st download returns HTTP 429
  - Test: Retry-After header present
  - Test: Error message: "Download limit reached (50/hour). Please try again in X minutes."

---

## Phase 3.3: Backend Services (T012-T018) (ONLY after tests are failing)

- [ ] **T012** [P] Create `backend/src/services/publicEventService.ts`:
  - Function `getPublicEvent(slug: string, tokenId?: string)` → PublicEventResponse
  - Fetch event + sessions + speeches + slides in parallel (Promise.all)
  - Check visibility: if private, validate tokenId via RLS
  - Order sessions by display_order ASC
  - Order speeches by display_order ASC within sessions
  - Generate signed URLs for slides (60s expiry)
  - Increment page_views in event_metrics

- [ ] **T013** [P] Create `backend/src/services/zipGenerationService.ts`:
  - Function `generateSpeechZip(speechId: string, res: Response)` streams ZIP
  - Function `generateSessionZip(sessionId: string, res: Response)` streams ZIP
  - Use archiver library with streaming (don't load all in memory)
  - ZIP filename format: "{title}-slides.zip" (sanitize title)
  - Session ZIP organized as /speech-title/slide-filename.pdf
  - Fetch files from Supabase Storage via signed URLs
  - Log batch_download to activity_logs

- [ ] **T014** Create `backend/src/middleware/downloadRateLimit.ts`:
  - Use express-rate-limit with windowMs: 60 * 60 * 1000 (1 hour)
  - Max: 50 downloads per hour
  - keyGenerator: extract IP from req.ip || req.socket.remoteAddress
  - Custom message: "Download limit reached (50/hour). Please try again in X minutes."
  - standardHeaders: true (include RateLimit-* headers)
  - Export as `downloadRateLimiter` middleware

- [ ] **T015** Create `backend/src/routes/publicEventRoutes.ts`:
  - GET /api/public/events/:slug → calls publicEventService.getPublicEvent()
  - POST /api/public/events/:slug/validate-token → validates token, updates last_used_at
  - GET /api/public/events/:slug/metrics → returns page_views + total_slide_downloads
  - GET /api/public/slides/:slideId/download → applies downloadRateLimiter, redirects to signed URL
  - GET /api/public/speeches/:speechId/download-zip → applies downloadRateLimiter, streams ZIP
  - GET /api/public/sessions/:sessionId/download-zip → applies downloadRateLimiter, streams ZIP

- [ ] **T016** Mount public event routes in `backend/src/app.ts`:
  - Import publicEventRoutes
  - Add: `app.use('/api/public', publicEventRoutes);`
  - Ensure mounted BEFORE catch-all 404 handler

- [ ] **T017** Run backend contract tests to verify implementation:
  - `cd backend && npm test tests/contract/publicEvents.test.ts`
  - All tests in T004-T011 must pass
  - Fix any failing tests before proceeding

- [ ] **T018** Manual test backend endpoints with curl:
  - Test public event: `curl http://localhost:3001/api/public/events/test-slug`
  - Test token validation: `curl -X POST http://localhost:3001/api/public/events/test-slug/validate-token -d '{"token":"..."}'`
  - Test metrics: `curl http://localhost:3001/api/public/events/test-slug/metrics`
  - Test slide download: `curl -I http://localhost:3001/api/public/slides/{uuid}/download`
  - Test ZIP download: `curl -O http://localhost:3001/api/public/speeches/{uuid}/download-zip`

---

## Phase 3.4: Frontend Components (T019-T028)

- [ ] **T019** [P] Create `frontend/src/services/eventClient.ts`:
  - Function `fetchPublicEvent(slug: string)` → PublicEventResponse
  - Function `validateToken(slug: string, token: string)` → TokenValidationResponse
  - Function `fetchPublicMetrics(slug: string)` → PublicMetrics
  - All functions use fetch() with error handling
  - Base URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

- [ ] **T020** [P] Create `frontend/src/components/public/EventHeader.tsx`:
  - Props: event { name, date, status, description }
  - Display event name (h1)
  - Display formatted date (use Intl.DateTimeFormat)
  - Display status badge with colors: upcoming=blue, past=gray, archived=yellow
  - Display description if present
  - Responsive: stack on mobile, row on desktop

- [ ] **T021** [P] Create `frontend/src/components/public/PublicMetrics.tsx`:
  - Props: metrics { page_views, total_slide_downloads }
  - Display format: "X views · Y downloads"
  - Optional: polling (fetch every 30s to show live updates)
  - Use useState + useEffect for polling
  - Clean up interval on unmount

- [ ] **T022** [P] Create `frontend/src/components/public/TokenForm.tsx`:
  - State: token (string), error (string | null), loading (boolean)
  - Input: 21-character text field with validation
  - On submit: call validateToken(), store in sessionStorage if valid
  - Display error messages below input
  - On success: trigger page reload or callback to parent
  - Accessible: label, aria-describedby for errors

- [ ] **T023** [P] Create `frontend/src/components/public/SlideDownload.tsx`:
  - Props: slide { id, filename, file_size, mime_type, download_url }
  - Display: filename, formatted size (e.g., "2.3 MB"), file type icon
  - Download button: opens download_url in new tab
  - Rate limit handling: catch 429 errors, show retry message
  - Batch download button (if multiple slides): calls /speeches/{id}/download-zip

- [ ] **T024** [P] Create `frontend/src/components/public/SpeechAccordion.tsx`:
  - Props: speech { id, title, speaker_name, duration_minutes, description, slides[] }
  - Use HTML `<details>` + `<summary>` for collapsible behavior
  - Summary shows: title, speaker name
  - Expanded shows: duration, description, SlideDownload components
  - Lazy load slides on first expansion (fetch only when opened)
  - Batch download button: "Download all slides" → /speeches/{id}/download-zip

- [ ] **T025** [P] Create `frontend/src/components/public/SessionList.tsx`:
  - Props: sessions { id, title, description, scheduled_time, speeches[] }[]
  - Display all sessions expanded (always visible)
  - For each session: title (h2), description, scheduled time
  - Render SpeechAccordion for each speech (collapsed by default)
  - Batch download button per session: "Download all session slides" → /sessions/{id}/download-zip

- [ ] **T026** Create `frontend/src/app/events/[slug]/loading.tsx`:
  - Loading skeleton UI with Tailwind CSS
  - Shimmer animation for event header
  - Placeholder cards for sessions
  - Suspense fallback for async Server Components

- [ ] **T027** Create `frontend/src/app/events/[slug]/page.tsx`:
  - Async Server Component
  - Extract slug from params: { params }: { params: { slug: string } }
  - Check sessionStorage for token: `const token = sessionStorage.getItem(\`event-token-${eventId}\`)`
  - Fetch event data: `await fetchPublicEvent(slug)` with token if present
  - If 403 (private event): show TokenForm component
  - If 200: render EventHeader + PublicMetrics + SessionList
  - Handle 404: show custom 404 page ("Event not found")
  - Increment page_views on load (via publicEventService)

- [ ] **T028** Test frontend components in browser:
  - Navigate to http://localhost:3000/events/test-slug
  - Verify event header displays correctly
  - Verify sessions expanded, speeches collapsed
  - Click speech to expand, verify slides load
  - Test single slide download
  - Test batch ZIP download (speech and session)
  - Test token form for private event
  - Test metrics display

---

## Phase 3.5: Integration Tests (T029-T032)

- [ ] **T029** [P] E2E test: Public event navigation flow in `frontend/tests/integration/publicEvent.test.tsx`:
  - Test: Navigate to /events/public-slug
  - Test: Event header visible
  - Test: Sessions expanded by default
  - Test: Speeches collapsed by default
  - Test: Click speech → expands to show slides
  - Test: Metrics displayed

- [ ] **T030** [P] E2E test: Private event token validation flow in `frontend/tests/integration/privateEvent.test.tsx`:
  - Test: Navigate to /events/private-slug
  - Test: Token form visible
  - Test: Enter invalid token → error shown
  - Test: Enter valid token → event content loads
  - Test: Token stored in sessionStorage
  - Test: Refresh page → token auto-validated

- [ ] **T031** [P] E2E test: Download slide and ZIP in `frontend/tests/integration/download.test.tsx`:
  - Test: Click single slide download → file downloads
  - Test: Click speech ZIP → ZIP file downloads
  - Test: Click session ZIP → ZIP file downloads
  - Test: Verify activity_logs entry created
  - Test: Verify total_slide_downloads incremented

- [ ] **T032** [P] E2E test: Rate limit enforcement in `frontend/tests/integration/rateLimit.test.tsx`:
  - Test: Download 50 slides → all succeed
  - Test: 51st download → 429 error shown
  - Test: Error message includes retry time
  - Test: Wait 1 hour (or mock time) → downloads work again

---

## Phase 3.6: Performance & Accessibility (T033-T037)

- [ ] **T033** Optimize: Implement lazy loading for slides in `frontend/src/components/public/SpeechAccordion.tsx`:
  - Only fetch slides when speech is expanded (not on initial page load)
  - Use useEffect with `details` onToggle event
  - Cache loaded slides (don't refetch on collapse/expand)

- [ ] **T034** Optimize: Implement pagination for large events in `frontend/src/app/events/[slug]/page.tsx`:
  - If event has >50 speeches, paginate (50 per page)
  - Add URL query param ?page=1
  - Show "Load more" button or pagination controls
  - Update URL on page change (router.push with scroll: false)

- [ ] **T035** Accessibility audit using Lighthouse in Chrome DevTools:
  - Run Lighthouse on http://localhost:3000/events/test-slug
  - Target: Accessibility score >= 90
  - Fix: Add ARIA labels to download buttons
  - Fix: Ensure keyboard navigation works (Tab through speeches)
  - Fix: Verify color contrast (min 4.5:1 for text)
  - Fix: Add alt text for icons

- [ ] **T036** Performance validation with 3G throttling:
  - Open DevTools → Network tab → Slow 3G
  - Navigate to event page with 50 speeches, 100 slides
  - Measure: Time to First Byte (TTFB) < 500ms
  - Measure: Largest Contentful Paint (LCP) < 2s
  - Measure: Total page load < 2s
  - Verify: Initial payload < 500KB
  - Verify: Slides lazy loaded (not fetched until expanded)

- [ ] **T037** Run performance tests with Lighthouse:
  - Target: Performance score >= 85
  - Target: Page load < 2s (simulated 3G)
  - Fix: Optimize images (use next/image)
  - Fix: Minimize JavaScript bundle size
  - Fix: Enable compression (gzip/brotli)

---

## Phase 3.7: Documentation & Validation (T038-T040)

- [ ] **T038** Update `CLAUDE.md` with Feature 004 patterns:
  - Add: Public event page pattern (Server Component + sessionStorage)
  - Add: ZIP streaming pattern (archiver + Supabase Storage)
  - Add: Rate limiting pattern (express-rate-limit with IP)
  - Add: RLS public read policies pattern
  - Keep manual additions between markers intact

- [ ] **T039** Run quickstart.md validation scenarios:
  - Execute Scenario 1: View Public Event (acceptance criteria 1-10)
  - Execute Scenario 2: Access Private Event with Token (criteria 1-7)
  - Execute Scenario 3: Rate Limiting (criteria 1-5)
  - Execute Scenario 4: Accessibility (criteria 1-6)
  - Execute Scenario 5: Performance (criteria 1-5)
  - Document any failures and fix before marking complete

- [ ] **T040** Final validation checklist:
  - [ ] All contract tests pass (backend)
  - [ ] All integration tests pass (frontend)
  - [ ] Lighthouse accessibility score >= 90
  - [ ] Lighthouse performance score >= 85
  - [ ] Page load < 2s on 3G
  - [ ] Rate limiting enforced (50/hour)
  - [ ] Public/private access control works
  - [ ] Token validation + sessionStorage works
  - [ ] Single + batch downloads work
  - [ ] Metrics tracking works (page_views, total_downloads)

---

## Dependencies

**Phase Order**:
1. Database Setup (T001-T003) → BLOCKS Backend Tests
2. Backend Tests (T004-T011) → BLOCKS Backend Services
3. Backend Services (T012-T018) → BLOCKS Frontend Components
4. Frontend Components (T019-T028) → BLOCKS Integration Tests
5. Integration Tests (T029-T032) → BLOCKS Performance/Accessibility
6. Performance/Accessibility (T033-T037) → BLOCKS Documentation
7. Documentation/Validation (T038-T040) → Feature Complete

**Critical Path**:
- T001-T003 (database) → T004-T011 (tests) → T012-T015 (services) → T027 (main page) → T039 (validation)

**Blocking Relationships**:
- T003 blocks T004-T011 (need RLS policies applied)
- T004-T011 block T012-T018 (TDD: tests before implementation)
- T012-T015 block T019-T028 (frontend needs working API)
- T027 blocks T029-T032 (integration tests need page implemented)

---

## Parallel Execution Examples

### Backend Contract Tests (run all 8 tests in parallel):
```bash
# T004-T011 can all run concurrently (different test cases in same file)
cd backend && npm test tests/contract/publicEvents.test.ts
```

### Backend Services (run 2 services in parallel):
```bash
# T012 and T013 can run in parallel (different files)
# Launch with Task tool:
Task: "Create backend/src/services/publicEventService.ts with getPublicEvent function"
Task: "Create backend/src/services/zipGenerationService.ts with generateSpeechZip and generateSessionZip functions"
```

### Frontend Components (run 7 components in parallel):
```bash
# T019-T025 can all run concurrently (different component files)
# Launch with Task tool:
Task: "Create frontend/src/services/eventClient.ts with fetch functions"
Task: "Create frontend/src/components/public/EventHeader.tsx"
Task: "Create frontend/src/components/public/PublicMetrics.tsx"
Task: "Create frontend/src/components/public/TokenForm.tsx"
Task: "Create frontend/src/components/public/SlideDownload.tsx"
Task: "Create frontend/src/components/public/SpeechAccordion.tsx"
Task: "Create frontend/src/components/public/SessionList.tsx"
```

### Integration Tests (run 4 tests in parallel):
```bash
# T029-T032 can all run concurrently (different test files)
cd frontend && npm test tests/integration/publicEvent.test.tsx tests/integration/privateEvent.test.tsx tests/integration/download.test.tsx tests/integration/rateLimit.test.tsx
```

---

## Notes

- **[P] tasks**: Different files, no shared dependencies → safe to parallelize
- **TDD enforced**: T004-T011 (tests) MUST be written and failing BEFORE T012-T018 (implementation)
- **Database first**: T003 (apply migrations) is a manual step - must be done before backend tests
- **Frontend depends on backend**: T027 (main page) requires T012-T018 (backend services) complete
- **Commit strategy**: Commit after each phase (not individual tasks) to reduce noise
- **Rate limiting**: Uses in-memory store - resets on backend restart (acceptable for MVP)

---

## Validation Checklist
*Checked before marking feature complete*

- [x] All 6 API endpoints have contract tests (T004-T011)
- [x] All tests come before implementation (T004-T011 before T012-T018)
- [x] Each component task specifies exact file path
- [x] Parallel tasks modify different files (no conflicts)
- [x] Database migrations applied before tests (T003 before T004)
- [x] Backend complete before frontend starts (T012-T018 before T019-T028)
- [x] Integration tests after components (T029-T032 after T027)
- [x] Performance/accessibility before validation (T033-T037 before T039)
- [x] Quickstart.md scenarios executable (T039)

---

**Total Tasks**: 40
**Estimated Time**: 12-16 hours (with parallelization: 8-10 hours)
**Feature Ready**: After T040 validation checklist passes ✅
