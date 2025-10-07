# Tasks: Event Flow Management

**Feature**: 003-ora-facciamo-il
**Input**: Design documents from `/specs/003-ora-facciamo-il/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

---

## Execution Summary

**Tech Stack**: TypeScript 5.3+, Node.js 20 LTS, Next.js 14, Express.js, Supabase, Tailwind CSS
**Project Type**: Web application (backend + frontend)
**Total Tasks**: 80
**Estimated Time**: ~34 hours

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Database Foundation (Sequential)

**Purpose**: Create schema for hierarchical event management with RLS policies

- [x] **T001** Create database migration script `backend/migrations/003-events-schema.sql` with 7 new tables: events (with slug, visibility, token_expiration_date, retention_policy), sessions (with display_order), speeches (with speaker_name, duration), slides (with storage_path, file_size, mime_type), access_tokens (with token, type enum, expires_at), event_metrics (with JSONB fields for premium metrics), activity_logs (with retention_days)
- [ ] **T002** Apply migration to local Supabase instance via Supabase Dashboard, verify all 7 tables created with correct column types and constraints
- [x] **T003** Create RLS policies in `backend/migrations/003-rls-policies.sql` for all tables with direct tenant_id checks (avoiding recursive joins from feature 002 lessons), enable RLS on all tables
- [x] **T004** Test RLS policies with multiple tenants: create test script `backend/tests/rls/tenant-isolation.test.ts` that verifies cross-tenant access is blocked for events, sessions, speeches, slides, activity_logs
- [x] **T005** Create indexes in `backend/migrations/003-indexes.sql` on all foreign keys (event_id, session_id, speech_id, tenant_id), access_tokens.token, events.slug, activity_logs.timestamp
- [x] **T006** Create cleanup function `cleanup_expired_logs()` in `backend/migrations/003-functions.sql` that deletes activity_logs older than retention_days, schedule with pg_cron or document for cron job setup

---

## Phase 3.2: Backend Models (Parallel)

**Purpose**: TypeScript interfaces and Supabase type definitions

- [x] **T007** [P] Implement Event model in `backend/src/models/event.ts` with interface matching database schema (id, tenant_id, slug, name, date, description, visibility enum, status enum, token_expiration_date, retention_policy enum, timestamps), export type and validation schemas
- [x] **T008** [P] Implement Session model in `backend/src/models/session.ts` with interface (id, event_id, tenant_id, title, description, start_time, display_order, timestamps), validation for display_order uniqueness per event
- [x] **T009** [P] Implement Speech model in `backend/src/models/speech.ts` with interface (id, session_id, tenant_id, title, speaker_name, duration, description, display_order, timestamps), validation for duration range (1-600 minutes)
- [x] **T010** [P] Implement Slide model in `backend/src/models/slide.ts` with interface (id, speech_id, tenant_id, filename, storage_path, file_size, mime_type, display_order, uploaded_by, uploaded_at), validation for file_size (max 100MB) and allowed mime types
- [x] **T011** [P] Implement AccessToken model in `backend/src/models/accessToken.ts` with interface (id, event_id, token, type enum ['organizer', 'participant'], expires_at, created_at, last_used_at, use_count), helper methods for expiration checks
- [x] **T012** [P] Implement EventMetrics model in `backend/src/models/eventMetrics.ts` with interface (id, event_id, tenant_id, page_views, total_slide_downloads, unique_visitors JSONB, per_slide_downloads JSONB, per_speech_downloads JSONB, geographic_data JSONB, device_types JSONB, access_timeline JSONB, updated_at)
- [x] **T013** [P] Implement ActivityLog model in `backend/src/models/activityLog.ts` with interface (id, event_id, tenant_id, timestamp, actor_type enum, action_type enum, filename, file_size, slide_id, speech_id, session_id, retention_days, metadata JSONB)

---

## Phase 3.3: Contract Tests First (TDD Red Phase) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation

- [x] **T014** [P] Copy contract test from `specs/003-ora-facciamo-il/contracts/events.contract.test.ts` to `backend/tests/contract/events.test.ts`, verify import paths for Vitest and supertest work
- [ ] **T015** Run contract tests with `npm test backend/tests/contract/events.test.ts` and verify ALL tests FAIL with connection errors or 404 responses (no routes implemented yet), document failures in test output
- [x] **T016** Create test documentation in `backend/tests/contract/README.md` explaining TDD approach: tests written first, expected to fail, will pass after implementation in Phase 3.4-3.6

---

## Phase 3.4: Backend Services (Test-Driven Implementation)

**Purpose**: Business logic for event management, token generation, file operations

- [x] **T017** Implement TokenService in `backend/src/services/tokenService.ts` with methods: generateToken() using nanoid (21 chars), validateToken(token) checking database + expiration, updateLastUsed(tokenId), exports TokenService class
- [x] **T018** Implement EventFlowService in `backend/src/services/eventFlowService.ts` with methods: createEvent(data) handling public/private logic, generateTokens(eventId) creating organizer + participant tokens, updateEvent(id, data) with past event validation, deleteEvent(id) with cascade cleanup, listEvents(tenantId, filters), getEventWithHierarchy(id) loading sessions/speeches/slides, exports EventFlowService class
- [x] **T019** Implement SessionService in `backend/src/services/sessionService.ts` with methods: createSession(eventId, data), updateSession(id, data), deleteSession(id) with cascade warning, reorderSessions(eventId, newOrder) updating display_order values, listSessions(eventId), exports SessionService class
- [x] **T020** Implement SpeechService in `backend/src/services/speechService.ts` with methods: createSpeech(sessionId, data), updateSpeech(id, data), deleteSpeech(id) with slide count check, reorderSpeeches(sessionId, newOrder), listSpeeches(sessionId), exports SpeechService class
- [x] **T021** Implement SlideService in `backend/src/services/slideService.ts` with methods: uploadSlide(speechId, file, order) uploading to Supabase Storage path `slides/{tenant_id}/{event_id}/{filename}`, getDownloadUrl(slideId) generating signed URL (1 hour expiry), deleteSlide(id) removing from storage + database, generateZIP(eventId, res) streaming ZIP with folder structure `{SessionTitle}/{SpeechTitle}/{filename}`, exports SlideService class
- [x] **T022** Implement MetricsService in `backend/src/services/metricsService.ts` with methods: trackPageView(eventId, ip, metadata), trackDownload(eventId, slideId, actorType), getMetrics(eventId, tenantPlan) filtering fields based on free/premium, initializeMetrics(eventId) creating default row, exports MetricsService class
- [x] **T023** Implement RateLimitService in `backend/src/services/rateLimitService.ts` configuring express-rate-limit with windowMs: 3600000 (1 hour), max: 100, Redis store for production (check NODE_ENV), memory store for development, custom handler returning 429 with retry-after header, exports rateLimiter middleware

---

## Phase 3.5: Backend Middleware

**Purpose**: Request authentication, rate limiting, tenant context

- [x] **T024** Implement TokenAuth middleware in `backend/src/middleware/tokenAuth.ts` that extracts token from query param, calls TokenService.validateToken(), sets req.user with token data and event info, handles invalid/expired tokens with 403, exports authenticateToken middleware
- [x] **T025** Implement RateLimit middleware in `backend/src/middleware/rateLimit.ts` importing rateLimiter from RateLimitService, applying to public routes, exports applyRateLimit middleware
- [x] **T026** Implement TenantIsolation middleware in `backend/src/middleware/tenantIsolation.ts` that sets `app.current_tenant_id` PostgreSQL variable from req.user.tenant_id for RLS policy enforcement, exports setTenantContext middleware

---

## Phase 3.6: Backend API Routes

**Purpose**: Express route handlers connecting services to HTTP endpoints

- [x] **T027** Implement Events routes in `backend/src/routes/eventFlowRoutes.ts` with endpoints: POST / (createEvent with admin auth), GET / (listEvents with pagination), GET /:id (getEvent with token or admin auth), PUT /:id (updateEvent with past event confirmation header check), DELETE /:id (deleteEvent admin only), mount on /api/events
- [x] **T028** Implement TokensPDF route in `backend/src/routes/eventFlowRoutes.ts` at GET /:eventId/tokens/pdf (admin only) that calls EventService.generateTokensPDF() using pdfkit + qrcode, returns PDF stream with Content-Type: application/pdf, Content-Disposition: attachment
- [x] **T029** Implement Sessions routes in `backend/src/routes/sessionRoutes.ts` with endpoints: POST /events/:eventId/sessions (createSession organizer token required), GET /sessions/:id, PUT /sessions/:id (updateSession), DELETE /sessions/:id (deleteSession with confirmation), POST /sessions/:id/reorder (reorder with new display_order array), mount on /api
- [x] **T030** Implement session update/delete in `backend/src/routes/sessionRoutes.ts` handling PUT /sessions/:sessionId (updateSession with organizer token), DELETE /sessions/:sessionId (deleteSession with cascade warning, organizer token), verify token permission middleware applied
- [x] **T031** Implement Speeches routes in `backend/src/routes/speechRoutes.ts` with endpoints: POST /sessions/:sessionId/speeches (createSpeech organizer token), GET /speeches/:id, PUT /speeches/:id (updateSpeech), DELETE /speeches/:id (deleteSpeech showing slide count in warning), POST /speeches/:id/reorder, mount on /api
- [x] **T032** Implement speech update/delete in `backend/src/routes/speechRoutes.ts` handling PUT /speeches/:speechId, DELETE /speeches/:speechId with organizer token requirement, cascade delete verification
- [x] **T033** Implement Slides upload route in `backend/src/routes/slideRoutes.ts` at POST /speeches/:speechId/slides using multer middleware for multipart/form-data, validating file size (<100MB), mime type (pdf, ppt, pptx, key, odp), calling SlideService.uploadSlide(), organizer token required, mount on /api
- [x] **T034** Implement Slide download route in `backend/src/routes/slideRoutes.ts` at GET /slides/:slideId/download that calls SlideService.getDownloadUrl(), logs download in ActivityLog, applies rate limiting, returns JSON with signed URL and expiration, token auth required
- [x] **T035** Implement Bulk ZIP download route in `backend/src/routes/eventFlowRoutes.ts` at GET /events/:eventId/slides/download-all that calls SlideService.generateZIP() streaming response, sets Content-Disposition header with filename pattern `{event-name}-slides-{date}.zip`, rate limiting applied, token auth required
- [x] **T036** Implement Dashboard route in `backend/src/routes/dashboardRoutes.ts` at GET /events/:eventId/dashboard (organizer token only) returning event, sessions with speeches and slides, metrics filtered by tenant plan, activity log with pagination, tenant_plan field from tenant lookup
- [x] **T037** Implement Public event page route in `backend/src/routes/publicRoutes.ts` at GET /events/:eventId/public (optional token for private events) returning event details, hierarchical session/speech/slide structure, no metrics or activity log, rate limiting applied

---

## Phase 3.7: Backend Tests Green Phase

**Purpose**: Verify contract tests now PASS after implementation

- [ ] **T038** Run contract tests `npm test backend/tests/contract/events.test.ts` and verify ALL tests now PASS (endpoints implemented, database connected, RLS working)
- [ ] **T039** Fix any failing tests by debugging services/routes: check error messages, verify Supabase connection, confirm RLS policies allow operations, add logging to identify issues
- [ ] **T040** Achieve 100% contract test coverage: run coverage report `npm test -- --coverage`, verify all endpoints in events-api.yaml have corresponding tests, add missing test cases if needed

---

## Phase 3.8: Frontend Components (Bottom-Up, Parallel)

**Purpose**: Reusable UI components for event management

- [ ] **T041** [P] Implement EventForm component in `frontend/src/components/events/EventForm.tsx` with form fields (name, date, description, visibility radio buttons), conditional token_expiration_date picker for private events, retention_policy dropdown, form validation using React Hook Form, submit handler calling eventApi.createEvent()
- [ ] **T042** [P] Implement TokenDisplay component in `frontend/src/components/events/TokenDisplay.tsx` showing organizer + participant tokens in separate cards, "Copy to Clipboard" buttons using navigator.clipboard, "Download as PDF" button calling `/api/events/{id}/tokens/pdf`, warning message about one-time display
- [ ] **T043** [P] Implement SessionForm component in `frontend/src/components/events/SessionForm.tsx` modal with fields (title, description, start_time), display_order hidden (auto-calculated), create/edit modes, submit calling sessionApi.createSession() or updateSession()
- [ ] **T044** [P] Implement SpeechForm component in `frontend/src/components/events/SpeechForm.tsx` modal with fields (title, speaker_name, duration in minutes, description), display_order auto-calculated, submit calling speechApi.createSpeech() or updateSpeech()
- [ ] **T045** [P] Implement SlideUpload component in `frontend/src/components/events/SlideUpload.tsx` with file input (accept: .pdf,.ppt,.pptx,.key,.odp), drag-and-drop zone using react-dropzone, file size validation (<100MB client-side), upload progress bar, calling slideApi.uploadSlide() with multipart/form-data
- [ ] **T046** [P] Implement SessionTree component in `frontend/src/components/events/SessionTree.tsx` displaying hierarchical structure with expand/collapse icons, sessions as top-level items, speeches nested, slides nested further, edit/delete buttons per item, reorder drag handles using @dnd-kit/sortable
- [ ] **T047** [P] Implement MetricsDashboard component in `frontend/src/components/events/MetricsDashboard.tsx` showing basic metrics (page views, downloads) for all plans, premium metrics (unique visitors, geo data, device types) conditionally rendered based on tenantPlan prop, charts using recharts library
- [ ] **T048** [P] Implement ActivityLog component in `frontend/src/components/events/ActivityLog.tsx` table with columns (timestamp, actor type, action, filename, context breadcrumb), pagination controls, filter dropdowns (actor type, action type), reverse chronological order by default
- [ ] **T049** [P] Implement DownloadButtons component in `frontend/src/components/events/DownloadButtons.tsx` showing individual "Download" button per slide calling slideApi.download(), "Download All as ZIP" button for entire event, "Download Speech Slides" button per speech for partial ZIP
- [ ] **T050** [P] Implement ConfirmDialog component in `frontend/src/components/shared/ConfirmDialog.tsx` generic modal with title, message, confirm/cancel buttons, danger variant for deletes, callback on confirm action
- [ ] **T051** [P] Implement DoubleConfirm component in `frontend/src/components/shared/DoubleConfirm.tsx` modal with warning message, checkbox "I understand this affects existing links", "Confirm Changes" button disabled until checkbox checked, callback on final confirmation

---

## Phase 3.9: Frontend API Services (Parallel)

**Purpose**: Fetch wrappers for backend API calls

- [ ] **T052** [P] Implement eventApi in `frontend/src/services/eventApi.ts` with functions: createEvent(data), listEvents(filters), getEvent(id, token), updateEvent(id, data, confirmHeader), deleteEvent(id), downloadTokensPDF(id), all using fetch with JSON headers, error handling returning typed responses
- [ ] **T053** [P] Implement sessionApi in `frontend/src/services/sessionApi.ts` with functions: createSession(eventId, data, token), updateSession(id, data, token), deleteSession(id, token), reorderSessions(eventId, newOrder, token), fetch calls to /api/sessions endpoints
- [ ] **T054** [P] Implement speechApi in `frontend/src/services/speechApi.ts` with functions: createSpeech(sessionId, data, token), updateSpeech(id, data, token), deleteSpeech(id, token), reorderSpeeches(sessionId, newOrder, token), fetch calls to /api/speeches endpoints
- [ ] **T055** [P] Implement slideApi in `frontend/src/services/slideApi.ts` with functions: uploadSlide(speechId, file, token) using FormData for multipart, downloadSlide(slideId, token) returning signed URL, downloadAllZIP(eventId, token) triggering browser download, downloadSpeechZIP(speechId, token)
- [ ] **T056** [P] Implement pdfGenerator in `frontend/src/services/pdfGenerator.ts` (optional client-side fallback) using jsPDF and qrcode libraries to generate token PDF if backend PDF generation fails, matching same format as backend version

---

## Phase 3.10: Frontend Pages (Sequential within pages, depends on components)

**Purpose**: Next.js 14 App Router pages integrating components

- [ ] **T057** Implement event list page in `frontend/src/app/admin/events/page.tsx` (admin route) displaying table of events with filters (status dropdown, search by name), pagination controls, "Create Event" button linking to /admin/events/new, using eventApi.listEvents()
- [ ] **T058** Implement create event page in `frontend/src/app/admin/events/new/page.tsx` rendering EventForm component, on success showing TokenDisplay component if private event, "Continue to Dashboard" button linking to event dashboard
- [ ] **T059** Implement event details page in `frontend/src/app/admin/events/[id]/page.tsx` showing event header (name, date, status, visibility), session/speech/slide summary counts, "Edit Event" button, "View Dashboard" button (generates organizer token URL)
- [ ] **T060** Implement edit event page in `frontend/src/app/admin/events/[id]/edit/page.tsx` rendering EventForm in edit mode, if event status is 'past' showing DoubleConfirm component before submit, on success redirecting to event details page
- [ ] **T061** Implement organizer dashboard page in `frontend/src/app/events/[slug]/dashboard/page.tsx` (token auth via query param) rendering SessionTree component, MetricsDashboard component, ActivityLog component, "Add Session" button, using dashboardApi.getDashboard(eventId, token)
- [ ] **T062** Implement public event page in `frontend/src/app/events/[slug]/page.tsx` (optional token auth) rendering event header, hierarchical agenda (sessions as accordions, speeches as cards, slides as list items with DownloadButtons), mobile responsive layout, using publicApi.getPublicEvent(eventId, token)

---

## Phase 3.11: Integration Tests (Quickstart Scenarios, Parallel)

**Purpose**: Validate end-to-end user flows from quickstart.md

- [ ] **T063** [P] Implement eventFlow test in `frontend/tests/integration/eventFlow.test.tsx` simulating: admin creates private event → tokens displayed → PDF download triggered → event created in database, using Playwright or Cypress, verifying tokens in database
- [ ] **T064** [P] Implement tokenAccess test in `frontend/tests/integration/tokenAccess.test.tsx` testing: valid token grants access to event page → invalid token shows 403 → expired token shows expiration error → organizer token accesses dashboard → participant token denied dashboard access
- [ ] **T065** [P] Implement hierarchyManagement test in `frontend/tests/integration/hierarchyManagement.test.tsx` testing: create session within event → create speech within session → upload slide to speech → verify hierarchical display → reorder sessions/speeches/slides → verify new order persists
- [ ] **T066** [P] Implement downloadFlow test in `frontend/tests/integration/downloadFlow.test.tsx` testing: individual slide download returns signed URL → file downloads successfully → bulk ZIP download returns ZIP file → ZIP contains correct folder structure → speech-level ZIP download works
- [ ] **T067** [P] Implement metricsTracking test in `frontend/tests/integration/metricsTracking.test.tsx` testing: page view increments metrics → slide download logs activity → activity log shows correct actor type → metrics filtered by tenant plan (free vs premium)
- [ ] **T068** [P] Implement rateLimiting test in `frontend/tests/integration/rateLimiting.test.tsx` testing: 101 rapid requests to public endpoint → first 100 succeed → 101st returns 429 → retry-after header present → after wait period requests succeed again
- [ ] **T069** [P] Implement pastEventEditing test in `frontend/tests/integration/pastEventEditing.test.tsx` testing: update past event without confirmation header fails → with confirmation succeeds → double confirmation UI appears → checkbox must be checked before button enables → edit saves successfully

---

## Phase 3.12: Performance & Polish (Parallel)

**Purpose**: Optimization, loading states, error handling

- [ ] **T070** [P] Optimize ZIP streaming in `backend/src/services/slideService.ts` by implementing chunked streaming (don't load all files in memory), test with 100+ slides totaling >500MB, verify memory usage stays <200MB during ZIP generation using Node.js heap profiling
- [ ] **T071** [P] Add loading states to all async operations: EventForm shows spinner during submit, SlideUpload shows progress percentage, dashboard shows skeleton loaders while fetching, downloads show "Generating ZIP..." message, implement in respective component files
- [ ] **T072** [P] Add error boundaries to pages in `frontend/src/app/error.tsx` (global) and `frontend/src/app/events/[slug]/error.tsx` (event-specific) catching React errors, displaying user-friendly message with "Try Again" button, logging errors to console
- [ ] **T073** [P] Implement toast notifications using react-hot-toast library: success toasts for creates/updates/deletes, error toasts with descriptive messages, info toasts for copy-to-clipboard actions, configure in `frontend/src/app/layout.tsx` with Toaster component
- [ ] **T074** [P] Add breadcrumb navigation in `frontend/src/components/events/Breadcrumb.tsx` showing Event > Session > Speech > Slide path on dashboard page, clickable links to parent levels, highlight current level, render in dashboard layout
- [ ] **T075** [P] Implement drag-and-drop reordering using @dnd-kit/sortable in SessionTree component: sessions reorderable within event, speeches reorderable within session, slides reorderable within speech, on drop calling respective reorder API endpoints, optimistic UI updates

---

## Phase 3.13: Documentation & Deployment (Sequential)

**Purpose**: Final documentation and staging deployment

- [ ] **T076** Update project README at `README.md` adding "Feature 003: Event Flow Management" section documenting: what's new (hierarchical events, token-based access, metrics), setup steps (run migrations, set env vars), usage examples (create event, upload slides), link to quickstart.md
- [ ] **T077** Document environment variables in `.env.example` adding: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL (optional), APP_URL (for QR codes in PDFs), NODE_ENV, with descriptions and example values, copy to backend and frontend directories
- [ ] **T078** Create Supabase migration files for deployment in `supabase/migrations/` directory: copy backend/migrations/003-*.sql files, verify migration order (schema → RLS → indexes → functions), test applying to fresh Supabase instance, document rollback procedures
- [ ] **T079** Execute full quickstart.md flow end-to-end following all steps from Part 1 through Part 5, verify every curl command works, check UI flows match descriptions, validate success criteria (performance targets, security checks), fix any discrepancies found
- [ ] **T080** Deploy to staging environment: push code to staging branch, run migrations on staging Supabase, deploy backend to staging server (Vercel/Railway), deploy frontend to staging Vercel, smoke test critical paths (create event, upload slide, download ZIP), verify production Redis rate limiting works

---

## Dependencies

### Critical Paths (Cannot Parallelize)
- **T001-T006** (Database) MUST complete before all other phases
- **T014-T016** (Contract Tests) MUST complete before T017-T037 (Implementation)
- **T007-T013** (Models) MUST complete before T017-T023 (Services)
- **T017-T023** (Services) MUST complete before T024-T037 (Routes)
- **T038-T040** (Tests Green) MUST complete before T063-T069 (Integration Tests)
- **T041-T056** (Components/Services) MUST complete before T057-T062 (Pages)
- **T057-T062** (Pages) MUST complete before T079 (Quickstart validation)

### Dependency Graph
```
T001-T006 → T007-T013 (models)
T007-T013 → T014-T016 (contract tests must fail)
T014-T016 → T017-T023 (services implement logic)
T017-T023 → T024-T026 (middleware uses services)
T024-T026 → T027-T037 (routes use middleware + services)
T027-T037 → T038-T040 (tests should pass)
T038-T040 → T063-T069 (integration tests verify flows)

