
# Implementation Plan: Pagina Pubblica Evento

**Branch**: `004-facciamo-la-pagina` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-facciamo-la-pagina/spec.md`

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
**Primary Requirement**: Build public-facing event page accessible via `/events/{slug}` URL, allowing participants to view event details, navigate hierarchical content (event → sessions → speeches → slides), and download presentation materials. Support both public events (open access) and private events (token-gated access).

**Technical Approach**:
- Frontend: Next.js 14 page at `/events/[slug]` with hybrid layout (sessions expanded, speeches collapsible)
- Backend: Extend Feature 003 API with public endpoints for event retrieval, token validation, and ZIP generation
- Access Control: Token validation via form input with session storage persistence
- Downloads: Single slide downloads + batch ZIP (per-speech and per-session) with 50/hour IP rate limiting
- Metrics: Public display of basic metrics (page_views, total_downloads), premium metrics (unique_visitors, per-slide breakdown) admin-only

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Express.js (backend API), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling), archiver (ZIP generation)
**Storage**: Supabase PostgreSQL with RLS policies, Supabase Storage for slide files
**Testing**: Jest (contract tests), integration tests for public endpoints
**Target Platform**: Web (desktop + mobile browsers), Node.js server
**Project Type**: web (frontend + backend)
**Performance Goals**: Page load < 2s (3G mobile, event with 50 slides), ZIP generation < 5s for 20 slides
**Constraints**: < 200ms API response time (p95), rate limiting 50 downloads/hour per IP, WCAG 2.1 AA accessibility
**Scale/Scope**: Public-facing page for all events, expected 100+ concurrent users per event, events with up to 100 speeches/300 slides

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. No Easy Fixes ✅ PASS
- Public endpoint design uses existing Feature 003 infrastructure (no shortcuts)
- Rate limiting properly implemented with IP tracking (no security bypass)
- ZIP generation uses proven library (archiver) with proper error handling

### II. Security First ✅ PASS
- RLS policies extend Feature 003 patterns for public read access
- Token validation enforces format, expiration, and event_id matching
- Session storage for tokens (client-side only, not in URLs to prevent leakage)
- Rate limiting prevents abuse (50 downloads/hour per IP)

### III. Test-Driven Development ✅ PASS
- Contract tests written first for new public endpoints
- Integration tests for token validation flow
- ZIP generation tested with mock slide data

### IV. Multi-Tenant Isolation ✅ PASS
- All queries filtered by tenant_id (inherited from event)
- RLS policies ensure tenant-scoped access
- Public endpoints still respect tenant boundaries

### V. UX-First Design ✅ PASS
- Performance target: < 2s page load (aligned with spec success metrics)
- Hybrid layout (sessions expanded, speeches collapsed) balances content density
- Form input for tokens (clear UX, no URL complexity)
- Accessibility: WCAG 2.1 AA compliance required

### VI. Simplicity ✅ PASS
- Extends existing Feature 003 patterns (no new architecture)
- Uses proven libraries (archiver for ZIP, express-rate-limit)
- Minimal new endpoints (3 public routes: GET event, POST validate-token, GET download-zip)

**Initial Check**: ✅ ALL GATES PASS

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
│   ├── routes/
│   │   └── publicEventRoutes.ts         # NEW: Public event endpoints
│   ├── services/
│   │   ├── publicEventService.ts        # NEW: Public event retrieval
│   │   └── zipGenerationService.ts      # NEW: ZIP creation for batch downloads
│   ├── middleware/
│   │   └── downloadRateLimit.ts         # NEW: 50/hour IP rate limiting
│   └── app.ts                           # MODIFY: Mount public routes
└── tests/
    └── contract/
        └── publicEvents.test.ts         # NEW: Contract tests for public endpoints

frontend/
├── src/
│   ├── app/
│   │   └── events/
│   │       └── [slug]/
│   │           ├── page.tsx            # NEW: Public event page
│   │           └── loading.tsx         # NEW: Loading state
│   ├── components/
│   │   └── public/
│   │       ├── EventHeader.tsx         # NEW: Event metadata display
│   │       ├── SessionList.tsx         # NEW: Sessions (expanded)
│   │       ├── SpeechAccordion.tsx     # NEW: Speeches (collapsible)
│   │       ├── SlideDownload.tsx       # NEW: Individual/batch download
│   │       ├── TokenForm.tsx           # NEW: Private event access form
│   │       └── PublicMetrics.tsx       # NEW: Page views + download count
│   └── services/
│       └── eventClient.ts              # NEW: API client for public endpoints
└── tests/
    └── integration/
        └── publicEvent.test.tsx         # NEW: E2E test for event page
```

