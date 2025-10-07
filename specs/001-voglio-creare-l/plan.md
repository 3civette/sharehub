# Implementation Plan: Hotel Admin Dashboard

**Branch**: `001-voglio-creare-l` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-voglio-creare-l/spec.md`

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
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Create a hotel admin dashboard for ShareHub multi-tenant platform. Dashboard provides hotel administrators with overview of events, presentations, and system status. Key features include: minimal metrics display (active events count, recent activity timestamp), navigation to Events/Branding/Settings management pages, quick action buttons for event creation, recent activity log, and granular branding customization controls. System uses token-based access for organizers (upload) and participants (view/download).

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS for backend, React 18 for frontend)
**Primary Dependencies**: Next.js 14 (frontend), Express.js (backend API), Supabase (database + auth), Tailwind CSS (styling)
**Storage**: Supabase PostgreSQL with existing multi-tenant schema (tenants, events, admins, slides tables)
**Testing**: Vitest (backend), Next.js testing (frontend)
**Target Platform**: Web application (modern browsers)
**Project Type**: web (frontend + backend separation detected)
**Performance Goals**: Dashboard load <2s, page transitions <500ms, preview updates <300ms
**Constraints**: Multi-tenant data isolation required, token-based authentication for non-admin access, granular per-element branding controls
**Scale/Scope**: Support 100+ hotels, 1000+ events, 10k+ users initially

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: Constitution template not populated - no specific constraints detected in template file. Proceeding with standard web application patterns.

**General Principles Applied**:
- Separation of concerns: Backend API + Frontend UI
- Test-driven development approach
- RESTful API design for data operations
- Component-based UI architecture

## Project Structure

### Documentation (this feature)
```
specs/001-voglio-creare-l/
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
│   │   ├── tenants.ts      # Existing tenant/branding management
│   │   ├── events.ts       # Existing event CRUD
│   │   ├── slides.ts       # Existing slide management
│   │   ├── dashboard.ts    # NEW: Dashboard metrics aggregation
│   │   └── activity.ts     # NEW: Activity log tracking
│   ├── models/
│   │   ├── tenant.ts
│   │   ├── event.ts
│   │   └── activity.ts     # NEW: Activity log model
│   ├── services/
│   │   ├── metrics.ts      # NEW: Metrics calculation service
│   │   └── branding.ts     # NEW: Branding inheritance logic
│   └── app.ts
└── tests/
    ├── contract/           # API contract tests
    ├── integration/        # Integration tests
    └── unit/               # Unit tests

frontend/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── dashboard/        # NEW: Main dashboard page
│   │   │   │   └── page.tsx
│   │   │   ├── events/           # Existing (to be enhanced)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx  # Event details with tokens
│   │   │   │   └── create/
│   │   │   │       └── page.tsx
│   │   │   ├── branding/         # Existing (to be enhanced)
│   │   │   │   └── page.tsx      # Branding customization UI
│   │   │   └── settings/         # NEW: Admin settings
│   │   │       └── page.tsx
│   │   └── login/                # Existing (update redirect)
│   │       └── page.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx    # NEW: Metric display with trends
│   │   │   ├── ActivityLog.tsx   # NEW: Recent activity list
│   │   │   └── QuickActions.tsx  # NEW: Action buttons
│   │   ├── branding/
│   │   │   ├── BrandingEditor.tsx        # NEW: Branding config UI
│   │   │   ├── ColorPicker.tsx           # NEW: Color customization
│   │   │   ├── LogoUploader.tsx          # NEW: Logo management
│   │   │   ├── CustomizationFlags.tsx    # NEW: Per-element flags
│   │   │   └── BrandingPreview.tsx       # NEW: Live preview
│   │   └── events/
│   │       └── TokenDisplay.tsx           # NEW: Token copy UI
│   ├── contexts/
│   │   └── TenantContext.tsx     # Existing tenant state
│   └── lib/
│       ├── api.ts                # API client
│       └── supabase.ts           # Supabase client
└── tests/
    └── e2e/                      # End-to-end tests
