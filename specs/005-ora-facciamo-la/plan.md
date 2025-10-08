# Implementation Plan: Event Management Dashboard

**Branch**: `005-ora-facciamo-la` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-ora-facciamo-la/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
2. Fill Technical Context ✅
3. Fill Constitution Check ✅
4. Evaluate Constitution Check ✅
5. Execute Phase 0 → research.md ✅
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✅
7. Re-evaluate Constitution Check ✅
8. Plan Phase 2 → Describe task generation approach ✅
9. STOP - Ready for /tasks command ✅
```

## Summary
**Primary Requirement**: Create a comprehensive event management dashboard that serves as a "mission control" for event organizers, consolidating event details, access tokens, metrics, sessions, speeches, and photos in a single page with inline management capabilities.

**Technical Approach**:
- **Frontend**: Next.js 14 App Router page at `/admin/events/[id]/dashboard` with client components for inline CRUD
- **Backend**: Express.js API endpoints for dashboard data aggregation and QR code generation
- **Database**: Leverage existing Feature 005 schema (events, sessions, speeches, event_photos, access_tokens)
- **Architecture**: Comprehensive hub pattern - single page loads all related data with optimistic UI updates

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**:
- Backend: Express.js, Supabase client, qrcode library (for QR generation)
- Frontend: Next.js 14, @supabase/auth-helpers-nextjs, clipboard API
**Storage**: Supabase PostgreSQL with existing RLS policies
**Testing**: Vitest (contract tests), integration tests for dashboard aggregation
**Target Platform**: Web (desktop and mobile responsive)
**Project Type**: Web (frontend + backend)
**Performance Goals**:
- Dashboard load (all data): < 2s
- Token copy: < 100ms
- QR download generation: < 500ms
- Inline CRUD operations: < 500ms
**Constraints**:
- No real-time updates (cached metrics refreshed periodically)
- RLS tenant isolation must be preserved
- Mobile clipboard API compatibility
**Scale/Scope**:
- Single event dashboard page
- Support events with 50+ sessions, 200+ speeches, 500+ photos
- Handle 100 concurrent admin users

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. No Easy Fixes ✅
- **Compliance**: Using existing Feature 005 infrastructure (no shortcuts)
- **Root cause approach**: QR generation via proper library (qrcode), not canvas hacks

### II. Security First ✅
- **RLS**: Reusing tenant-scoped RLS policies from Feature 005
- **Auth**: Supabase auth guards on both API and page level
- **Least privilege**: Dashboard read access for events, CRUD for owned resources

### III. Test-Driven Development (TDD) ✅
- **Contract tests first**: Dashboard endpoint, QR generation endpoint
- **Red-Green-Refactor**: Tests will fail initially (no dashboard endpoint exists)

### IV. Multi-Tenant Isolation ✅
- **Tenant scoping**: All queries filtered by admin's tenant_id
- **RLS enforcement**: Dashboard only shows tenant-owned events and resources
- **Test coverage**: Verify cross-tenant access denial

### V. UX-First Design ✅
- **User problem**: Eliminates multi-page navigation for event management
- **Performance**: < 2s dashboard load meets constitution target
- **Simplicity**: Single-page hub over complex navigation flows

### VI. Simplicity ✅
- **Proven stack**: Next.js + Express (existing)
- **No new patterns**: Standard Next.js page, Express REST endpoint
- **YAGNI**: No bulk operations (per clarifications), no real-time (cached metrics)

**Status**: ✅ PASS - All constitutional principles aligned

## Project Structure

### Documentation (this feature)
```
specs/005-ora-facciamo-la/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/          # (existing from Feature 005)
│   ├── services/
│   │   ├── dashboardService.ts  # NEW: Aggregates dashboard data
│   │   └── qrCodeService.ts     # NEW: Generates QR codes
│   ├── routes/
│   │   └── dashboard.ts         # NEW: Dashboard API endpoints
│   └── middleware/      # (existing auth/validation)
└── tests/
    ├── contract/
    │   ├── dashboard.test.ts    # NEW: Dashboard endpoint contracts
    │   └── qrCode.test.ts       # NEW: QR generation contracts
    └── integration/
        └── eventDashboard.test.ts  # NEW: Full dashboard flow

frontend/
├── src/
│   ├── app/admin/events/[id]/
│   │   └── dashboard/
│   │       └── page.tsx         # NEW: Dashboard page (Server Component)
│   ├── components/admin/
│   │   ├── EventDashboardOverview.tsx    # NEW: Event info + metrics
│   │   ├── TokenManager.tsx              # NEW: Token display + copy/download
│   │   ├── SessionManager.tsx            # (existing from Feature 005)
│   │   ├── SpeechManager.tsx             # (existing from Feature 005)
│   │   └── EventPhotoManager.tsx         # (existing from Feature 005)
│   └── services/
│       └── dashboardService.ts   # NEW: Dashboard API client
└── tests/
    └── integration/
        └── dashboard.test.ts     # NEW: UI integration tests
