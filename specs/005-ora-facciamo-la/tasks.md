# Tasks: Event Management Dashboard

**Input**: Design documents from `/specs/005-ora-facciamo-la/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript 5.3+, Express.js, Next.js 14, qrcode library
   → Structure: Web app (backend/ + frontend/)
2. Load design documents ✅
   → data-model.md: DashboardData, MetricsSummary aggregations
   → contracts/: 2 API endpoints (dashboard data, QR generation)
   → research.md: Technical decisions documented
3. Generate tasks by category ✅
   → Setup: Dependencies (qrcode, node-cache)
   → Tests: 2 contract tests, 2 integration tests
   → Core: 5 backend services/routes, 4 frontend components
   → Integration: Component wiring, navigation links
   → Polish: Manual testing, performance validation
4. Apply task rules ✅
   → [P] for different files
   → Sequential for shared files
   → TDD: Tests before implementation
5. Number tasks sequentially ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
9. Return: SUCCESS (18 tasks ready)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **File paths** included for each task

## Path Conventions
- **Web app structure**: `backend/src/`, `frontend/src/`
- **Tests**: `backend/tests/contract/`, `backend/tests/integration/`, `frontend/tests/`

---

## Phase 3.1: Setup

### T001: Install Backend Dependencies
**File**: `backend/package.json`
**Action**: Add new npm dependencies for QR generation and caching
```bash
cd backend
npm install qrcode@1.5.3
npm install node-cache@5.1.2
npm install --save-dev @types/qrcode
```
**Verification**: Dependencies appear in package.json and node_modules/

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T002 [P]: Contract Test - Dashboard Endpoint
**File**: `backend/tests/contract/dashboard.test.ts` (NEW)
**Action**: Write contract test for `GET /api/admin/events/:eventId/dashboard`

Test cases:
1. Returns 200 with complete DashboardData structure for owned event
2. Returns 403 Forbidden for event from different tenant
3. Returns 404 Not Found for non-existent event
4. Returns empty tokens array for public events
5. Validates response schema matches DashboardData interface

**Dependencies**: None (parallel with T003)
**Expected**: Tests FAIL (endpoint not implemented yet)

**Reference**: `specs/005-ora-facciamo-la/contracts/dashboard-api.md` - Endpoint 1

---

### T003 [P]: Contract Test - QR Generation Endpoint
**File**: `backend/tests/contract/qrCode.test.ts` (NEW)
**Action**: Write contract test for `GET /api/admin/events/:eventId/tokens/:tokenId/qr`

Test cases:
1. Returns 200 with image/png content-type for valid participant token
2. Returns PNG binary data (Buffer, > 1KB)
3. Returns proper Content-Disposition header with filename
4. Returns 403 for organizer token (only participant tokens allowed)
5. Returns 403 for token from different tenant
6. Returns 404 for non-existent token

**Dependencies**: None (parallel with T002)
**Expected**: Tests FAIL (endpoint not implemented yet)

**Reference**: `specs/005-ora-facciamo-la/contracts/dashboard-api.md` - Endpoint 2

---

### T004 [P]: Integration Test - Dashboard Load Flow
**File**: `backend/tests/integration/eventDashboard.test.ts` (NEW)
**Action**: Write end-to-end integration test for dashboard data loading

Test scenarios:
1. Admin loads dashboard for owned private event → All data present
2. Admin loads dashboard for public event → Tokens array empty
3. Dashboard includes sessions ordered by start_time
4. Dashboard includes speeches with session relationships
5. Dashboard includes cached metrics (even if 0)
6. Failed auth returns 401

**Dependencies**: None (parallel with T002, T003)
**Expected**: Tests FAIL (services not implemented yet)

**Reference**: `specs/005-ora-facciamo-la/quickstart.md` - Test Scenario 1

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### T005 [P]: Create DashboardData & MetricsSummary Types
**File**: `backend/src/models/dashboard.ts` (NEW)
**Action**: Define TypeScript interfaces for dashboard aggregations

```typescript
export interface DashboardData {
  event: Event;
  tokens: AccessToken[];
  sessions: Session[];
  speeches: Speech[];
  photos: EventPhoto[];
  metrics: MetricsSummary;
}

