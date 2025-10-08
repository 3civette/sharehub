
# Implementation Plan: Event Details Management

**Branch**: `005-ora-bisogna-implementare` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:\Users\KreshOS\Documents\00-Progetti\shareHub\specs\005-ora-bisogna-implementare\spec.md`

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
Enhance the ShareHub event management system with comprehensive content management capabilities. This feature extends both the admin event edit page and the public event page with:

**Admin Capabilities**: Upload event photos (cover + gallery), create/manage sessions and speeches, upload slide files (PDF/PPTX/PPT), generate and distribute access tokens (clipboard + QR codes)

**Public Display**: Hierarchical event content display (Event → Sessions → Speeches → Slides) with downloadable materials, token-based access for private events, and enriched metadata (speaker info, file sizes, scheduled times)

**Key Technical Requirements**: Multi-tenant file storage with RLS, smart chronological ordering with manual override, cascade deletion with user confirmation, file validation (50MB limit, customizable formats per event)

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Express.js (backend), Next.js 14 App Router (frontend), Supabase (database + auth + storage), Tailwind CSS (styling), Multer (file uploads), QRCode library (token QR generation)
**Storage**: Supabase PostgreSQL with RLS policies + Supabase Storage for files (event photos, slides)
**Testing**: Contract tests (supertest), integration tests, RLS policy tests
**Target Platform**: Web application (desktop + mobile responsive)
**Project Type**: web (frontend + backend)
**Performance Goals**: <1s page load, <2s event list (100 events), <10s file upload (50MB), <500ms API responses
**Constraints**: 50MB max file size per upload, multi-tenant isolation via RLS, mobile-responsive UI, WCAG 2.1 AA accessibility
**Scale/Scope**: Multi-tenant SaaS, 6 new entities (EventPhoto, Session, Speech, enhanced Event/Slide/AccessToken), ~40 functional requirements, admin + public UIs

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Review (Pre-Phase 0)

**I. No Easy Fixes**: ✅ PASS
- File uploads will use proper validation (client + server)
- RLS policies will be tested for tenant isolation
- Cascade deletes implemented with user confirmation dialogs

**II. Security First**: ✅ PASS
- RLS enabled on all new tables (event_photos, sessions, speeches)
- Existing RLS on slides/access_tokens tables will be maintained
- File storage uses Supabase Storage with tenant-scoped paths
- No bypassing of authentication/authorization

**III. Test-Driven Development**: ✅ PASS
- Contract tests written before implementation (Phase 1)
- Tests must fail initially to prove correctness
- Integration tests for user scenarios from spec

**IV. Multi-Tenant Isolation**: ✅ PASS
- All new tables have tenant_id foreign key
- RLS policies enforce tenant-scoped queries
- File storage paths include tenantId for isolation
- Cross-tenant data leakage prevented by design

**V. UX-First Design**: ✅ PASS
- Solves real user problems (content management for events)
- Performance targets defined: <1s page load, <10s uploads
- Simple interfaces: hierarchical display, smart ordering
- Mobile-responsive required (WCAG 2.1 AA)

**VI. Simplicity**: ✅ PASS
- Uses existing proven stack (Supabase, Next.js, Express)
- Service layer pattern already established
- No new architectural patterns introduced
- Complexity justified: smart ordering needed for UX

**Violations**: None

**Result**: ✅ PASS - Proceed to Phase 0

### Post-Design Review (After Phase 1)

**I. No Easy Fixes**: ✅ PASS
- Design uses proper validation patterns (Multer + DB constraints)
- RLS policies designed to avoid recursion (tenant-scoped only)
- Cascade deletes implemented at application layer with safeguards

**II. Security First**: ✅ PASS
- All new tables have RLS policies (event_photos, sessions, speeches)
- File storage paths include tenant_id for isolation
- No security bypasses in design
- Token validation remains secure

**III. Test-Driven Development**: ✅ PASS
- Contracts defined before implementation
- Quickstart.md provides test scenarios
- Integration tests planned for all workflows

**IV. Multi-Tenant Isolation**: ✅ PASS
- All entities have tenant_id foreign key
- RLS policies enforce tenant filtering
- Storage paths use tenant-scoped structure
- No cross-tenant queries possible

**V. UX-First Design**: ✅ PASS
- Smart ordering addresses user pain point
- Cascade confirmation prevents data loss frustration
- QR codes simplify token distribution
- Hierarchical display matches mental model

**VI. Simplicity**: ✅ PASS
- Uses existing patterns (Multer, Supabase Storage)
- No new architectural patterns introduced
- Smart ordering complexity justified by UX need
- QRCode library is simple, proven solution

**New Violations**: None

**Result**: ✅ PASS - Design adheres to constitution

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
│   │   ├── eventPhoto.ts         # NEW: Event photo entity
│   │   ├── session.ts             # NEW: Session entity
│   │   ├── speech.ts              # NEW: Speech entity
│   │   ├── slide.ts               # ENHANCED: Add speech_id reference
│   │   └── accessToken.ts         # ENHANCED: Add QR code generation
│   ├── services/
│   │   ├── eventPhotoService.ts   # NEW: Photo upload/management
│   │   ├── sessionService.ts      # NEW: Session CRUD with ordering
│   │   ├── speechService.ts       # NEW: Speech CRUD with validation
│   │   ├── slideService.ts        # ENHANCED: Speech-scoped operations
│   │   └── tokenService.ts        # ENHANCED: QR code generation
│   ├── routes/
│   │   ├── eventPhotos.ts         # NEW: Photo endpoints
│   │   ├── sessions.ts            # NEW: Session endpoints
│   │   ├── speeches.ts            # NEW: Speech endpoints
│   │   └── tokens.ts              # ENHANCED: QR generation endpoint
│   └── middleware/
│       └── fileUpload.ts          # ENHANCED: Multi-format validation
├── migrations/
│   ├── 005-event-photos.sql       # NEW: Event photos table + RLS
│   ├── 005-sessions.sql           # NEW: Sessions table + RLS
│   ├── 005-speeches.sql           # NEW: Speeches table + RLS
│   └── 005-slides-enhancement.sql # ENHANCED: Add speech_id column
└── tests/
    ├── contract/
    │   ├── eventPhotos.test.ts    # NEW: Photo API tests
    │   ├── sessions.test.ts       # NEW: Session API tests
    │   └── speeches.test.ts       # NEW: Speech API tests
    └── rls/
        ├── eventPhotos.test.ts    # NEW: Photo RLS tests
        ├── sessions.test.ts       # NEW: Session RLS tests
        └── speeches.test.ts       # NEW: Speech RLS tests

frontend/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── EventPhotoManager.tsx  # NEW: Photo upload UI
│   │   │   ├── SessionManager.tsx     # NEW: Session CRUD UI
│   │   │   ├── SpeechManager.tsx      # NEW: Speech CRUD UI
│   │   │   ├── SlideUpload.tsx        # ENHANCED: Multi-format support
│   │   │   └── TokenQRCode.tsx        # NEW: QR code display
│   │   └── public/
│   │       ├── EventGallery.tsx       # NEW: Photo gallery display
│   │       ├── SessionList.tsx        # NEW: Session display with expansion
│   │       ├── SpeechCard.tsx         # NEW: Speech details component
│   │       └── SlideList.tsx          # ENHANCED: Enriched metadata
│   ├── app/
│   │   ├── admin/
│   │   │   └── events/[id]/
│   │   │       └── edit/page.tsx      # ENHANCED: Add photo/session/speech management
│   │   └── events/[slug]/
│   │       └── page.tsx               # ENHANCED: Hierarchical content display
│   └── services/
│       ├── eventPhotoService.ts       # NEW: Photo API calls
│       ├── sessionService.ts          # NEW: Session API calls
│       └── speechService.ts           # NEW: Speech API calls
└── tests/
    └── integration/
        ├── eventDetails.test.tsx      # NEW: Full admin workflow test
        └── publicEventPage.test.tsx   # NEW: Public display test
```

**Structure Decision**: Web application (frontend + backend) structure. Feature adds 3 new entities (EventPhoto, Session, Speech) with full CRUD across both tiers, plus enhancements to existing Slide and AccessToken entities. Maintains existing service layer pattern and RLS-based security model.

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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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
- [x] Phase 2: Task planning approach described (/plan command) ✅
- [ ] Phase 3: Tasks generated (/tasks command) - Next step
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented: N/A (no violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
