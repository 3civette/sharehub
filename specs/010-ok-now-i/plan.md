
# Implementation Plan: Event Advertisement Banner System

**Branch**: `010-ok-now-i` | **Date**: 2025-10-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-ok-now-i/spec.md`

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
Implement an advertisement banner system that allows event organizers to upload and display banner graphics on public event pages. The system supports up to 5 individually configurable banner slots per event, each with unique dimensions and page positions. Banners can optionally include click URLs for external redirects. This feature enables event organizers to generate revenue through sponsorships and showcase partner branding. The implementation uses Supabase Storage for banner file management, maintains multi-tenant data isolation through RLS policies, and integrates with the existing admin dashboard for banner management.

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Next.js 14 App Router, Supabase (database + auth + storage), Tailwind CSS 3.x, Lucide React
**Storage**: Supabase PostgreSQL with RLS policies, Supabase Storage for banner files (alternative: Cloudflare R2 via existing integration)
**Testing**: Vitest (frontend), contract tests for API endpoints
**Target Platform**: Web application (responsive design for desktop and mobile browsers)
**Project Type**: web (frontend + backend Next.js API routes)
**Performance Goals**: < 10s file uploads (5MB max), < 2s page load with banners, < 500ms banner management operations
**Constraints**: Max 5 banner slots per event, JPEG/PNG/WebP only, 5MB file size limit, multi-tenant data isolation via RLS
**Scale/Scope**: Estimated 100-500 events with banners, up to 5 banners per event, public-facing display on event pages

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✅ I. No Easy Fixes**: All clarifications resolved through `/clarify` workflow. Banner storage uses existing Supabase Storage patterns. No shortcuts or workarounds planned.

**✅ II. Security First**: RLS policies will enforce tenant isolation on `banners` table. Only tenant admins can manage banners for their events. Public read access for banner display (similar to existing `events` public access pattern).

**✅ III. Test-Driven Development**: Contract tests will be written first for banner API endpoints (`POST /api/events/[id]/banners`, `GET /api/events/[id]/banners`, `DELETE /api/banners/[id]`). Tests fail initially, implementation makes them pass.

**✅ IV. Multi-Tenant Isolation**: `banners` table includes `tenant_id` foreign key. RLS policies enforce tenant-scoped queries. No cross-tenant banner visibility.

**✅ V. UX-First Design**: Simple banner management UI in admin dashboard. Drag-and-drop file upload (reusing existing `FileDropzone` component). Clear visual feedback for slot assignments. Mobile-responsive banner display.

**✅ VI. Simplicity**: Leverages existing Supabase Storage for file uploads. Reuses FileDropzone component from feature 007/008. No new external services. Standard REST API pattern for CRUD operations.

**Database Standards**: Follows existing migration pattern with soft delete (`deleted_at`), tenant isolation, proper indexing, and RLS policies avoiding recursion.

**Result**: ✅ PASS - No constitutional violations. Design aligns with project principles.

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
frontend/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── events/
│   │   │       └── [id]/
│   │   │           └── banners/           # Banner management UI
│   │   │               └── page.tsx
│   │   └── api/
│   │       └── events/
│   │           └── [id]/
│   │               └── banners/           # Banner CRUD API routes
│   │                   ├── route.ts       # POST (create), GET (list)
│   │                   └── [bannerId]/
│   │                       └── route.ts   # DELETE, PATCH (update)
│   ├── components/
│   │   ├── admin/
│   │   │   ├── BannerManager.tsx          # Main banner management component
│   │   │   ├── BannerSlotCard.tsx         # Individual slot display
│   │   │   └── BannerUploadForm.tsx       # Upload + configure form
│   │   ├── public/
│   │   │   └── EventBanners.tsx           # Public banner display component
│   │   └── common/
│   │       └── FileDropzone.tsx           # (Existing - reused)
│   └── lib/
│       └── supabase/
│           └── server.ts                   # (Existing - reused)
└── tests/
    └── contract/
        └── banners.test.ts                 # Contract tests for API endpoints

supabase/
└── migrations/
    ├── 20250113_create_banners_table.sql   # Banner entity + relationships
    └── 20250113_rls_banners.sql            # RLS policies for tenant isolation
```

**Structure Decision**: Web application structure (Next.js 14 App Router). Frontend contains both UI components and API routes. This feature adds banner management to the existing admin dashboard (`/admin/events/[id]/banners`) and public banner display to event pages. Database migrations follow existing pattern with separate schema and RLS policy files.

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

