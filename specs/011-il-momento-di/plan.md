# Implementation Plan: Public Event Page - Complete UI/UX Redesign

**Branch**: `011-il-momento-di` | **Date**: 2025-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-il-momento-di/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Loaded: 308 lines, 45 functional requirements, 5 clarifications resolved
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detected Web Application (frontend exists, backend decommissioned)
   → Structure: Frontend-only (serverless Next.js)
3. Fill the Constitution Check section
   → Loaded constitution.md (89 lines, 7 principles)
4. Evaluate Constitution Check section
   → No violations found
   → Update Progress Tracking: Initial Constitution Check ✅
5. Execute Phase 0 → research.md
   → Created: research.md (580 lines, 10 decisions, root cause analysis)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → Created: data-model.md (350 lines, 7 entities, API structures, queries)
   → Created: contracts/api-contracts.md (80 lines, 5 API contracts)
   → Created: quickstart.md (verification steps)
   → Pending: CLAUDE.md update via script
7. Re-evaluate Constitution Check section
   → No new violations
   → Update Progress Tracking: Post-Design Constitution Check ✅
8. Plan Phase 2 → Task generation approach described below
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Fix the broken public event page (`/events/[slug]`) by completing the serverless migration started in Feature 008, then enhance UI/UX to meet modern design standards.

**Root Cause**: The ShareHub public event page is non-functional due to incomplete Feature 008 (serverless migration). The backend was decommissioned before Next.js API routes were implemented, leaving the frontend calling non-existent endpoints.

**Technical Approach**:
1. Implement 3 missing Next.js API Route Handlers (`GET /api/public/events/[slug]`, `POST validate-token`, `GET metrics`)
2. Implement ZIP download routes for bulk downloads (`GET /api/public/sessions/[id]/download-all`, `GET /api/public/speeches/[id]/download-all`)
3. Update frontend configuration (remove `NEXT_PUBLIC_API_URL`, use relative paths)
4. Enhance UI with clarified patterns (chronological session order, in-page navigation, file info display, WCAG AA contrast)

**No Schema Changes Required**: All database tables, RLS policies, and indexes already exist from previous features.

## Technical Context

**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS runtime via Next.js)
**Primary Dependencies**:
- Next.js 14 App Router (serverless functions)
- React 18 (UI components)
- Supabase Client (`@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`)
- Tailwind CSS 3.x (styling)
- archiver (ZIP generation, add if missing)
- Vitest (contract tests)

**Storage**:
- Supabase PostgreSQL (database with RLS policies)
- Cloudflare R2 (slide files with presigned URLs)
- Supabase Storage (photos, banners)

**Testing**: Vitest (unit tests), contract tests (API validation), Playwright (E2E optional)

**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge), mobile browsers (iOS Safari 15+, Chrome Mobile)

**Project Type**: Web application (frontend-only with Next.js serverless functions)

**Performance Goals**:
- Page load < 2 seconds (FR-025)
- Image lazy-loading (FR-026)
- ZIP generation < 30 seconds for typical session

**Constraints**:
- Netlify function timeout: 10 seconds (free), 26 seconds (paid)
- R2 presigned URL expiry: 1 hour
- ZIP file size: Target <50MB per session

**Scale/Scope**:
- 100-500 concurrent public events
- 1,000-10,000 daily page views
- 3-15 speeches per session
- 2-5MB average slide size

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. No Easy Fixes (NON-NEGOTIABLE)
**Status**: ✅ PASS
**Rationale**: Completing serverless migration (not reverting to Express backend or creating workarounds). Fixing root cause: missing API routes.

### II. Security First (NON-NEGOTIABLE)
**Status**: ✅ PASS
**Rationale**:
- RLS policies enforce multi-tenant isolation
- Token validation server-side only
- No client-side security bypasses
- Presigned URLs with 1-hour expiry

### III. Test-Driven Development (TDD)
**Status**: ✅ PASS
**Rationale**: Contract tests created in Phase 1 (before implementation). Tests will fail until API routes implemented (red-green-refactor).

