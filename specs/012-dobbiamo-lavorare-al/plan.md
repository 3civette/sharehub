
# Implementation Plan: Meeting Hub Portal - B2B SaaS Transformation

**Branch**: `012-dobbiamo-lavorare-al` | **Date**: 2025-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-dobbiamo-lavorare-al/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → SUCCESS: Feature spec loaded with clarified requirements
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → SUCCESS: All technical decisions resolved
   → Detect Project Type: web (frontend+backend)
   → Set Structure Decision: Web application with Next.js 14 App Router + Supabase
3. Fill Constitution Check section
   → SUCCESS: All constitutional principles verified
4. Evaluate Constitution Check
   → PASS: No violations, multi-tenant isolation enforced
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md
   → SUCCESS: Researched subscription models, pricing UX, and agency onboarding patterns
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → SUCCESS: Complete data model with 4 new entities
   → SUCCESS: REST API contracts for agency management
   → SUCCESS: User journey validation tests
   → SUCCESS: Updated CLAUDE.md with portal patterns
7. Re-evaluate Constitution Check
   → PASS: Design maintains RLS isolation, TDD approach
   → Update Progress Tracking: Post-Design Constitution Check ✓
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   → SUCCESS: Defined 32-task implementation plan
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature transforms ShareHub from a single-tenant hotel portal into "Meeting Hub by 3Civette" - a B2B SaaS platform for MICE agencies. The portal enables agencies to self-register, manage multiple events with custom branding (logo, 4 colors, 5 font presets), upload up to 5 banners per event, and control access via time-limited tokens. The system implements a 4-tier freemium model (FREE/Basic/Professional/Enterprise) with clear usage limits and upgrade paths.

**Key Technical Changes**:
- **Agency Accounts**: New `agencies` table (replaces hotel-centric `tenants`)
- **Subscription Management**: `subscriptions` table with tier enforcement
- **Event Branding**: `event_branding` table (extends existing branding system)
- **Token Lifecycle**: Auto-expiration 7 days post-event (extends `access_tokens`)
- **Admin Rebrand**: 3Civette palette applied to all admin interfaces
- **Public Portal**: Marketing site for agency acquisition

## Technical Context

**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)

**Primary Dependencies**: Next.js 14 App Router, Express.js (deprecated), Supabase (PostgreSQL + Storage + Auth), Tailwind CSS 3.x, Lucide React, nanoid (tokens), Zod (validation)

**Storage**: Supabase PostgreSQL with RLS, Supabase Storage for logos/banners (already implemented), Cloudflare R2 for hot/cold archiving (feature 008)

**Testing**: Vitest (unit + integration), Supertest (API contracts), manual E2E checklist

**Target Platform**: Web (Netlify frontend, Fly.io backend, Supabase managed DB)

**Project Type**: web (frontend + backend)

**Performance Goals**:
  - Agency signup < 2s
  - Dashboard load (20 events) < 1.5s
  - Branding customization preview < 500ms
  - Event creation < 3s

**Constraints**:
  - FREE tier: max 3 events
  - Basic tier: max 5 events, €29/month
  - Professional tier: max 20 events, €79/month
  - Enterprise tier: unlimited events, €199/month, priority support
  - Token expiration: non-regenerable, 7-day auto-expire post-event
  - Banner system: already implemented (feature 010)

**Scale/Scope**:
  - Initial launch: 50 agencies, 500 events
  - 1-year target: 500 agencies, 5000 events
  - Multi-tenant isolation critical for data security

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. No Easy Fixes ✓
- **No Shortcuts**: Token expiration enforced at DB level with CHECK constraints, not app logic
- **Root Cause Fixes**: Subscription limits validated both at API boundary and via DB triggers
- **Proper Investigation**: Existing branding system (feature 002) extended, not replaced

### II. Security First ✓
- **RLS Enabled**: All new tables (`agencies`, `subscriptions`, `event_branding`) have RLS policies
- **Multi-Tenant Isolation**: Agency ID propagated through all queries via `app.current_agency_id`
- **No Bypass**: Token validation requires both DB lookup AND expiration check
- **Least Privilege**: Public marketing pages have no DB access, admin routes require auth