export interface MetricsSummary {
  pageViews: number;
  slideDownloads: number;
  participantCount: number;
  lastRefreshed: string;
}
```

**Dependencies**: None (parallel with T006)
**Reference**: `specs/005-ora-facciamo-la/data-model.md` - New Aggregated Types

---

### T006 [P]: Create QR Code Generation Service
**File**: `backend/src/services/qrCodeService.ts` (NEW)
**Action**: Implement QR code PNG generation using qrcode library

Functions:
- `generateTokenQR(token: string, eventSlug: string): Promise<Buffer>`
  - Encodes URL: `${FRONTEND_URL}/events/${eventSlug}?token=${token}`
  - Returns PNG buffer (300x300px, error correction M, margin 2)

**Dependencies**: T001 (qrcode library installed)
**Reference**: `specs/005-ora-facciamo-la/research.md` - Section 1

---

### T007: Create Metrics Caching Service
**File**: `backend/src/services/metricsService.ts` (NEW or UPDATE existing)
**Action**: Implement cached metrics calculation with 5-minute TTL

Functions:
- `getCachedMetrics(eventId: string): Promise<MetricsSummary>`
  - Check node-cache for cached value
  - If miss: calculate from event_views, slide_downloads, token usage
  - Store in cache with 300s TTL
  - Return metrics with lastRefreshed timestamp

**Dependencies**: T001 (node-cache library installed)
**Blocks**: T008 (dashboard service needs this)
**Reference**: `specs/005-ora-facciamo-la/research.md` - Section 4

---

### T008: Create Dashboard Aggregation Service
**File**: `backend/src/services/dashboardService.ts` (NEW)
**Action**: Implement dashboard data aggregation with parallel queries

Functions:
- `getDashboardData(eventId: string, tenantId: string): Promise<DashboardData>`
  - Use Promise.all for 6 parallel Supabase queries:
    - events (single)
    - access_tokens (array, filtered by visibility)
    - sessions (ordered by start_time)
    - speeches (with session join)
    - event_photos (ordered by uploaded_at desc)
    - metrics (via metricsService.getCachedMetrics)
  - Return DashboardData object

**Dependencies**: T005 (types), T007 (metrics service)
**Blocks**: T009 (dashboard route needs this)
**Reference**: `specs/005-ora-facciamo-la/research.md` - Section 3

---

### T009: Create Dashboard API Route
**File**: `backend/src/routes/dashboard.ts` (NEW)
**Action**: Implement Express route for dashboard endpoint

Endpoint: `GET /admin/events/:eventId/dashboard`
- Validate eventId UUID format
- Get authenticated admin's tenant_id
- Call dashboardService.getDashboardData(eventId, tenantId)
- Handle errors: 403 (forbidden), 404 (not found), 500 (server error)
- Return JSON response

**Dependencies**: T008 (dashboard service)
**Blocks**: T002 tests should now pass
**Reference**: `specs/005-ora-facciamo-la/contracts/dashboard-api.md`

---

### T010: Create QR Generation API Route
**File**: `backend/src/routes/dashboard.ts` (UPDATE) or create new route file
**Action**: Implement Express route for QR generation endpoint

Endpoint: `GET /admin/events/:eventId/tokens/:tokenId/qr`
- Validate eventId and tokenId UUID format
- Verify token belongs to event and admin's tenant
- Verify token type is 'participant' (not 'organizer')
- Check token not expired
- Get event slug for URL
- Call qrCodeService.generateTokenQR(token, slug)
- Return PNG with headers:
  - Content-Type: image/png
  - Content-Disposition: attachment; filename="participant-token-{slug}.png"

**Dependencies**: T006 (QR service)
**Blocks**: T003 tests should now pass
**Reference**: `specs/005-ora-facciamo-la/contracts/dashboard-api.md`

---

### T011: Register Dashboard Routes in App
**File**: `backend/src/app.ts` (UPDATE)
**Action**: Mount dashboard routes in Express app

```typescript
import dashboardRoutes from './routes/dashboard';
app.use('/api/admin/events', dashboardRoutes);
```

**Dependencies**: T009, T010 (routes created)
**Verification**: Routes accessible via HTTP requests

---

## Phase 3.4: Frontend Implementation

### T012 [P]: Create EventDashboardOverview Component
**File**: `frontend/src/components/admin/EventDashboardOverview.tsx` (NEW)
**Action**: Create React component for event info + metrics display

Props: `{ event: Event; metrics: MetricsSummary }`

Displays:
- Event name, date, status badge, visibility icon
- Description (if present)
- Metrics cards: Page Views, Slide Downloads, Participant Count
- Last refreshed timestamp
- Navigation buttons: "Edit Event", "View Public Page"

**Dependencies**: None (parallel with T013, T014)
**Styling**: Tailwind CSS, match existing admin panel design

---

### T013 [P]: Create TokenManager Component
**File**: `frontend/src/components/admin/TokenManager.tsx` (NEW)
**Action**: Create React component for token display + copy/download

Props: `{ tokens: AccessToken[]; eventSlug: string }`

Features:
- Display organizer token with metadata (expiry, use count, last used)
- Display participant token with metadata
- "Copy" button for both tokens (navigator.clipboard.writeText with fallback)
- "Download QR" button for participant token only
- Visual feedback on successful copy (toast/checkmark)
- QR download calls `/api/admin/events/${eventId}/tokens/${tokenId}/qr`
- Hidden section if tokens array empty (public events)

**Dependencies**: None (parallel with T012, T014)
**Reference**: `specs/005-ora-facciamo-la/research.md` - Section 2 (Clipboard API)

---

### T014 [P]: Create Dashboard API Client Service
**File**: `frontend/src/services/dashboardService.ts` (NEW)
**Action**: Create TypeScript service for dashboard API calls

Functions:
- `fetchDashboardData(eventId: string, token: string): Promise<DashboardData>`
  - GET request to `/api/admin/events/${eventId}/dashboard`
  - Authorization: Bearer ${token}
  - Returns parsed DashboardData
  - Throws on errors (403, 404, 500)

- `downloadTokenQR(eventId: string, tokenId: string, token: string): Promise<void>`
  - GET request to `/api/admin/events/${eventId}/tokens/${tokenId}/qr`
  - Handles binary response
  - Triggers browser download

**Dependencies**: None (parallel with T012, T013)

---

### T015: Create Dashboard Page
**File**: `frontend/src/app/admin/events/[id]/dashboard/page.tsx` (NEW)
**Action**: Create Next.js Server Component for dashboard page

Implementation:
- Fetch dashboard data server-side using dashboardService
- Pass data to client components
- Error handling: 403 → redirect, 404 → not found page
- Layout:
  - EventDashboardOverview at top
  - TokenManager (if private event)
  - SessionManager (reuse from Feature 005)
  - SpeechManager (reuse from Feature 005)
  - EventPhotoManager (reuse from Feature 005)

**Dependencies**: T012, T013, T014 (components and service)
**Reference**: `specs/005-ora-facciamo-la/plan.md` - Project Structure

---

## Phase 3.5: Integration

### T016: Add Dashboard Navigation Links
**Files**:
- `frontend/src/components/dashboard/UpcomingEvents.tsx` (UPDATE)
- `frontend/src/app/admin/events/page.tsx` (UPDATE)

**Action**: Add "Dashboard" button/link to event list items

Changes:
- UpcomingEvents: Add "Dashboard" button alongside "Vedi" and "Modifica"
- Events list page: Add "Dashboard" action in event cards
- Link to: `/admin/events/${event.id}/dashboard`

**Dependencies**: T015 (dashboard page exists)
**Verification**: Navigate from event list → dashboard

---

## Phase 3.6: Polish

### T017 [P]: Run Manual Testing (Quickstart)
**File**: `specs/005-ora-facciamo-la/quickstart.md`
**Action**: Execute all 10 test scenarios manually

Complete:
1. Dashboard load & navigation
2. Event overview & metrics
3. Token management (copy/download QR)
4. Session management (inline CRUD)
5. Speech management (inline CRUD)
6. Photo gallery management
7. Empty states
8. Cross-tenant security (verify 403 errors)
9. Public event (no tokens section)
10. Performance validation (< 2s load, < 500ms operations)

**Dependencies**: T001-T016 (all implementation complete)
**Deliverable**: Mark each scenario PASS/FAIL in quickstart.md

---

### T018 [P]: Performance Validation
**Action**: Measure and verify performance targets

Metrics to validate:
- Dashboard load time: < 2s (use Chrome DevTools Network tab)
- Token copy response: < 100ms (measure feedback display)
- QR download generation: < 500ms (click to download start)
- Inline CRUD operations: < 500ms (measure optimistic UI update)

Test with:
- Empty event (baseline)
- Event with 50 sessions, 200 speeches, 500 photos (stress test)

**Dependencies**: T001-T016 (all implementation complete)
**Deliverable**: Performance report with actual measurements

---

## Dependencies

### Strict Ordering (Must Complete Before Next)
```
T001 (install deps)
  ↓
