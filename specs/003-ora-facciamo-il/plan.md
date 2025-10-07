
# Implementation Plan: Event Flow Management

**Branch**: `003-ora-facciamo-il` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-ora-facciamo-il/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Implement complete event lifecycle management with three-level content hierarchy (Event → Sessions → Speeches → Slides). Admins create public or private events with custom token expiration. Private events generate organizer and participant tokens with PDF/QR code distribution. Organizers access full dashboard with hierarchical content management, tiered metrics (free/premium), activity logging with configurable retention, and file management. Public event pages display hierarchical agenda with flexible slide downloads (individual, speech-level, or bulk ZIP). Features include token-based access control, per-IP rate limiting (100 req/hour), double-confirmation for past event edits, and configurable tenant-level data retention policies.

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Express.js (backend), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling)
**Storage**: Supabase PostgreSQL with RLS policies, Supabase Storage for slide files
**Testing**: Vitest (backend contract tests), Jest/React Testing Library (frontend)
**Target Platform**: Web application (Chrome/Firefox/Safari latest, mobile-responsive)
**Project Type**: web (backend + frontend architecture)
**Performance Goals**: <1s page load, <2s listings, <10s file uploads, <3s ZIP generation
**Constraints**: <200ms p95 API response, token-based auth, multi-tenant isolation, 100 req/hour rate limit
**Scale/Scope**: Multi-tenant SaaS, 79 functional requirements, 8 entities with 3-level hierarchy, hierarchical content management

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. No Easy Fixes ✅
- **Status**: PASS
- All clarifications resolved through structured process (11 questions)
- Root-cause solutions: token expiration (custom per-event), metrics tiering (subscription-based), hierarchical structure (3-level design)
- No workarounds or temporary fixes

### II. Security First ✅
- **Status**: PASS
- RLS policies required for all tables (events, sessions, speeches, slides, activity_logs)
- Multi-tenant isolation via tenant_id on all entities
- Token-based access control with expiration validation
- Rate limiting (100 req/hour per-IP) prevents abuse
- Organizer vs participant permission separation

### III. Test-Driven Development (TDD) ✅
- **Status**: PASS
- Contract tests will be written first in Phase 1 (before implementation)
- Each API endpoint gets contract test coverage
- Integration tests from acceptance scenarios (13 scenarios)
- Red-Green-Refactor cycle enforced

### IV. Multi-Tenant Isolation ✅
- **Status**: PASS
- All entities have tenant_id foreign key
- RLS policies enforce tenant-scoped queries
- Event tokens scoped to tenant context
- Activity logs, metrics, and retention policies tenant-specific

### V. UX-First Design ✅
- **Status**: PASS
- Hierarchical content management (Event→Sessions→Speeches→Slides) solves real organization needs
- Performance targets: <1s preview, <2s listings, <10s uploads (met constitution requirements)
- Simple interfaces: breadcrumb navigation, expandable tree view, drag-and-drop reordering
- Mobile-responsive by default (Next.js 14 + Tailwind CSS)