### IV. Multi-Tenant Isolation
**Status**: ✅ PASS
**Rationale**: All Supabase queries use `createRouteHandlerClient` which enforces RLS policies. No direct database access bypasses tenant_id filtering.

### V. UX-First
**Status**: ✅ PASS
**Rationale**: Fixing broken page before enhancing UI. All clarifications (mobile nav, file display, bulk downloads) prioritize user experience.

### VI. Simplicity
**Status**: ✅ PASS
**Rationale**:
- Using Next.js Route Handlers (standard pattern)
- No new frameworks or abstractions
- Leveraging existing Supabase RLS (no custom auth layer)
- Direct queries (no service layer for read-only public data)

### VII. Data Integrity
**Status**: ✅ PASS
**Rationale**:
- Read-only operations (no mutations)
- Download count increments use atomic SQL
- Soft deletes respected (`deleted_at IS NULL`)

**Overall Status**: NO VIOLATIONS - All constitutional principles upheld

## Project Structure

### Documentation (this feature)
```
specs/011-il-momento-di/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (completed, 580 lines)
├── data-model.md        # Phase 1 output (completed, 350 lines)
├── quickstart.md        # Phase 1 output (completed)
├── contracts/           # Phase 1 output (completed)
│   └── api-contracts.md # 5 API contracts
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
frontend/
├── src/
│   ├── app/
│   │   ├── api/                      # Next.js API Routes
│   │   │   └── public/
│   │   │       ├── events/
│   │   │       │   └── [slug]/
│   │   │       │       ├── route.ts           # NEW: GET event data
│   │   │       │       ├── validate-token/
│   │   │       │       │   └── route.ts       # NEW: POST token validation
│   │   │       │       └── metrics/
│   │   │       │           └── route.ts       # NEW: GET metrics
│   │   │       ├── sessions/
│   │   │       │   └── [id]/
│   │   │       │       └── download-all/
│   │   │       │           └── route.ts       # NEW: GET session ZIP
│   │   │       └── speeches/
│   │   │           └── [id]/
│   │   │               └── download-all/
│   │   │                   └── route.ts       # NEW: GET speech ZIP
│   │   ├── events/
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # EXISTING: Public event page (needs config fix)
│   ├── components/
│   │   └── public/
│   │       ├── EventHeader.tsx        # EXISTING: Event header display
│   │       ├── SessionList.tsx        # EXISTING: Session accordion
│   │       ├── EventGallery.tsx       # EXISTING: Photo lightbox (Feature 005)
│   │       ├── EventBanners.tsx       # EXISTING: Ad banners (Feature 010)
│   │       ├── PublicMetrics.tsx      # EXISTING: Metrics display
│   │       └── TokenForm.tsx          # EXISTING: Private event token input
│   └── services/
│       └── eventClient.ts             # UPDATE: Remove API_BASE_URL, use relative paths
└── tests/
    └── contract/
        └── publicEvents.test.ts       # NEW: Contract tests for 5 API endpoints

tests/ (root-level, if exists)
└── contract/
    └── publicEvents.test.ts           # Alternative location for contract tests
```

**Structure Decision**: Frontend-only web application using Next.js 14 App Router. Backend was decommissioned in Feature 008 in favor of Next.js serverless functions. All API routes are co-located with frontend in `frontend/src/app/api/`. Database access via Supabase Client with RLS enforcement.

## Phase 0: Outline & Research

### Research Execution
1. **Spawned diagnostic subagent** to investigate current event page errors:
   - Analyzed frontend code (`app/events/[slug]/page.tsx`, service files)
   - Searched for backend routes (confirmed none exist)
   - Reviewed Feature 008 spec (serverless migration incomplete)
   - **Root Cause Identified**: Missing Next.js API routes, decommissioned backend