The `/tasks` command will generate a comprehensive task list following TDD principles:

1. **Database Layer** (5-7 tasks):
   - Create migration: `20250113_create_banners_table.sql` (schema, constraints, indexes)
   - Create migration: `20250113_rls_banners.sql` (RLS policies for tenant isolation)
   - Apply migrations to local Supabase instance
   - Verify database constraints with manual SQL tests
   - Generate TypeScript types from database schema

2. **Contract Tests** (5-6 tasks) [P]:
   - Write contract test: `POST /api/events/[id]/banners` (banner upload)
   - Write contract test: `GET /api/events/[id]/banners` (list banners)
   - Write contract test: `PATCH /api/banners/[id]` (update banner)
   - Write contract test: `DELETE /api/banners/[id]` (soft delete)
   - Write contract test: `GET /api/public/events/[slug]/banners` (public access)
   - Verify all contract tests fail (no implementation yet)

3. **API Implementation** (6-8 tasks):
   - Implement: `POST /api/events/[id]/banners/route.ts` (upload handler)
   - Implement: `GET /api/events/[id]/banners/route.ts` (list handler)
   - Implement: `PATCH /api/banners/[bannerId]/route.ts` (update handler)
   - Implement: `DELETE /api/banners/[bannerId]/route.ts` (delete handler)
   - Implement: `GET /api/public/events/[slug]/banners/route.ts` (public handler)
   - Add file validation middleware (reuse existing patterns)
   - Verify contract tests pass

4. **Admin UI Components** (5-7 tasks) [P]:
   - Create: `BannerManager.tsx` (main container component)
   - Create: `BannerSlotCard.tsx` (individual slot display)
   - Create: `BannerUploadForm.tsx` (upload form with FileDropzone)
   - Create: `lib/banner-slots.ts` (slot configuration enum)
   - Create admin page: `/admin/events/[id]/banners/page.tsx`
   - Add "Manage Banners" navigation link to event detail page
   - Manual test: Navigate to banner management page

5. **Public Display Component** (3-4 tasks):
   - Create: `EventBanners.tsx` (public banner display component)
   - Integrate into: `/events/[slug]/page.tsx`
   - Implement responsive CSS for banner slots
   - Manual test: View banners on public event page

6. **Integration Testing** (4-5 tasks):
   - Test Scenario 1: View banner management section (quickstart.md)
   - Test Scenario 2: Upload banner to slot (quickstart.md)
   - Test Scenario 3: View banners on public page (quickstart.md)
   - Test Scenario 5: Delete banner (quickstart.md)
   - Test Scenario 6: Update banner properties (quickstart.md)

7. **Edge Case & Security Testing** (3-4 tasks):
   - Test edge cases: Invalid file types, size limits, duplicate slots
   - Verify RLS policies: Cross-tenant access blocked
   - Performance validation: Upload times, page load times
   - Security validation: XSS prevention in click URLs

**Ordering Strategy**:
- **TDD Order**: Contract tests before API implementation
- **Dependency Order**:
  1. Database migrations (foundation)
  2. Contract tests (define requirements)
  3. API implementation (make tests pass)
  4. UI components (consume API)
  5. Integration tests (validate flows)
  6. Edge cases (polish)
- **Parallel Execution**: Mark with [P] for tasks that can run independently:
  - Contract test writing (5-6 parallel tasks)
  - UI component creation (5-7 parallel tasks)
  - Integration test execution (4-5 parallel scenarios)

**Task Dependencies**:
- API implementation depends on: Contract tests written
- UI components depend on: API implementation complete
- Integration tests depend on: UI + API complete
- Edge case tests depend on: All functionality implemented

**Estimated Output**: 35-40 numbered, dependency-ordered tasks in tasks.md

**Task Template Format**:
```markdown
### Task N: [Title]
**Type**: [Database|Contract Test|API|UI|Integration Test]
**Estimated Time**: [minutes]
**Dependencies**: [Task numbers or "None"]
**Parallel**: [Yes/No]

**Description**: ...

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Files**:
- `path/to/file.ts`
```

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
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/*, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - 35-40 tasks outlined
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 40 detailed tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (re-evaluated after Phase 1)
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - see Complexity Tracking table)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