```

**Structure Decision**: Web application structure (Option 2) selected. Feature reuses existing backend/frontend split with Feature 005 infrastructure. New dashboard page consolidates existing manager components plus new token and overview components.

## Phase 0: Outline & Research

### Research Tasks
1. **QR Code Generation Best Practices**
   - Research: Node.js QR code libraries (qrcode vs qr-image)
   - Decision: Which library for server-side QR PNG generation?
   - Output: Library choice + usage pattern

2. **Clipboard API Cross-Browser Support**
   - Research: navigator.clipboard browser compatibility
   - Decision: Fallback strategy for older browsers?
   - Output: Copy implementation pattern

3. **Dashboard Data Aggregation Pattern**
   - Research: Best practice for loading related data (parallel vs sequential)
   - Decision: Single aggregated endpoint vs multiple endpoints?
   - Output: API design pattern

4. **Cached Metrics Implementation**
   - Research: Caching strategy (database materialized view vs application cache)
   - Decision: How to implement periodic refresh?
   - Output: Metrics caching approach

**Output**: `research.md` with consolidated findings and decisions

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Data Model (`data-model.md`)
**Entities** (all existing from Feature 005):
- Event (name, date, visibility, status, description)
- AccessToken (token, type, expires_at, use_count, last_used_at)
- Session (title, start_time, end_time, room)
- Speech (title, speaker, session_id, slide_count)
- EventPhoto (storage_path, caption, uploaded_at)

**New Aggregations**:
- DashboardData (combines Event + Tokens + Sessions + Speeches + Photos + Metrics)
- MetricsSummary (page_views, slide_downloads, participant_count)

### 2. API Contracts (`/contracts/`)

**GET /api/admin/events/:eventId/dashboard**
- Purpose: Load complete dashboard data
- Auth: Required (tenant-scoped)
- Response: DashboardData object
- Status: 200 (success), 403 (forbidden), 404 (not found)

**GET /api/admin/events/:eventId/tokens/:tokenId/qr**
- Purpose: Generate QR code PNG for participant token
- Auth: Required (tenant-scoped)
- Response: image/png binary
- Status: 200 (success), 403 (forbidden), 404 (not found)

### 3. Contract Tests
- `backend/tests/contract/dashboard.test.ts`
  - Test: GET dashboard returns correct structure
  - Test: GET dashboard enforces tenant isolation
  - Test: GET dashboard handles missing event

- `backend/tests/contract/qrCode.test.ts`
  - Test: GET QR returns valid PNG
  - Test: GET QR enforces tenant isolation
  - Test: GET QR validates token type (participant only)

### 4. Integration Tests
- `backend/tests/integration/eventDashboard.test.ts`
  - Scenario: Admin loads dashboard for owned event
  - Scenario: Admin copies token to clipboard (frontend test)
  - Scenario: Admin downloads QR code
  - Scenario: Admin performs inline session CRUD

### 5. Quickstart Test (`quickstart.md`)
```markdown
# Event Dashboard Quickstart

## Prerequisites
- Backend and frontend running
- Test tenant with admin user
- Sample event created

## Steps
1. Navigate to `/admin/events/[test-event-id]/dashboard`
2. Verify event overview displays
3. Verify metrics summary shows counts
4. Copy participant token → Check clipboard
5. Download QR code → Verify PNG file
6. Add new session inline → Verify saved
7. Edit speech inline → Verify updated
8. Upload event photo → Verify displayed
```

### 6. Update CLAUDE.md
Run update script to add:
- New dependencies: qrcode library
- New API patterns: Dashboard aggregation endpoint
- Recent changes: Feature 005 dashboard (keep last 3)

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Contract Tests** (TDD red phase):
   - Task: Write dashboard endpoint contract test [P]
   - Task: Write QR generation contract test [P]

2. **Backend Models** (reuse existing):
   - Task: Create DashboardData aggregation type [P]
   - Task: Create MetricsSummary type [P]

3. **Backend Services**:
   - Task: Implement dashboardService.getDashboardData()
   - Task: Implement qrCodeService.generateTokenQR()
   - Task: Implement metricsService.getCachedMetrics()

4. **Backend Routes**:
   - Task: Create GET /admin/events/:id/dashboard endpoint
   - Task: Create GET /admin/events/:id/tokens/:tokenId/qr endpoint

5. **Frontend Components**:
   - Task: Create EventDashboardOverview component [P]
   - Task: Create TokenManager component with copy/download [P]
   - Task: Create dashboard page at /admin/events/[id]/dashboard

6. **Frontend Services**:
   - Task: Create dashboardService API client

7. **Integration**:
   - Task: Wire dashboard page with all manager components
   - Task: Add navigation link from event list to dashboard

8. **Integration Tests**:
   - Task: Write full dashboard flow integration test
   - Task: Write token copy/download integration test

**Ordering Strategy**:
- TDD: Contract tests → Backend implementation → Frontend consumption
- Dependencies: Services before routes, components before pages
- [P] marks parallel tasks (independent files)

**Estimated Output**: ~18-20 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations - all constitution checks passed*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | N/A | N/A |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved (spec has 6 clarifications) ✅
- [x] Complexity deviations documented (none) ✅

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