2. **Resolved NEEDS CLARIFICATION items** (from previous `/clarify` session):
   - Q1: Mobile navigation → In-page headers with "back to top" button
   - Q2: Session organization → Chronological with optional filters
   - Q3: WCAG contrast → Contextual AA (4.5:1 body, 3:1 secondary)
   - Q4: File info display → Hybrid (icon visible, size on hover/tap)
   - Q5: Bulk download scope → Per-session only

3. **Technology stack confirmation**:
   - Language: TypeScript 5.3+ (confirmed in use)
   - Framework: Next.js 14 App Router (confirmed)
   - Database: Supabase PostgreSQL with RLS (confirmed)
   - Storage: Cloudflare R2 (confirmed via Feature 008)
   - Testing: Vitest (confirmed)
   - Deployment: Netlify serverless functions (confirmed)

### Key Technical Decisions

**Decision 1: Complete Serverless Migration (Not Full Redesign)**
- **Chosen**: Implement missing Next.js API Routes to complete Feature 008
- **Rationale**: UI components well-implemented, architecture correct but incomplete, faster path (days not weeks)
- **Alternatives Rejected**: Revert to Express backend (adds complexity, costs), complete redesign (unnecessary)

**Decision 2: ZIP Generation Strategy**
- **Chosen**: Implement per-session ZIP downloads (reverses Feature 008 decision)
- **Rationale**: Feature 004 spec requires bulk download, frontend has buttons, per-session ZIPs small enough (~5-20MB)
- **Implementation**: Stream-based ZIP generation using `archiver` library, no memory buffering

**Decision 3: Environment Configuration**
- **Chosen**: Remove `NEXT_PUBLIC_API_URL`, use relative paths
- **Rationale**: Next.js API Routes are same-origin, relative paths work in all environments
- **Before**: `fetch(${API_BASE_URL}/api/public/events/${slug})`
- **After**: `fetch(/api/public/events/${slug})`

**Decision 4: Database Query Pattern**
- **Chosen**: Direct Supabase queries in API Routes with RLS enforcement
- **Rationale**: Supabase RLS handles multi-tenant isolation, no service layer needed for read-only public data, simpler than backend service layer

**Decision 5: Token Validation Strategy**
- **Chosen**: Server-side validation with sessionStorage persistence
- **Rationale**: Secure (validation server-side), RLS-enforced (access_tokens table), stateless (no server session)

**Output**: `research.md` (580 lines) with all clarifications resolved, 10 technical decisions documented, best practices identified

## Phase 1: Design & Contracts

### 1. Data Model Design
Created `data-model.md` (350 lines) documenting:
- **7 Entities**: Event, Session, Speech, Slide, AccessToken, EventPhoto, Banner
- **Relationships**: Event → Sessions → Speeches → Slides (hierarchical)
- **RLS Policies**: All tables have existing multi-tenant policies
- **Validation Rules**: File type constraints, token format (21 chars), visibility states
- **API Response Structures**: `PublicEventResponse`, `TokenValidationRequest/Response`
- **Database Queries**: 3 critical queries with full SQL

**Key Finding**: No schema changes required. All tables, indexes, and RLS policies exist from previous features.

### 2. API Contracts Generation
Created `contracts/api-contracts.md` (80 lines) with 5 contracts:

1. **GET /api/public/events/[slug]**: Fetch complete event data
   - Response 200: Event + sessions + speeches + slides + photos + metrics
   - Response 404: Event not found
   - Response 403: Private event, no token

2. **POST /api/public/events/[slug]/validate-token**: Validate access token
   - Request: `{ token: string }` (21 characters)
   - Response 200 (valid): `{ valid: true, token_id: uuid }`
   - Response 200 (invalid): `{ valid: false, message: string }`

3. **GET /api/public/events/[slug]/metrics**: Fetch usage metrics
   - Response 200: `{ event_id: uuid, total_downloads: int, page_views: int }`

4. **GET /api/public/sessions/[id]/download-all**: Download session ZIP
   - Response 200: Binary ZIP stream (Content-Type: application/zip)
   - Response 404: Session not found