T002, T003, T004 [P] (write failing tests)
  ↓
T005, T006 [P] (create models & QR service)
  ↓
T007 (metrics service)
  ↓
T008 (dashboard service)
  ↓
T009, T010 (dashboard routes)
  ↓
T011 (register routes)
  ↓
T012, T013, T014 [P] (frontend components)
  ↓
T015 (dashboard page)
  ↓
T016 (navigation links)
  ↓
T017, T018 [P] (testing & validation)
```

### Parallel Groups
- **Group 1**: T002, T003, T004 (different test files)
- **Group 2**: T005, T006 (different service files, independent)
- **Group 3**: T012, T013, T014 (different component files)
- **Group 4**: T017, T018 (manual testing + performance)

---

## Parallel Execution Example

### Phase 3.2: Launch All Contract Tests Together
```bash
# Option 1: Sequential task agent commands
Task: "Write contract test for GET /api/admin/events/:eventId/dashboard in backend/tests/contract/dashboard.test.ts"
Task: "Write contract test for GET /api/admin/events/:eventId/tokens/:tokenId/qr in backend/tests/contract/qrCode.test.ts"
Task: "Write integration test for dashboard load flow in backend/tests/integration/eventDashboard.test.ts"

# Option 2: If using parallel execution tool
parallel-tasks T002 T003 T004
```

### Phase 3.3: Launch Independent Services Together
```bash
Task: "Create DashboardData and MetricsSummary TypeScript interfaces in backend/src/models/dashboard.ts"
Task: "Implement QR code generation service using qrcode library in backend/src/services/qrCodeService.ts"
```

### Phase 3.4: Launch Frontend Components Together
```bash
Task: "Create EventDashboardOverview React component in frontend/src/components/admin/EventDashboardOverview.tsx"
Task: "Create TokenManager React component with copy/download in frontend/src/components/admin/TokenManager.tsx"
Task: "Create dashboard API client service in frontend/src/services/dashboardService.ts"
```

---

## Notes

### TDD Enforcement
- **T002-T004 MUST fail** before starting T005
- Run `npm test` after T002-T004 to verify RED state
- Run `npm test` after T011 to verify GREEN state (T002-T003 pass)
- Run `npm test` after T015 to verify GREEN state (T004 passes)

### Component Reuse
- SessionManager, SpeechManager, EventPhotoManager already exist from Feature 005
- T015 imports and composes existing components (no new CRUD logic needed)
- Only NEW components: EventDashboardOverview, TokenManager

### File Conflicts
- T009 and T010 may share same route file → Execute sequentially
- T016 updates 2 files → Single task (not parallelizable)

### Verification Commands
```bash
# After T001
npm list qrcode node-cache

# After T002-T004 (tests should FAIL)
cd backend && npm test

# After T011 (contract tests should PASS)
cd backend && npm test tests/contract

# After T015 (integration tests should PASS)
cd backend && npm test tests/integration

# After T016 (start servers and verify manually)
cd backend && npm run dev
cd frontend && npm run dev
# Navigate to http://localhost:3000/admin/dashboard
```

---

## Task Generation Rules Applied
✅ Each contract file → contract test task [P]
✅ Each aggregation type → model creation task [P]
✅ Each endpoint → implementation task (sequential if same file)
✅ Each quickstart scenario → validation task
✅ Tests before implementation (TDD)
✅ Dependencies documented
✅ Parallel tasks marked [P]

## Validation Checklist
✅ All contracts have corresponding tests (T002, T003)
✅ All aggregations have model tasks (T005)
✅ All tests come before implementation (T002-T004 before T005-T011)
✅ Parallel tasks truly independent (different files)
✅ Each task specifies exact file path
✅ No [P] task modifies same file as another [P] task

---

**Total Tasks**: 18
**Parallel Groups**: 4 (saves ~30-40% development time)
**Estimated Completion**: 2-3 days (with testing)
**Prerequisites Complete**: ✅ All design documents ready