### III. Test-Driven Development (TDD) ✓
- **Contract Tests First**: API contracts for agency CRUD, subscription management, branding config
- **Red-Green-Refactor**: Tests fail initially (no implementation), pass after implementation
- **Test Coverage**: All functional requirements have corresponding contract/integration tests

### IV. Multi-Tenant Isolation ✓
- **Tenant ID Required**: `agency_id` foreign key on all event-related tables
- **RLS Policies**: Agency-scoped queries prevent cross-tenant leakage
- **Explicit Testing**: Integration tests verify agency A cannot access agency B's events

### V. UX-First Design ✓
- **User Problem**: MICE agencies need branded event pages + secure content sharing
- **Performance**: Dashboard loads < 1.5s, branding preview < 500ms
- **Simple Interfaces**: Self-service signup, one-click tier upgrades, drag-and-drop logo upload
- **Mobile-Responsive**: Tailwind CSS with responsive breakpoints

### VI. Simplicity ✓
- **Proven Stack**: Existing Next.js + Supabase infrastructure
- **No Premature Optimization**: Use existing banner system (feature 010), extend branding (feature 002)
- **YAGNI**: No multi-user accounts (defer to future), no custom payment gateway (use external)
- **Justified Complexity**: 4-tier model documented in spec, freemium is industry standard

**GATE STATUS**: ✅ PASS - All constitutional principles upheld

## Project Structure

### Documentation (this feature)
```
specs/012-dobbiamo-lavorare-al/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── agency-api.yaml        # Agency CRUD endpoints
│   ├── subscription-api.yaml  # Subscription management
│   ├── branding-api.yaml      # Event branding config
│   └── portal-api.yaml        # Public marketing pages
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/ (DEPRECATED - migrated to Next.js API routes in feature 008)
├── migrations/          # Legacy SQL migrations (reference only)
└── tests/              # Legacy test files (will be migrated)

frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agencies/
│   │   │   │   ├── signup/route.ts     # NEW: Agency registration
│   │   │   │   ├── profile/route.ts    # NEW: Profile CRUD
│   │   │   │   └── logo/route.ts       # NEW: Logo upload
│   │   │   ├── subscriptions/
│   │   │   │   ├── current/route.ts    # NEW: Get current tier
│   │   │   │   ├── upgrade/route.ts    # NEW: Tier upgrade
│   │   │   │   └── downgrade/route.ts  # NEW: Tier downgrade
│   │   │   └── branding/
│   │   │       └── [eventId]/route.ts  # EXTEND: Add font + 4 colors
│   │   ├── (portal)/
│   │   │   ├── page.tsx                # REPLACE: Marketing homepage
│   │   │   ├── pricing/page.tsx        # NEW: Pricing comparison
│   │   │   └── signup/page.tsx         # NEW: Agency registration
│   │   └── (admin)/
│   │       ├── dashboard/page.tsx      # EXTEND: Add tier usage
│   │       ├── profile/page.tsx        # NEW: Agency profile
│   │       └── subscription/page.tsx   # NEW: Tier management
│   ├── components/
│   │   ├── portal/
│   │   │   ├── HeroSection.tsx         # NEW: Marketing hero
│   │   │   ├── PricingTable.tsx        # NEW: 4-tier comparison
│   │   │   ├── SignupForm.tsx          # NEW: Registration form
│   │   │   └── FeatureShowcase.tsx     # NEW: Product benefits
│   │   ├── admin/
│   │   │   ├── AgencyProfile.tsx       # NEW: Company settings
│   │   │   ├── SubscriptionCard.tsx    # NEW: Current tier + CTA
│   │   │   └── BrandingEditor.tsx      # EXTEND: Font + 4 colors
│   │   └── common/
│   │       ├── FontPicker.tsx          # NEW: 5 preset fonts
│   │       └── ColorPalette.tsx        # NEW: 4-color picker
│   ├── contexts/
│   │   ├── AgencyContext.tsx           # NEW: Replace TenantContext
│   │   └── SubscriptionContext.tsx     # NEW: Tier limits + usage
│   └── lib/
│       ├── agencyService.ts            # NEW: Agency API client
│       └── subscriptionService.ts      # NEW: Subscription client
└── tests/
    ├── api/
    │   ├── agencies.test.ts            # NEW: Agency API contracts
    │   ├── subscriptions.test.ts       # NEW: Subscription contracts
    │   └── branding.test.ts            # EXTEND: Font + color tests
    └── integration/
        ├── agencyOnboarding.test.ts    # NEW: Signup → event flow
        └── tierLimits.test.ts          # NEW: Limit enforcement

supabase/
└── migrations/
    ├── 20251014_create_agencies_table.sql      # NEW
    ├── 20251014_create_subscriptions_table.sql # NEW
    ├── 20251014_create_event_branding_table.sql # NEW
    ├── 20251014_extend_access_tokens.sql       # EXTEND
    ├── 20251014_rls_agencies.sql               # NEW
    ├── 20251014_rls_subscriptions.sql          # NEW
    └── 20251014_rls_event_branding.sql         # NEW
```