### VI. Simplicity ✅
- **Status**: PASS
- Using proven stack: Supabase, Next.js 14, Express.js, Tailwind CSS
- Standard REST patterns for API design
- JSONB for flexible branding/metadata storage
- Service layer pattern (proven from feature 002)
- No premature optimization

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
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
│   ├── models/
│   │   ├── event.ts          # Event entity with sessions relationship
│   │   ├── session.ts        # Session entity with speeches relationship
│   │   ├── speech.ts         # Speech entity with slides relationship
│   │   ├── slide.ts          # Slide entity
│   │   ├── accessToken.ts    # Token entity with type (organizer/participant)
│   │   ├── eventMetrics.ts   # Metrics entity with tiered fields
│   │   └── activityLog.ts    # Activity log entity
│   ├── services/
│   │   ├── eventService.ts   # Event CRUD, token generation, PDF generation
│   │   ├── sessionService.ts # Session management with reordering
│   │   ├── speechService.ts  # Speech management with reordering
│   │   ├── slideService.ts   # Slide upload/download/ZIP generation
│   │   ├── tokenService.ts   # Token validation and expiration
│   │   ├── metricsService.ts # Tiered metrics based on tenant plan
│   │   └── rateLimitService.ts # Per-IP rate limiting (100 req/hour)
│   ├── routes/
│   │   ├── events.ts         # Event endpoints (create, list, get, update, delete)
│   │   ├── sessions.ts       # Session endpoints (CRUD, reorder)
│   │   ├── speeches.ts       # Speech endpoints (CRUD, reorder)
│   │   ├── slides.ts         # Slide endpoints (upload, download, ZIP)
│   │   ├── dashboard.ts      # Organizer dashboard with metrics
│   │   └── public.ts         # Public event page (no auth required)
│   └── middleware/
│       ├── tokenAuth.ts      # Token validation middleware
│       ├── rateLimit.ts      # Rate limiting middleware
│       └── tenantIsolation.ts # Multi-tenant middleware
└── tests/
    └── contract/
        ├── events.test.ts    # Event API contract tests
        ├── sessions.test.ts  # Session API contract tests
        ├── speeches.test.ts  # Speech API contract tests
        └── slides.test.ts    # Slide API contract tests

frontend/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── events/
│   │   │       ├── page.tsx           # Event list page
│   │   │       ├── new/page.tsx       # Create event form
│   │   │       └── [id]/
│   │   │           ├── page.tsx       # Event details page
│   │   │           └── edit/page.tsx  # Edit event form
│   │   ├── events/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx           # Public event page
│   │   │       └── dashboard/page.tsx # Organizer dashboard (token-auth)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── events/
│   │   │   ├── EventForm.tsx          # Event creation form
│   │   │   ├── TokenDisplay.tsx       # Token display with copy/PDF
│   │   │   ├── SessionTree.tsx        # Hierarchical tree view
│   │   │   ├── SessionForm.tsx        # Session CRUD form
│   │   │   ├── SpeechForm.tsx         # Speech CRUD form
│   │   │   ├── SlideUpload.tsx        # Slide upload component
│   │   │   ├── MetricsDashboard.tsx   # Tiered metrics display
│   │   │   ├── ActivityLog.tsx        # Activity log table
│   │   │   └── DownloadButtons.tsx    # Individual/ZIP download UI
│   │   └── shared/
│   │       ├── ConfirmDialog.tsx      # Confirmation dialogs
│   │       └── DoubleConfirm.tsx      # Double confirmation for past events
│   └── services/
│       ├── eventApi.ts       # Event API client
│       ├── sessionApi.ts     # Session API client
│       ├── speechApi.ts      # Speech API client
│       ├── slideApi.ts       # Slide API client
│       └── pdfGenerator.ts   # Client-side PDF generation
└── tests/
    └── integration/
        ├── eventFlow.test.tsx         # Full event creation flow
        ├── tokenAccess.test.tsx       # Token-based access tests
        └── hierarchyManagement.test.tsx # Hierarchy CRUD tests
