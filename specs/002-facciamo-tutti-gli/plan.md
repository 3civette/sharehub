# Implementation Plan: Admin Panel Secondary Screens

**Branch**: `002-facciamo-tutti-gli` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-facciamo-tutti-gli/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ DONE: Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ DONE: Project Type = web (Next.js 14 + Express.js)
   → ✅ DONE: Structure Decision = Web application (frontend + backend)
3. Fill the Constitution Check section based on the content of the constitution document.
   → ✅ DONE: Constitution loaded
4. Evaluate Constitution Check section below
   → ✅ PASS: No constitutional violations
   → ✅ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ DONE: research.md created with 5 technology decisions
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ DONE: All Phase 1 artifacts generated
7. Re-evaluate Constitution Check section
   → ✅ PASS: Design maintains constitutional compliance
8. Plan Phase 2 → Describe task generation approach
   → ✅ DONE: Task planning strategy documented
9. STOP - Ready for /tasks command
   → ✅ COMPLETE: Planning phase finished
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
**Primary Requirement**: Build 4 admin panel screens for ShareHub multi-tenant platform: Create Event, Edit Event, Branding Customization (colors + logo), Event List (sortable/filterable), and Settings (hotel info, contact, billing view).

**Technical Approach**:
- Frontend: Next.js 14 App Router with React 18, Tailwind CSS, dynamic tenant branding via CSS variables
- Backend: Express.js API with service layer pattern, Supabase PostgreSQL with RLS for multi-tenant isolation
- File Upload: Multer for logo uploads (2MB max, PNG/JPG/SVG), stored in Supabase Storage
- Auth: Supabase Auth Helpers, admin-only routes with middleware protection
- Testing: Contract tests (vitest + supertest), integration tests for user flows

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**:
- Backend: Express.js, Supabase JS Client, Multer, bcrypt, nanoid
- Frontend: Next.js 14, React 18, Tailwind CSS, Supabase Auth Helpers
**Storage**: Supabase PostgreSQL with RLS policies, Supabase Storage for logo files
**Testing**: vitest (backend contract tests), supertest (API testing), React Testing Library (frontend)
**Target Platform**: Web (Node.js 20 server, modern browsers)
**Project Type**: web (frontend + backend separate codebases)
**Performance Goals**: <1s page load, <2s event list render, <500ms API response
**Constraints**: Multi-tenant data isolation via RLS, 2MB logo file limit, mobile-responsive UI
**Scale/Scope**: 4 admin screens, 46 functional requirements, ~15 API endpoints, ~8 React components

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. No Easy Fixes
- No shortcuts or workarounds in plan
- All solutions address root causes (e.g., RLS for multi-tenancy, not manual tenant_id checks)

### ✅ II. Security First
- RLS policies on all tenant tables (events, tenants, admins)
- Admin-only routes with auth middleware
- File upload validation (size, type, content-type)
- No authentication bypass

### ✅ III. Test-Driven Development (TDD)
- Contract tests before implementation
- Integration tests for each user flow
- Red-Green-Refactor cycle enforced

### ✅ IV. Multi-Tenant Isolation
- tenant_id on all data tables
- RLS policies prevent cross-tenant access
- Explicit multi-tenant isolation tests

### ✅ V. UX-First Design
- Performance targets defined (<1s preview, <2s listings)
- Mobile-responsive (Tailwind CSS)
- Simple interfaces (color pickers, file upload, forms)

### ✅ VI. Simplicity
- Use existing tech stack (Supabase, Next.js, Express)
- Service layer pattern (proven architecture)
- No premature optimization

**Result**: ✅ PASS - No constitutional violations

## Project Structure