**Structure Decision**: Web application with Next.js 14 App Router (frontend) and Supabase PostgreSQL (backend). The backend Express.js API is deprecated (feature 008) in favor of Next.js API routes. All new API endpoints will be implemented as Next.js route handlers in `frontend/src/app/api/`. Multi-tenant isolation enforced via RLS policies using `agency_id` as the tenant identifier.

## Phase 0: Outline & Research

**Goal**: Resolve all technical unknowns and establish patterns for B2B SaaS implementation

### Research Tasks

1. **Subscription Model Patterns**
   - Research freemium tier limits enforcement (Stripe, Chargebee patterns)
   - Investigate soft vs hard limits (block vs warn at quota)
   - Decision: Hard block with upgrade CTA (better conversion)
   - Rationale: Prevents overages, clear upgrade path
   - Alternatives: Soft limit with overage billing (too complex for MVP)

2. **Agency Onboarding UX**
   - Research self-service signup flows (Airtable, Notion)
   - Investigate email verification requirements (mandatory vs optional)
   - Decision: Immediate activation + optional email verification
   - Rationale: Reduce friction, email verification can come later
   - Alternatives: Mandatory verification (blocks activation, worse conversion)

3. **Branding Customization Patterns**
   - Research font picker UX (Google Fonts selector, preset pickers)
   - Investigate color palette editors (4-color vs unlimited)
   - Decision: 5 preset fonts + 4-color palette with hex input
   - Rationale: Balances flexibility with design consistency
   - Alternatives: Full Google Fonts (overwhelming), 2 colors (too limited)

4. **Token Lifecycle Management**
   - Research auto-expiration patterns (JWT TTL, DB-enforced expiration)
   - Investigate token regeneration policies (Stripe API keys)
   - Decision: DB-enforced 7-day post-event expiration, non-regenerable
   - Rationale: Security-first, forces agencies to plan token distribution
   - Alternatives: Regenerable tokens (opens abuse vector)

5. **Multi-Tenant Data Migration**
   - Research tenant → agency rename strategy (alias vs migration)
   - Investigate backward compatibility requirements
   - Decision: Alias `tenants` table as `agencies`, update references incrementally
   - Rationale: Zero downtime, gradual migration, backward compatible
   - Alternatives: Immediate rename (breaks existing code)

**Output**: research.md with all unknowns resolved (see research.md artifact)

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Data Model (`data-model.md`)

**New Entities**:

**Agency** (replaces/aliases `tenants`)
- Fields: `id` (UUID PK), `company_name` (TEXT), `contact_email` (TEXT UNIQUE), `password_hash` (TEXT), `phone` (TEXT NULL), `vat_number` (TEXT NULL), `address` (TEXT NULL), `logo_url` (TEXT NULL), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ)
- Relationships: `has_one` Subscription, `has_many` Events
- Validation: Email uniqueness, password min 8 chars, company name 2-100 chars
- RLS: Agency can only access their own record