**Structure Decision**: Web application structure with separate backend (Express.js API) and frontend (Next.js 14) projects. Feature 004 extends existing Feature 003 backend services and adds new Next.js page under `/events/[slug]` dynamic route.

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

**Task Generation Strategy**:
1. **Database Setup** (T001-T003):
   - Create RLS policies for public read access
   - Create `app.current_token_id()` PostgreSQL function
   - Test public/private access patterns

2. **Backend Contract Tests** (T004-T010) [P]:
   - Test GET /api/public/events/:slug (public)
   - Test GET /api/public/events/:slug (private, no token → 403)
   - Test POST /api/public/events/:slug/validate-token
   - Test GET /api/public/slides/:slideId/download
   - Test GET /api/public/speeches/:speechId/download-zip
   - Test GET /api/public/sessions/:sessionId/download-zip
   - Test rate limiting (50 downloads, 51st → 429)

3. **Backend Services** (T011-T015):
   - Implement publicEventService (event retrieval + nested data)
   - Implement zipGenerationService (archiver streaming)
   - Implement downloadRateLimit middleware (express-rate-limit)
   - Create publicEventRoutes (mount all endpoints)
   - Mount routes in app.ts

4. **Frontend Components** (T016-T024) [P]:
   - Create EventHeader component (metadata + metrics)
   - Create SessionList component (always expanded)
   - Create SpeechAccordion component (collapsible with `<details>`)
   - Create SlideDownload component (individual + batch buttons)
   - Create TokenForm component (21-char validation)
   - Create PublicMetrics component (page views + downloads)
   - Create eventClient service (API wrapper)
   - Create /events/[slug]/page.tsx (main page)
   - Create /events/[slug]/loading.tsx (suspense fallback)

5. **Integration Tests** (T025-T028):
   - E2E test: Public event navigation flow
   - E2E test: Private event token validation flow
   - E2E test: Download slide + ZIP
   - E2E test: Rate limit enforcement

6. **Performance & Accessibility** (T029-T032):
   - Optimize: Lazy load slides on speech expansion
   - Optimize: Implement pagination (50 speeches/page)
   - Accessibility: WCAG 2.1 AA compliance audit
   - Performance: Lighthouse score >= 90, < 2s load

7. **Documentation & Validation** (T033-T035):
   - Update CLAUDE.md with new patterns
   - Run quickstart.md validation scenarios
   - Performance validation (3G throttled test)

**Ordering Strategy**:
- TDD order: Contract tests (T004-T010) BEFORE services (T011-T015)
- Dependency order: Backend services BEFORE frontend components
- Parallelization: Contract tests can run in parallel [P]
- Parallelization: Frontend components can be built in parallel [P]

**Estimated Output**: 35 numbered, ordered tasks in tasks.md

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
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅ (5 clarifications completed)
- [x] Complexity deviations documented ✅ (None - all patterns align with constitution)

**Artifacts Generated**:
- [x] research.md (8 research questions answered)
- [x] data-model.md (API models + RLS policies)
- [x] contracts/public-event-api.yaml (OpenAPI 3.0 spec with 6 endpoints)
- [x] quickstart.md (5 test scenarios)
- [x] CLAUDE.md updated (Feature 004 context added)
- [x] tasks.md (40 numbered tasks across 7 phases)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