### Documentation (this feature)
```
specs/002-facciamo-tutti-gli/
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
│   ├── models/          # Event, Branding, TenantSettings TypeScript interfaces
│   ├── services/        # brandingService.ts, eventService.ts, settingsService.ts
│   ├── routes/          # events.ts (extend), branding.ts (new), settings.ts (new)
│   ├── middleware/      # adminAuth.ts (verify admin role)
│   └── app.ts           # Register new routes
└── tests/
    ├── contract/        # API contract tests (vitest + supertest)
    └── integration/     # Multi-flow integration tests

frontend/
├── src/
│   ├── app/
│   │   └── admin/
│   │       ├── events/
│   │       │   ├── new/page.tsx       # Create event screen
│   │       │   ├── [id]/edit/page.tsx # Edit event screen
│   │       │   └── page.tsx           # Event list screen (sortable)
│   │       ├── branding/page.tsx      # Branding customization
│   │       └── settings/page.tsx      # Settings screen
│   ├── components/
│   │   ├── admin/
│   │   │   ├── EventForm.tsx          # Shared create/edit form
│   │   │   ├── EventList.tsx          # Event list with sort/filter
│   │   │   ├── BrandingPreview.tsx    # Live preview component
│   │   │   ├── ColorPicker.tsx        # Color picker UI
│   │   │   ├── LogoUpload.tsx         # Logo upload with validation
│   │   │   └── SettingsForm.tsx       # Settings form
│   │   └── layout/
│   │       └── AdminNav.tsx           # Admin panel navigation
│   └── contexts/
│       └── TenantContext.tsx          # Extend with branding state
└── tests/
    └── integration/     # E2E user flow tests
```

**Structure Decision**: Web application with separate frontend and backend. Next.js 14 App Router for frontend with nested admin routes. Express.js backend with service layer pattern. Shared TypeScript types for contracts.

## Phase 0: Outline & Research

### Research Tasks
1. **Color Picker Component**: Best React color picker library for Tailwind CSS projects (react-colorful vs react-color)
2. **File Upload Validation**: Client-side file validation patterns for React (file type, size, preview)
3. **Dynamic Branding**: CSS custom properties pattern for tenant-specific theming in Next.js
4. **RLS Logo Access**: Supabase Storage RLS policies for public logo access with tenant isolation
5. **Sort/Filter State**: URL-based filtering and sorting patterns in Next.js App Router (useSearchParams)

### Research Output Format
Each research item will be documented in `research.md` with:
- **Decision**: Technology/pattern chosen
- **Rationale**: Why this choice fits ShareHub requirements
- **Alternatives Considered**: What else was evaluated and why rejected
- **Implementation Notes**: Key integration points

**Output**: research.md with all technology choices and patterns resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Data Model (`data-model.md`)
Extract entities from spec and existing database:

**New/Extended Entities**:
- **events** table (extend existing):
  - Add: `branding_overrides` JSONB (optional event-specific branding)
  - Validation: event_date >= today (for new events), status computed from date

- **tenants** table (extend existing):
  - Add: `branding` JSONB with schema:
    ```
    {
      primary_color: string (hex),
      secondary_color: string (hex),
      logo_url: string (Supabase Storage path)
    }
    ```
  - Add: `hotel_name` VARCHAR(100) NOT NULL
  - Add: `contact_email` VARCHAR(255)
  - Add: `contact_phone` VARCHAR(50)

- **billing_info** (read-only view/join):
  - Fields: plan_name, renewal_date, payment_method
  - Note: Actual billing data managed externally, this feature only displays

**Validation Rules** (from FR requirements):
- Hotel name: 2-100 characters, required
- Email: Valid email format
- Phone: Valid phone format (flexible international)
- Logo: PNG/JPG/SVG, max 2MB
- Event name: Required, max 255 chars
- Event date: >= today (for creation/edit of future events)
- Description: Plain text with line breaks, max 2000 chars

### 2. API Contracts (`contracts/`)

**New Endpoints**:

```
POST   /events                    # Create event (extend existing)
PUT    /events/:id                # Update event (new)
GET    /events                    # List events with sort/filter (extend existing)

GET    /branding/:tenantId        # Get tenant branding
PUT    /branding/:tenantId        # Update tenant branding
POST   /branding/:tenantId/logo   # Upload logo (multipart/form-data)
DELETE /branding/:tenantId/logo   # Remove logo
POST   /branding/:tenantId/reset  # Reset to defaults

GET    /settings/:tenantId        # Get tenant settings (hotel name, contact, billing view)
PUT    /settings/:tenantId        # Update tenant settings (hotel name, contact only)
```

**Contract Files** (OpenAPI YAML):
- `contracts/events-api.yaml` - Event CRUD operations
- `contracts/branding-api.yaml` - Branding management
- `contracts/settings-api.yaml` - Settings management