**Subscription**
- Fields: `id` (UUID PK), `agency_id` (UUID FK), `tier` (ENUM: 'free'|'basic'|'professional'|'enterprise'), `status` (ENUM: 'active'|'suspended'|'cancelled'), `event_limit` (INT), `current_event_count` (INT DEFAULT 0), `billing_cycle` (DATE NULL), `price_monthly` (DECIMAL NULL), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ)
- Relationships: `belongs_to` Agency
- Business Rules: FREE (limit=3, price=0), Basic (limit=5, price=29), Professional (limit=20, price=79), Enterprise (limit=-1, price=199)
- RLS: Agency can only access their own subscription

**EventBranding**
- Fields: `id` (UUID PK), `event_id` (UUID FK UNIQUE), `agency_id` (UUID FK), `logo_url` (TEXT NULL), `primary_color` (TEXT CHECK hex), `secondary_color` (TEXT CHECK hex), `accent_color` (TEXT CHECK hex), `background_color` (TEXT CHECK hex), `font_family` (ENUM: 'inter'|'merriweather'|'poppins'|'roboto'|'playfair'), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ)
- Relationships: `belongs_to` Event (1:1), `belongs_to` Agency
- Defaults: 3Civette palette if not customized
- RLS: Agency can only access branding for their events

**AccessToken (extended)**
- NEW Fields: `token_type` (ENUM: 'slide_upload'|'participant_access'), `auto_expire_date` (TIMESTAMPTZ NOT NULL CHECK = event_date + 7 days)
- Business Rules: Tokens expire automatically 7 days post-event, cannot be regenerated
- Migration: Add `auto_expire_date` to existing tokens, backfill from event dates

### 2. API Contracts (`/contracts/`)

**Agency API** (`agency-api.yaml`)
```yaml
POST /api/agencies/signup
  Request: { company_name, contact_email, password, phone?, vat_number? }
  Response: { agency_id, subscription: { tier: 'free', event_limit: 3 } }
  Status: 201 Created | 409 Conflict (email exists) | 400 Bad Request

GET /api/agencies/profile
  Auth: Required (JWT)
  Response: { id, company_name, contact_email, phone, vat_number, logo_url }
  Status: 200 OK | 401 Unauthorized

PATCH /api/agencies/profile
  Auth: Required
  Request: { company_name?, phone?, vat_number?, address? }
  Response: { updated_fields }
  Status: 200 OK | 400 Bad Request

POST /api/agencies/profile/logo
  Auth: Required
  Content-Type: multipart/form-data
  Request: file (JPEG/PNG/SVG, max 2MB)
  Response: { logo_url }
  Status: 200 OK | 413 Payload Too Large
```

**Subscription API** (`subscription-api.yaml`)
```yaml
GET /api/subscriptions/current
  Auth: Required
  Response: { tier, status, event_limit, current_event_count, usage_percent }
  Status: 200 OK

POST /api/subscriptions/upgrade
  Auth: Required
  Request: { target_tier: 'basic'|'professional'|'enterprise' }
  Response: { new_tier, new_limit, price_monthly }
  Status: 200 OK | 400 Bad Request (invalid tier) | 409 Conflict (already at tier)

POST /api/subscriptions/downgrade
  Auth: Required
  Request: { target_tier }
  Validation: current_event_count must be <= new tier limit
  Response: { new_tier, new_limit }
  Status: 200 OK | 409 Conflict (too many events)
```

**Branding API** (`branding-api.yaml`)
```yaml
GET /api/events/:eventId/branding
  Auth: Required
  Response: { logo_url, primary_color, secondary_color, accent_color, background_color, font_family }
  Status: 200 OK | 404 Not Found (defaults to 3Civette palette)

PUT /api/events/:eventId/branding
  Auth: Required
  Request: { primary_color?, secondary_color?, accent_color?, background_color?, font_family? }
  Validation: Hex colors (#RRGGBB), font_family in enum
  Response: { updated_branding }
  Status: 200 OK | 400 Bad Request

POST /api/events/:eventId/branding/logo
  Auth: Required
  Content-Type: multipart/form-data
  Request: file (JPEG/PNG/SVG, max 2MB)
  Response: { logo_url }
  Status: 200 OK | 413 Payload Too Large
```