T041-T056 (frontend can start after T027-T037)
T041-T056 → T057-T062 (pages use components)
T057-T062 → T063-T069 (integration tests need pages)
T063-T069 → T079 (quickstart needs all flows)
T079 → T080 (deploy only after validation)
```

---

## Parallel Execution Examples

### Phase 3.2: Backend Models (Run Together)
```bash
# Launch T007-T013 simultaneously (7 different files):
Task: "Implement Event model in backend/src/models/event.ts"
Task: "Implement Session model in backend/src/models/session.ts"
Task: "Implement Speech model in backend/src/models/speech.ts"
Task: "Implement Slide model in backend/src/models/slide.ts"
Task: "Implement AccessToken model in backend/src/models/accessToken.ts"
Task: "Implement EventMetrics model in backend/src/models/eventMetrics.ts"
Task: "Implement ActivityLog model in backend/src/models/activityLog.ts"
```

### Phase 3.8: Frontend Components (Run Together)
```bash
# Launch T041-T051 simultaneously (11 different files):
Task: "Implement EventForm component in frontend/src/components/events/EventForm.tsx"
Task: "Implement TokenDisplay component in frontend/src/components/events/TokenDisplay.tsx"
Task: "Implement SessionForm component in frontend/src/components/events/SessionForm.tsx"
Task: "Implement SpeechForm component in frontend/src/components/events/SpeechForm.tsx"
Task: "Implement SlideUpload component in frontend/src/components/events/SlideUpload.tsx"
Task: "Implement SessionTree component in frontend/src/components/events/SessionTree.tsx"
Task: "Implement MetricsDashboard component in frontend/src/components/events/MetricsDashboard.tsx"
Task: "Implement ActivityLog component in frontend/src/components/events/ActivityLog.tsx"
Task: "Implement DownloadButtons component in frontend/src/components/events/DownloadButtons.tsx"
Task: "Implement ConfirmDialog component in frontend/src/components/shared/ConfirmDialog.tsx"
Task: "Implement DoubleConfirm component in frontend/src/components/shared/DoubleConfirm.tsx"
```

### Phase 3.9: Frontend API Services (Run Together)
```bash
# Launch T052-T056 simultaneously (5 different files):
Task: "Implement eventApi in frontend/src/services/eventApi.ts"
Task: "Implement sessionApi in frontend/src/services/sessionApi.ts"
Task: "Implement speechApi in frontend/src/services/speechApi.ts"
Task: "Implement slideApi in frontend/src/services/slideApi.ts"
Task: "Implement pdfGenerator in frontend/src/services/pdfGenerator.ts"
```

### Phase 3.11: Integration Tests (Run Together)
```bash
# Launch T063-T069 simultaneously (7 different test files):
Task: "Implement eventFlow test in frontend/tests/integration/eventFlow.test.tsx"
Task: "Implement tokenAccess test in frontend/tests/integration/tokenAccess.test.tsx"
Task: "Implement hierarchyManagement test in frontend/tests/integration/hierarchyManagement.test.tsx"
Task: "Implement downloadFlow test in frontend/tests/integration/downloadFlow.test.tsx"
Task: "Implement metricsTracking test in frontend/tests/integration/metricsTracking.test.tsx"
Task: "Implement rateLimiting test in frontend/tests/integration/rateLimiting.test.tsx"
Task: "Implement pastEventEditing test in frontend/tests/integration/pastEventEditing.test.tsx"
```

---

## Validation Checklist

**Verified during task generation:**
- [x] All contracts have corresponding tests (T014: events.contract.test.ts)
- [x] All 7 entities have model tasks (T007-T013)
- [x] All tests come before implementation (T014-T016 before T017-T037)
- [x] Parallel tasks are truly independent (different files, no shared state)
- [x] Each task specifies exact file path (all tasks include paths)
- [x] No [P] task modifies same file as another [P] task (verified)
- [x] TDD cycle enforced (contract tests fail → implementation → tests pass)
- [x] All quickstart scenarios have integration tests (T063-T069 cover Parts 1-5)
- [x] Performance targets testable (T070: <200MB memory, T079: <1s page load)
- [x] Constitution principles followed (Security: RLS policies T003, TDD: T014-T016, Multi-tenant: T004)

---

## Notes

### TDD Enforcement
- **Phase 3.3 (T014-T016) is CRITICAL**: Contract tests MUST be written and verified to FAIL before proceeding
- Do NOT skip to implementation (T017-T037) until tests are failing
- After implementation, tests MUST all PASS (T038-T040)

### Parallel Execution
- [P] tasks can run simultaneously across multiple terminals or CI workers
- Maximize parallelization in Phases 3.2, 3.8, 3.9, 3.11, 3.12 for faster completion
- Estimated time savings: ~40% when running 7+ parallel tasks

### Constitution Compliance
- **No Easy Fixes**: All clarifications resolved in spec phase (11 questions answered)
- **Security First**: RLS policies (T003), token validation (T024), rate limiting (T025)
- **TDD**: Tests written first (T014-T016), implementation after (T017-T037)
- **Multi-Tenant Isolation**: tenant_id on all tables (T001), RLS testing (T004)
- **UX-First**: Hierarchical tree view (T046), breadcrumbs (T074), drag-and-drop (T075)
- **Simplicity**: Standard patterns (Express services, Next.js pages), proven libraries (Supabase, pdfkit, archiver)

### Commit Strategy
- Commit after each completed task
- Use commit message format: `feat(003): T0XX - Task description`
- Example: `feat(003): T018 - Implement EventService with token generation`

### Rollback Procedures
If issues arise during implementation:
- Database migrations can be rolled back with `DROP TABLE` statements in reverse order
- Frontend changes can be reverted by checking out previous commit
- Backend services can be disabled by commenting out route mounts

---

## Success Criteria

**Feature 003 is complete when:**
- ✅ All 80 tasks completed
- ✅ All contract tests pass (T038-T040)
- ✅ All integration tests pass (T063-T069)
- ✅ Quickstart.md executes without errors (T079)
- ✅ Performance targets met: <1s page load, <10s uploads, <3s ZIP, <200MB memory (T070-T071)
- ✅ Constitution principles verified in code review
- ✅ Staging deployment successful (T080)

**Ready for production deployment** ✅
