# Tasks: Hotel Admin Dashboard

**Input**: Design documents from `/specs/001-voglio-creare-l/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: TypeScript 5.3+, Next.js 14, Express.js, Supabase
   → Structure: backend/ and frontend/ directories
2. Load design documents ✓
   → data-model.md: activity_logs table, branding enhancements
   → contracts/: 6 API endpoints identified
   → research.md: nanoid tokens, RLS policies, CSS custom properties
   → quickstart.md: 12-step user journey
3. Generate tasks by category ✓
4. Apply task rules ✓
5. Number tasks sequentially (T001-T042) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
9. Return: SUCCESS (42 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Web app structure** (from plan.md):
- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Tests: `backend/tests/`, `frontend/tests/`

---

## Phase 3.1: Setup & Dependencies

- [ ] **T001** Install backend dependencies: `nanoid` for token generation in `backend/package.json`
- [ ] **T002** [P] Create backend test directories: `backend/tests/contract/`, `backend/tests/integration/`, `backend/tests/unit/`
- [ ] **T003** [P] Create frontend test directory: `frontend/tests/e2e/`

---

## Phase 3.2: Database Migrations ⚠️ MUST COMPLETE BEFORE TESTS

- [ ] **T004** [P] Create migration `backend/migrations/001_create_activity_logs.sql` to create `activity_logs` table with RLS policies (see data-model.md)
- [ ] **T005** [P] Create migration `backend/migrations/002_add_branding_and_tokens.sql` to add `branding_config` to tenants, `organizer_token`/`participant_token`/`branding_overrides` to events (see data-model.md)
- [ ] **T006** Apply migrations to Supabase database using Supabase MCP or SQL editor

---

## Phase 3.3: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

**CRITICAL: These tests MUST be written and MUST FAIL before ANY backend implementation**

- [ ] **T007** [P] Contract test GET `/api/dashboard/metrics/:tenantId` in `backend/tests/contract/dashboard-metrics.test.ts` - verify response schema matches OpenAPI spec
- [ ] **T008** [P] Contract test GET `/api/dashboard/activity/:tenantId` in `backend/tests/contract/dashboard-activity.test.ts` - verify activities array structure
- [ ] **T009** [P] Contract test GET `/api/events/:eventId/tokens` in `backend/tests/contract/event-tokens.test.ts` - verify organizer_token and participant_token returned
- [ ] **T010** [P] Contract test GET `/api/tenants/:tenantId/branding` in `backend/tests/contract/tenant-branding-get.test.ts` - verify branding_config structure
- [ ] **T011** [P] Contract test PUT `/api/tenants/:tenantId/branding` in `backend/tests/contract/tenant-branding-put.test.ts` - verify request validation and success response
- [ ] **T012** [P] Contract test PUT `/api/events/:eventId/branding` in `backend/tests/contract/event-branding-put.test.ts` - verify branding_overrides structure with customizable flags

---

## Phase 3.4: Backend Core Implementation (ONLY after contract tests are failing)

### Models & Types

- [ ] **T013** [P] Create TypeScript interfaces in `backend/src/models/activity.ts` for ActivityLog type (see data-model.md)
- [ ] **T014** [P] Create TypeScript interfaces in `backend/src/models/branding.ts` for BrandingConfig, BrandingOverrides, Advertisement types

### Services

- [ ] **T015** [P] Create `backend/src/services/metrics.ts` with `getDashboardMetrics(tenantId)` function using Supabase aggregation queries (see research.md)
- [ ] **T016** [P] Create `backend/src/services/activityLogger.ts` with `logActivity()` helper function for inserting activity_logs
- [ ] **T017** Create `backend/src/services/branding.ts` with `resolveEventBranding(hotelBranding, eventOverrides)` inheritance logic (see research.md)

### API Routes

- [ ] **T018** Create `backend/src/routes/dashboard.ts` with GET `/metrics/:tenantId` endpoint calling metrics service
- [ ] **T019** Add GET `/activity/:tenantId?limit=5` endpoint to `backend/src/routes/dashboard.ts` querying activity_logs with tenant filter
- [ ] **T020** Add GET `/events/:eventId/tokens` endpoint to existing `backend/src/routes/events.ts` returning organizer_token and participant_token
- [ ] **T021** Create `backend/src/routes/branding.ts` with GET `/tenants/:tenantId/branding` endpoint
- [ ] **T022** Add PUT `/tenants/:tenantId/branding` endpoint to `backend/src/routes/branding.ts` with hex color validation
- [ ] **T023** Add PUT `/events/:eventId/branding` endpoint to `backend/src/routes/branding.ts` validating customizable flags

### Middleware & Integration

- [ ] **T024** Update `backend/src/routes/events.ts` to auto-generate tokens on event creation using nanoid (see research.md)
- [ ] **T025** Add activity logging calls to event creation, branding updates in respective routes using activityLogger service
- [ ] **T026** Register dashboard and branding routes in `backend/src/app.ts`

---

## Phase 3.5: Frontend Components (ONLY after backend routes implemented)

### Dashboard Page

- [ ] **T027** [P] Create `frontend/src/app/admin/dashboard/page.tsx` as Server Component fetching metrics and activity from backend API
- [ ] **T028** [P] Create `frontend/src/components/dashboard/MetricCard.tsx` Client Component displaying metric value with trend indicator (up/down arrow)
- [ ] **T029** [P] Create `frontend/src/components/dashboard/ActivityLog.tsx` Client Component displaying list of 3-5 recent activities with icons and timestamps
- [ ] **T030** [P] Create `frontend/src/components/dashboard/QuickActions.tsx` Client Component with "Create New Event" and "View All Events" buttons

### Branding Components

- [ ] **T031** [P] Create `frontend/src/components/branding/BrandingEditor.tsx` Client Component with ColorPicker, LogoUploader, and Advertisements list
- [ ] **T032** [P] Create `frontend/src/components/branding/ColorPicker.tsx` Client Component using HTML color input with hex validation
- [ ] **T033** [P] Create `frontend/src/components/branding/LogoUploader.tsx` Client Component for image upload to Supabase Storage
- [ ] **T034** [P] Create `frontend/src/components/branding/CustomizationFlags.tsx` Client Component with toggle switches for per-element customizable flags
- [ ] **T035** [P] Create `frontend/src/components/branding/BrandingPreview.tsx` Client Component applying CSS custom properties in real-time (see research.md)

### Event & Token Components

- [ ] **T036** [P] Create `frontend/src/components/events/TokenDisplay.tsx` Client Component showing token with copy-to-clipboard button (see quickstart.md Step 6)

### Pages Integration

- [ ] **T037** Update `frontend/src/app/admin/branding/page.tsx` to use BrandingEditor component with hotel branding data
- [ ] **T038** Update `frontend/src/app/admin/events/[id]/page.tsx` to display TokenDisplay component and event branding editor
- [ ] **T039** Create `frontend/src/app/admin/settings/page.tsx` with placeholder for admin settings (notifications, account)
- [ ] **T040** Update `frontend/src/app/login/page.tsx` to redirect to `/admin/dashboard` after successful login (see quickstart.md Step 1)
- [ ] **T041** Update `frontend/src/middleware.ts` to redirect authenticated users from `/login` to `/admin/dashboard` (see research.md)

---

## Phase 3.6: Integration Tests

- [ ] **T042** Create `frontend/tests/e2e/dashboard-journey.spec.ts` implementing all 12 steps from quickstart.md using Playwright

---

## Dependencies

### Sequential Chains:
1. **Setup**: T001-T003 (no dependencies)
2. **Migrations**: T004-T006 → must complete before T007-T012
3. **Contract Tests**: T007-T012 → must FAIL before T013-T026
4. **Backend Models**: T013-T014 → blocks T015-T017
5. **Backend Services**: T015-T017 → blocks T018-T023
6. **Backend Routes**: T018-T023 → blocks T024-T026
7. **Backend Integration**: T024-T026 → must complete before T027-T041
8. **Frontend Components**: T027-T036 (all [P] - different files)
9. **Frontend Pages**: T037-T041 (some modify same files, not all [P])
10. **E2E Tests**: T042 → requires all frontend pages complete

### Critical Dependencies:
- T006 (apply migrations) blocks T007-T012 (tests need schema)
- T007-T012 (failing tests) blocks T013-T026 (implementation)
- T015 (metrics service) blocks T018 (metrics endpoint)
- T016 (activity logger) blocks T019, T025 (activity endpoints/calls)
- T018-T023 (backend routes) blocks T027 (dashboard page data fetching)
- T036 (TokenDisplay) required for T038 (event details page)

---

## Parallel Execution Examples

### Parallel Group 1: Setup (T001-T003)
```bash
# All setup tasks are independent
Task: "Install nanoid in backend/package.json"
Task: "Create backend test directories"
Task: "Create frontend test directory"
```

### Parallel Group 2: Migrations (T004-T005)
```bash
# Migration files are independent
Task: "Create migration 001_create_activity_logs.sql"
Task: "Create migration 002_add_branding_and_tokens.sql"
# Then run T006 sequentially to apply both
```

### Parallel Group 3: Contract Tests (T007-T012)
```bash
# All contract test files are independent
Task: "Contract test GET /api/dashboard/metrics/:tenantId"
Task: "Contract test GET /api/dashboard/activity/:tenantId"
Task: "Contract test GET /api/events/:eventId/tokens"
Task: "Contract test GET /api/tenants/:tenantId/branding"
Task: "Contract test PUT /api/tenants/:tenantId/branding"
Task: "Contract test PUT /api/events/:eventId/branding"
```

### Parallel Group 4: Backend Models (T013-T014)
```bash
# Different model files
Task: "Create ActivityLog types in backend/src/models/activity.ts"
Task: "Create Branding types in backend/src/models/branding.ts"
```

### Parallel Group 5: Backend Services (T015-T016)
```bash
# Different service files
Task: "Create metrics service"
Task: "Create activityLogger service"
# T017 depends on T014, run after
```

### Parallel Group 6: Frontend Dashboard Components (T027-T030)
```bash
# All different component files
Task: "Create dashboard page.tsx"
Task: "Create MetricCard.tsx"
Task: "Create ActivityLog.tsx"
Task: "Create QuickActions.tsx"
```

### Parallel Group 7: Frontend Branding Components (T031-T036)
```bash
# All different component files
Task: "Create BrandingEditor.tsx"
Task: "Create ColorPicker.tsx"
Task: "Create LogoUploader.tsx"
Task: "Create CustomizationFlags.tsx"
Task: "Create BrandingPreview.tsx"
Task: "Create TokenDisplay.tsx"
```

---

## Notes

- **[P] tasks** = different files, can run in parallel
- **No [P]** = same file or has dependencies, must run sequentially
- Verify contract tests (T007-T012) **FAIL** before starting T013
- Commit after each completed task
- Use `quickstart.md` as validation after T042 complete

---

## Validation Checklist
*GATE: Verify before marking tasks complete*

- [x] All 6 API contracts have corresponding tests (T007-T012)
- [x] All entities have model/type tasks (T013-T014)
- [x] All tests come before implementation (T007-T012 before T013-T026)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task

---

## Estimated Completion Time

- **Phase 3.1-3.2** (Setup + Migrations): ~2 hours
- **Phase 3.3** (Contract Tests): ~3 hours (can parallelize)
- **Phase 3.4** (Backend Implementation): ~8 hours
- **Phase 3.5** (Frontend Components): ~10 hours (many components, can parallelize)
- **Phase 3.6** (E2E Tests): ~2 hours

**Total**: ~25 hours (can reduce to ~18 hours with parallel execution)

---

**Status**: ✅ Tasks generated, ready for execution via `/implement` or manual execution