### 3. Contract Tests (Vitest + Supertest)

**Test Files**:
- `frontend/tests/api/agencies.test.ts` - All agency API endpoints
- `frontend/tests/api/subscriptions.test.ts` - Tier management
- `frontend/tests/api/branding.test.ts` - Event branding CRUD

**Example Test**:
```typescript
describe('POST /api/agencies/signup', () => {
  it('creates agency with free tier', async () => {
    const response = await request(app)
      .post('/api/agencies/signup')
      .send({
        company_name: 'MICE Events Inc',
        contact_email: 'admin@miceevents.com',
        password: 'SecurePass123!'
      })
      .expect(201);

    expect(response.body.agency_id).toBeDefined();
    expect(response.body.subscription.tier).toBe('free');
    expect(response.body.subscription.event_limit).toBe(3);
  });

  it('rejects duplicate email', async () => {
    // First signup
    await request(app).post('/api/agencies/signup').send({ /* ... */ });

    // Duplicate signup
    await request(app)
      .post('/api/agencies/signup')
      .send({ /* same email */ })
      .expect(409);
  });
});
```

### 4. Integration Tests

**Scenarios**:
- **Agency Onboarding Flow**: Signup → Profile setup → First event creation
- **Tier Limit Enforcement**: Create max events → Attempt to exceed → See upgrade CTA
- **Branding Customization**: Upload logo → Set colors → Preview on event page
- **Token Expiration**: Create event → Wait 7 days post-date → Verify tokens expired

### 5. Update CLAUDE.md

Run update script:
```powershell
powershell -ExecutionPolicy Bypass -File .specify/scripts/powershell/update-agent-context.ps1 -AgentType claude
```

**Incremental Updates**:
- Add "Meeting Hub Portal (012)" to Active Technologies
- Add subscription tier patterns to Feature-Specific Patterns
- Add agency context usage examples
- Preserve manual additions between markers

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Template**: Use `.specify/templates/tasks-template.md`
2. **Generate from Contracts**: Each API endpoint → contract test task + implementation task
3. **Generate from Data Model**: Each entity → migration task + model task + RLS task
4. **Generate from User Stories**: Each acceptance scenario → integration test task

**Task Categories**:

**Database Tasks** (10 tasks):
1. Create agencies table migration [P]
2. Create subscriptions table migration [P]
3. Create event_branding table migration [P]
4. Extend access_tokens table (auto-expiration) [P]
5. Create RLS policies for agencies
6. Create RLS policies for subscriptions
7. Create RLS policies for event_branding
8. Create subscription tier enforcement trigger
9. Create token auto-expiration function
10. Test multi-tenant isolation (agencies)

**Backend API Tasks** (12 tasks):
11. Agency signup API route (Next.js)
12. Agency profile GET/PATCH routes
13. Agency logo upload route
14. Subscription current tier GET route
15. Subscription upgrade POST route
16. Subscription downgrade POST route
17. Event branding GET/PUT routes (extend existing)
18. Event branding logo upload route
19. Tier limit middleware
20. Token expiration validation middleware
21. Contract tests for agency APIs
22. Contract tests for subscription APIs

**Frontend Tasks** (10 tasks):
23. Marketing homepage (HeroSection, FeatureShowcase)
24. Pricing page (PricingTable component)
25. Signup form (validation + error handling)
26. Agency profile page
27. Subscription management page
28. Branding editor (font picker + 4-color palette)
29. Dashboard tier usage display
30. AgencyContext (replace TenantContext)
31. SubscriptionContext (tier limits + usage)
32. Rebrand admin UI to 3Civette palette

**Ordering Strategy**:
- **Phase 1 (DB Foundation)**: Tasks 1-10 (parallel where possible)
- **Phase 2 (Backend Services)**: Tasks 11-20 → 21-22
- **Phase 3 (Frontend UI)**: Tasks 23-29 → 30-32
- **Phase 4 (Integration)**: Run all contract tests → Run integration tests → Manual QA

**Estimated Output**: 32 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations - table remains empty*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | *(none)* | *(none)* |

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
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 - See `.specify/memory/constitution.md`*