### 3. Contract Tests
Generate failing tests for each endpoint:
- `tests/contract/events-create.test.ts`
- `tests/contract/events-update.test.ts`
- `tests/contract/events-list.test.ts`
- `tests/contract/branding-get.test.ts`
- `tests/contract/branding-update.test.ts`
- `tests/contract/branding-logo-upload.test.ts`
- `tests/contract/settings-get.test.ts`
- `tests/contract/settings-update.test.ts`

### 4. Integration Test Scenarios (`quickstart.md`)
From user stories:
1. **Create Event Flow**: Admin creates public event → verify tokens generated → verify tenant isolation
2. **Edit Event Flow**: Admin edits future event → succeeds, tries to edit past event → read-only
3. **Branding Flow**: Admin uploads logo → changes colors → sees live preview → saves → verify applied to all pages
4. **Event List Flow**: Admin views events → changes sort order → filters by status → verifies correct results
5. **Settings Flow**: Admin updates hotel name → updates contact info → views billing (read-only) → verify saved

### 5. Update CLAUDE.md
Run script to update agent context file incrementally:
```bash
.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude
```

**Output**: data-model.md, contracts/*.yaml, failing contract tests, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 artifacts in TDD order:

**Database Tasks** (sequential):
- T001: Extend `events` table with branding_overrides column
- T002: Extend `tenants` table with branding + contact fields
- T003: Create RLS policies for extended fields
- T004: Test RLS policies for multi-tenant isolation

**Backend Contract Test Tasks** (parallel after DB):
- T005: [P] Write contract test: POST /events
- T006: [P] Write contract test: PUT /events/:id
- T007: [P] Write contract test: GET /events (with sort/filter)
- T008: [P] Write contract test: GET /branding/:tenantId
- T009: [P] Write contract test: PUT /branding/:tenantId
- T010: [P] Write contract test: POST /branding/:tenantId/logo
- T011: [P] Write contract test: GET /settings/:tenantId
- T012: [P] Write contract test: PUT /settings/:tenantId

**Backend Implementation Tasks** (sequential):
- T013: Create brandingService.ts with color/logo operations
- T014: Create settingsService.ts with hotel/contact operations
- T015: Extend eventService.ts with update operation
- T016: Create branding.ts routes with multer logo upload
- T017: Create settings.ts routes
- T018: Extend events.ts routes with update + list sort/filter
- T019: Create adminAuth.ts middleware
- T020: Register new routes in app.ts

**Frontend Component Tasks** (parallel after backend routes):
- T021: [P] Create ColorPicker.tsx component
- T022: [P] Create LogoUpload.tsx with client validation
- T023: [P] Create BrandingPreview.tsx live preview
- T024: [P] Create EventForm.tsx shared create/edit form
- T025: [P] Create EventList.tsx with sort/filter UI
- T026: [P] Create SettingsForm.tsx
- T027: [P] Extend AdminNav.tsx with new routes

**Frontend Page Tasks** (sequential after components):
- T028: Create /admin/events/new/page.tsx (create event screen)
- T029: Create /admin/events/[id]/edit/page.tsx (edit event screen)
- T030: Update /admin/events/page.tsx (event list with sort/filter)
- T031: Create /admin/branding/page.tsx (branding customization)
- T032: Create /admin/settings/page.tsx (settings screen)
- T033: Extend TenantContext.tsx with branding state

**Integration Test Tasks** (parallel after pages):
- T034: [P] Integration test: Create event flow (quickstart scenario 1)
- T035: [P] Integration test: Edit event flow (quickstart scenario 2)
- T036: [P] Integration test: Branding flow (quickstart scenario 3)
- T037: [P] Integration test: Event list flow (quickstart scenario 4)
- T038: [P] Integration test: Settings flow (quickstart scenario 5)

**Ordering Strategy**:
- TDD: Tests before implementation
- Dependencies: DB → Backend tests → Backend impl → Frontend components → Frontend pages → Integration tests
- [P] markers indicate parallel execution (independent files/modules)

**Estimated Output**: 38 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, verify performance targets <1s/<2s)

## Complexity Tracking
*No constitutional violations detected - table remains empty*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| -         | -          | -                                   |

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
- [x] All NEEDS CLARIFICATION resolved: YES (3 deferred with sensible defaults)
- [x] Complexity deviations documented: N/A (no violations)

---
*Based on ShareHub Constitution - See `.specify/memory/constitution.md`*