5. **GET /api/public/speeches/[id]/download-all**: Download speech ZIP
   - Response 200: Binary ZIP stream
   - Response 404: Speech not found

### 3. Test Scenarios Extraction
Created `quickstart.md` with 10 manual verification steps:
1. Public event page load
2. Session organization (chronological)
3. Slide download (individual)
4. Bulk download (session ZIP)
5. Event metrics display
6. Private event access (token validation)
7. Event gallery (Feature 005 integration)
8. Advertisement banners (Feature 010 integration)
9. Mobile responsiveness
10. Performance check (<2s load)

Each scenario includes current broken state vs expected results.

### 4. Agent Context Update
**Pending**: Execute `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`

**Output**: data-model.md, contracts/api-contracts.md, quickstart.md (completed), CLAUDE.md update (pending script execution)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Extract tasks from Phase 1 artifacts:
   - **5 Contract tests** (from contracts/api-contracts.md) - one test per API endpoint
   - **5 API Route implementations** (from contracts) - make tests pass
   - **1 Configuration update** (remove NEXT_PUBLIC_API_URL from eventClient.ts)
   - **1 ZIP library installation** (add archiver if missing)
   - **UI enhancements** (optional filters, back-to-top button, file info tooltips)
   - **WCAG validation** (contrast ratio checks)
   - **E2E tests** (optional, if Playwright configured)

**Ordering Strategy** (TDD + Dependency Order):
1. **Setup Tasks** [P]:
   - Install archiver library (if missing)
   - Configure test environment
2. **Contract Tests** (write failing tests first):
   - Test: GET /api/public/events/[slug]
   - Test: POST /api/public/events/[slug]/validate-token
   - Test: GET /api/public/events/[slug]/metrics
   - Test: GET /api/public/sessions/[id]/download-all
   - Test: GET /api/public/speeches/[id]/download-all
3. **API Implementation** (make tests pass):
   - Implement: GET /api/public/events/[slug]/route.ts
   - Implement: POST validate-token/route.ts
   - Implement: GET metrics/route.ts
   - Implement: GET /api/public/sessions/[id]/download-all/route.ts
   - Implement: GET /api/public/speeches/[id]/download-all/route.ts
4. **Configuration Updates**:
   - Update eventClient.ts (remove API_BASE_URL)
5. **UI Enhancements**:
   - Add session filter buttons (optional tracks/topics)
   - Add "back to top" button
   - Add file info hover tooltips
6. **Validation**:
   - Run quickstart.md verification steps
   - WCAG contrast ratio checks
   - Performance testing (<2s load)

**Task Granularity**:
- Each API route = 1 contract test task + 1 implementation task
- Each UI enhancement = 1 task
- Total estimated: 20-25 tasks

**Parallel Execution Markers**:
- Contract tests can run in parallel [P]
- API route implementations can be parallel [P] (independent files)
- UI enhancements can be parallel [P]

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md with 20-25 ordered tasks)
**Phase 4**: Implementation (execute tasks.md following TDD, constitutional principles)
**Phase 5**: Validation (run contract tests, quickstart.md steps, performance checks)

**Deployment Steps** (Phase 5):
1. Run all contract tests → All pass ✅
2. Execute quickstart.md manual verification → 10/10 steps pass ✅
3. Performance validation → <2s page load ✅
4. Deploy to staging (Netlify preview deploy)
5. User acceptance testing
6. Deploy to production (Netlify production deploy)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No Complexity Deviations**: All constitutional principles upheld. No violations to document.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - approach described above)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 22 numbered tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations)
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved (5 clarifications from previous session)
- [x] Complexity deviations documented (N/A - no deviations)

**Agent Context**:
- [ ] CLAUDE.md updated (script execution pending)

---

**Next Command**: Run `/tasks` to generate tasks.md with ordered, numbered implementation tasks

*Based on Constitution v2.1.1 - See `.specify/memory/constitution.md`*