```

**Structure Decision**: Web application structure with existing `backend/` and `frontend/` directories. Backend uses Express.js with TypeScript, frontend uses Next.js 14 with App Router. Dashboard feature will add new routes/components to existing structure while enhancing current event and branding pages.

## Phase 0: Outline & Research

**Research Topics** (to be documented in research.md):

1. **Dashboard Metrics Calculation**
   - Efficient aggregation queries for Supabase PostgreSQL
   - Caching strategies for dashboard data (Redis vs in-memory vs Supabase query caching)
   - Real-time vs poll-based updates (decided: page load refresh per FR-005)

2. **Branding Inheritance & Customization**
   - JSON schema design for per-element customization flags
   - CSS custom properties vs Tailwind dynamic classes for theme application
   - Preview implementation patterns (iframe vs inline with scoped styles)

3. **Activity Logging**
   - Event types to track (admin actions, organizer uploads, participant views)
   - Storage strategy (dedicated activity_logs table vs event sourcing)
   - Retention policies and query performance for recent activity

4. **Token Generation & Display**
   - UUID vs nanoid vs custom format for organizer/participant tokens
   - Token validation strategies
   - Secure copy-to-clipboard implementation

5. **Multi-tenant Data Isolation**
   - Row-level security (RLS) policies in Supabase
   - Backend middleware for tenant context
   - Frontend tenant context propagation

6. **Next.js 14 App Router Patterns**
   - Server components vs client components for dashboard
   - Data fetching strategies (server-side vs client-side)
   - Middleware for auth redirect to dashboard

**Deliverable**: research.md with decisions, rationale, and code examples for each topic.

## Phase 1: Design & Contracts

### Data Model Enhancements (data-model.md)

**New Entities**:
1. **activity_logs**
   - id (uuid, PK)
   - tenant_id (uuid, FK to tenants)
   - event_id (uuid, FK to events, nullable)
   - actor_type (enum: admin, organizer, participant, system)
   - action_type (enum: event_created, slide_uploaded, slide_viewed, branding_updated, etc.)
   - metadata (jsonb)
   - created_at (timestamp)

2. **branding_customization** (enhance existing tenants table)
   - Add JSON column to tenants table: `branding_config`
   ```json
   {
     "colors": { "primary": "#hex", "secondary": "#hex" },
     "logo_url": "string",
     "advertisements": [{"image_url": "string", "link_url": "string"}]
   }
   ```
   - Add JSON column to events table: `branding_overrides`
   ```json
   {
     "colors": { "value": {"primary": "#hex"}, "customizable": false },
     "logo_url": { "value": "string", "customizable": true },
     "advertisements": { "value": [...], "customizable": false }
   }
   ```

**Enhanced Entities**:
- **events**: Add `organizer_token` and `participant_token` columns (text, indexed, unique)

### API Contracts (contracts/)

**New Endpoints**:

1. `GET /api/dashboard/metrics/:tenantId`
   - Response: `{ active_events_count: number, last_activity_at: string }`

2. `GET /api/dashboard/activity/:tenantId?limit=5`
   - Response: `{ activities: Activity[] }`

3. `GET /api/events/:eventId/tokens`
   - Response: `{ organizer_token: string, participant_token: string }`

4. `GET /api/tenants/:tenantId/branding`
   - Response: `{ branding_config: BrandingConfig }`

5. `PUT /api/tenants/:tenantId/branding`
   - Request: `{ branding_config: BrandingConfig }`
   - Response: `{ success: boolean }`

6. `PUT /api/events/:eventId/branding`
   - Request: `{ branding_overrides: BrandingOverrides }`
   - Response: `{ success: boolean }`

**Contract Tests**: One test file per endpoint validating request/response schemas (must fail initially).

### Quickstart Validation (quickstart.md)

**User Journey Test**:
1. Login as hotel admin → redirected to dashboard
2. Verify dashboard shows metrics and activity log
3. Click "Create New Event" → create event form
4. Save event → verify tokens generated
5. Navigate to Event details → verify tokens displayed with copy buttons
6. Navigate to Branding page → modify colors
7. Verify preview updates immediately
8. Navigate to Event branding → override logo, verify customization flag

**Deliverables**:
- data-model.md with schema definitions
- contracts/ directory with OpenAPI specs
- Failing contract tests
- quickstart.md with step-by-step validation

### Agent Context Update

Run: `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`

This will update CLAUDE.md with:
- New dashboard routes and components
- Branding customization patterns
- Activity logging architecture
- Token management approach

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate from Phase 1 artifacts:
   - Contract tests (7 endpoints) → 7 test tasks [P]
   - Data model updates → 2 migration tasks [P]
   - Backend routes → 6 implementation tasks
   - Frontend components → 12 component tasks
   - Integration tests from quickstart → 8 test tasks
   - Login redirect update → 1 task
   - Branding preview → 1 task

**Ordering Strategy**:
- TDD order: Contract tests → Migrations → Backend implementation → Frontend components
- Dependencies: Migrations before backend, backend before frontend
- Parallel groups marked with [P]

**Estimated Output**: ~35-40 tasks in dependency order

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, execute quickstart.md, verify all FR-* requirements)

## Complexity Tracking
*No constitution violations detected - standard web application patterns applied*

| Aspect | Approach | Justification |
|--------|----------|---------------|
| N/A | N/A | No deviations from standard practices |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 42 tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no specific constraints)
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (via /clarify session)
- [x] Complexity deviations documented (none)

**Deliverables Created**:
- [x] research.md - Technical decisions documented
- [x] data-model.md - Database schema and interfaces defined
- [x] contracts/api-contracts.yaml - OpenAPI 3.0 specification
- [x] quickstart.md - User journey validation script
- [x] CLAUDE.md - Updated agent context

---
*Based on ShareHub project structure - See `/CLAUDE.md`*