```

**Structure Decision**: Web application architecture (Option 2 selected). Backend uses Express.js with service layer pattern established in feature 002. Frontend uses Next.js 14 App Router with server/client components. Feature introduces new hierarchical entities (Event→Session→Speech→Slide) with dedicated services and API routes. Multi-tenant isolation enforced via RLS policies and middleware.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

The `/tasks` command will generate tasks in strict TDD order following the constitution:

#### 1. Database Foundation (Sequential)
- **T001**: Create database migration script for 7 new tables (events, sessions, speeches, slides, access_tokens, event_metrics, activity_logs)
- **T002**: Apply migration to local Supabase instance
- **T003**: Create RLS policies for all tables with tenant_id checks (avoid recursion from feature 002 lessons)
- **T004**: Test RLS policies with multiple tenants to verify isolation
- **T005**: Create indexes on foreign keys and tenant_id columns
- **T006**: Create cleanup function for activity log retention (`cleanup_expired_logs()`)

#### 2. Backend Models (Parallel where possible)
- **T007**: [P] Implement Event model with validation (TypeScript interface + Supabase types)
- **T008**: [P] Implement Session model with display_order
- **T009**: [P] Implement Speech model with display_order
- **T010**: [P] Implement Slide model with file metadata
- **T011**: [P] Implement AccessToken model with type enum
- **T012**: [P] Implement EventMetrics model with JSONB fields
- **T013**: [P] Implement ActivityLog model with retention_days

#### 3. Contract Tests First (TDD Red Phase)
- **T014**: [P] Copy `contracts/events.contract.test.ts` to `backend/tests/contract/events.test.ts`
- **T015**: Run tests to verify they FAIL (no implementation yet)
- **T016**: Document expected failures in test output

#### 4. Backend Services (Test-Driven)
- **T017**: Implement `tokenService.ts` (generate nanoid, validate, check expiration)
- **T018**: Implement `eventService.ts` (CRUD + token generation + PDF generation with pdfkit)
- **T019**: Implement `sessionService.ts` (CRUD + reordering logic)
- **T020**: Implement `speechService.ts` (CRUD + reordering logic)
- **T021**: Implement `slideService.ts` (upload to Supabase Storage, download signed URLs, ZIP generation with archiver)
- **T022**: Implement `metricsService.ts` (update metrics, filter by tenant plan)
- **T023**: Implement `rateLimitService.ts` (express-rate-limit with memory/Redis store)

#### 5. Backend Middleware
- **T024**: Implement `tokenAuth.ts` middleware (validate token, check expiration, set user context)
- **T025**: Implement `rateLimit.ts` middleware (apply 100 req/hour limit)
- **T026**: Implement `tenantIsolation.ts` middleware (set `app.current_tenant_id` for RLS)

#### 6. Backend API Routes
- **T027**: Implement `/api/events` routes (POST create, GET list, GET by ID, PUT update, DELETE)
- **T028**: Implement `/api/events/:id/tokens/pdf` (PDF generation endpoint)
- **T029**: Implement `/api/events/:id/sessions` routes (POST create session)
- **T030**: Implement `/api/sessions/:id` routes (PUT update, DELETE with cascade)
- **T031**: Implement `/api/sessions/:id/speeches` routes (POST create speech)
- **T032**: Implement `/api/speeches/:id` routes (PUT update, DELETE with cascade)
- **T033**: Implement `/api/speeches/:id/slides` routes (POST upload slide with multer)
- **T034**: Implement `/api/slides/:id/download` (generate signed URL)
- **T035**: Implement `/api/events/:id/slides/download-all` (ZIP streaming)
- **T036**: Implement `/api/events/:id/dashboard` (organizer dashboard data)
- **T037**: Implement `/api/events/:id/public` (public event page data)

#### 7. Backend Tests Green Phase
- **T038**: Run contract tests and verify they PASS
- **T039**: Fix any failing tests (refactor services/routes)
- **T040**: Achieve 100% contract test coverage

#### 8. Frontend Components (Bottom-Up)
- **T041**: [P] Implement `EventForm.tsx` (create event form with visibility toggle)
- **T042**: [P] Implement `TokenDisplay.tsx` (show tokens with copy + PDF download buttons)
- **T043**: [P] Implement `SessionForm.tsx` (create/edit session modal)
- **T044**: [P] Implement `SpeechForm.tsx` (create/edit speech modal)
- **T045**: [P] Implement `SlideUpload.tsx` (file upload with drag-and-drop, progress bar)
- **T046**: [P] Implement `SessionTree.tsx` (hierarchical tree view with expand/collapse)
- **T047**: [P] Implement `MetricsDashboard.tsx` (conditional rendering based on tenant plan)
- **T048**: [P] Implement `ActivityLog.tsx` (table with filters, pagination)
- **T049**: [P] Implement `DownloadButtons.tsx` (individual + ZIP download)
- **T050**: [P] Implement `ConfirmDialog.tsx` (standard confirmation modal)
- **T051**: [P] Implement `DoubleConfirm.tsx` (checkbox + button for past events)

#### 9. Frontend API Services
- **T052**: [P] Implement `eventApi.ts` (fetch wrapper for event endpoints)
- **T053**: [P] Implement `sessionApi.ts` (session CRUD)
- **T054**: [P] Implement `speechApi.ts` (speech CRUD)
- **T055**: [P] Implement `slideApi.ts` (upload/download/ZIP)
- **T056**: [P] Implement `pdfGenerator.ts` (client-side PDF generation if needed)

#### 10. Frontend Pages
- **T057**: Implement `/admin/events/page.tsx` (event list with filters)
- **T058**: Implement `/admin/events/new/page.tsx` (create event form, token display)
- **T059**: Implement `/admin/events/[id]/page.tsx` (event details)
- **T060**: Implement `/admin/events/[id]/edit/page.tsx` (edit form with past event checks)
- **T061**: Implement `/events/[slug]/dashboard/page.tsx` (organizer dashboard with tree view)
- **T062**: Implement `/events/[slug]/page.tsx` (public event page with agenda, downloads)

#### 11. Integration Tests (Quickstart Scenarios)
- **T063**: Implement `eventFlow.test.tsx` (create event → generate tokens → download PDF)
- **T064**: Implement `tokenAccess.test.tsx` (valid/invalid/expired token scenarios)
- **T065**: Implement `hierarchyManagement.test.tsx` (create session → create speech → upload slide)
- **T066**: Implement `downloadFlow.test.tsx` (individual slide download + ZIP download)
- **T067**: Implement `metricsTracking.test.tsx` (verify activity logs, metrics updates)
- **T068**: Implement `rateLimiting.test.tsx` (verify 100 req/hour limit)
- **T069**: Implement `pastEventEditing.test.tsx` (verify double confirmation)

#### 12. Performance & Polish
- **T070**: Implement ZIP streaming optimization (avoid memory overflow for large events)
- **T071**: Add loading states to all async operations
- **T072**: Add error boundaries to all pages
- **T073**: Implement toast notifications for success/error feedback
- **T074**: Add breadcrumb navigation to dashboard
- **T075**: Implement drag-and-drop reordering for sessions/speeches/slides

#### 13. Documentation & Deployment
- **T076**: Update README with setup instructions for feature 003
- **T077**: Document environment variables (.env.example)
- **T078**: Create Supabase migration SQL files for deployment
- **T079**: Test full quickstart.md flow end-to-end
- **T080**: Deploy to staging environment

### Ordering Strategy

**TDD Order**:
- Database → Models → Contract Tests (FAIL) → Services → Routes → Tests PASS → UI

**Dependency Order**:
- Foundation (DB, models) before logic (services, routes)
- Backend complete before frontend (API contracts must be stable)
- Components before pages (bottom-up UI construction)
- Happy path before edge cases

**Parallelization**:
- Mark [P] for tasks that can run concurrently (e.g., model creation, component building)
- Database migrations MUST be sequential
- Tests depend on implementation (cannot parallelize)

### Estimated Output

**Total Tasks**: 80 numbered tasks
**Estimated Time**:
- Phase 1 (DB + Models): 4 hours
- Phase 2 (Backend): 12 hours
- Phase 3 (Frontend): 10 hours
- Phase 4 (Integration): 4 hours
- Phase 5 (Polish): 4 hours
- **Total**: ~34 hours of development

**Dependencies**:
- Feature 002 (Admin Panel) must be complete
- Supabase instance running locally
- Node.js 20 LTS installed
- Redis optional (for production rate limiting)

### Success Criteria

Tasks complete when:
- ✅ All contract tests pass
- ✅ All integration tests pass
- ✅ quickstart.md can be executed without errors
- ✅ Constitution principles followed (TDD, security, multi-tenancy)
- ✅ Performance targets met (<1s page load, <10s uploads, <3s ZIP)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - all constitution principles followed)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
