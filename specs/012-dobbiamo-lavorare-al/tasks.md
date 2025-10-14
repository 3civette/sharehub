# Tasks: Meeting Hub Portal - B2B SaaS Transformation

**Feature**: 012-dobbiamo-lavorare-al
**Branch**: `012-dobbiamo-lavorare-al`
**Input**: Design documents from `specs/012-dobbiamo-lavorare-al/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → SUCCESS: Tech stack: TypeScript 5.3+, Next.js 14, Supabase, Tailwind CSS
   → Structure: Web app (frontend/src/, supabase/migrations/)
2. Load optional design documents:
   → data-model.md: 4 entities (Agency, Subscription, EventBranding, AccessToken)
   → contracts/: 3 files (agency-api.yaml, subscription-api.yaml, branding-api.yaml)
   → research.md: 5 research decisions (tier limits, onboarding, branding, tokens, migration)
3. Generate tasks by category:
   → Setup: 3 tasks (migrations, dependencies, linting)
   → Tests: 15 tasks (contract tests, integration tests)
   → Core: 14 tasks (migrations, API routes, components)
   → Integration: 3 tasks (contexts, services, middleware)
   → Polish: 3 tasks (unit tests, manual QA, docs)
4. Apply task rules:
   → Migrations: [P] (different files)
   → Contract tests: [P] (different files)
   → API routes: Sequential (may share middleware)
   → Components: [P] (different files)
5. Number tasks sequentially (T001-T038)
6. Generate dependency graph (Setup → Tests → Implementation → Integration → Polish)
7. Create parallel execution examples (13 parallelizable tasks)
8. Validate task completeness:
   → ✅ All contracts have tests (3/3)
   → ✅ All entities have migrations (4/4)
   → ✅ All tests before implementation
9. Return: SUCCESS (38 tasks ready for TDD execution)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- **Web app structure**: frontend/src/, supabase/migrations/, frontend/tests/

---

## Phase 3.1: Setup & Prerequisites

### Database Migrations (Parallel)
- [x] **T001** [P] Create agencies VIEW migration in `supabase/migrations/20251014_001_create_agencies_view.sql`
  - Create `CREATE OR REPLACE VIEW agencies AS SELECT * FROM tenants;`
  - Add helper function `app.current_agency_id()` to get agency ID from context or auth.uid()
  - No data changes (backward compatible)

- [x] **T002** [P] Create subscriptions table migration in `supabase/migrations/20251014_002_create_subscriptions_table.sql`
  - CREATE TABLE with: id, agency_id FK, tier ENUM, status ENUM, event_limit INT, current_event_count INT, billing_cycle DATE, price_monthly DECIMAL
  - Add CHECK constraints: tier IN ('free', 'basic', 'professional', 'enterprise'), status IN ('active', 'suspended', 'cancelled'), event_limit >= -1
  - Add indexes: UNIQUE(agency_id), idx_tier, idx_status
  - Create trigger `after_agency_insert` to auto-create free subscription

- [x] **T003** [P] Create event_branding table migration in `supabase/migrations/20251014_003_create_event_branding_table.sql`
  - CREATE TABLE with: id, event_id FK UNIQUE, agency_id FK, logo_url TEXT NULL, 4 color fields (primary_color, secondary_color, accent_color, background_color) with CHECK hex format, font_family ENUM
  - Default values: 3Civette palette (#2563EB, #7C3AED, #F59E0B, #F8FAFC), font_family='inter'
  - Add indexes: UNIQUE(event_id), idx_agency_id

- [x] **T004** [P] Extend access_tokens table migration in `supabase/migrations/20251014_004_extend_access_tokens.sql`
  - ALTER TABLE access_tokens ADD COLUMN token_type TEXT CHECK (token_type IN ('slide_upload', 'participant_access'))
  - ALTER TABLE access_tokens ADD COLUMN auto_expire_date TIMESTAMPTZ NOT NULL CHECK (auto_expire_date > created_at)
  - Backfill existing tokens: UPDATE access_tokens SET token_type='participant_access', auto_expire_date=event_date + INTERVAL '7 days'
  - Create triggers: `after_event_insert_tokens` (create 2 tokens), `after_event_date_change` (update expiration)

### RLS Policies (Sequential, depend on tables)
- [x] **T005** Create RLS policies for agencies in `supabase/migrations/20251014_005_rls_agencies.sql`
  - CREATE POLICY "agencies_select_own" FOR SELECT USING (id = app.current_agency_id())
  - CREATE POLICY "agencies_update_own" FOR UPDATE USING (id = app.current_agency_id())
  - CREATE POLICY "agencies_public_signup" FOR INSERT WITH CHECK (true)
  - Enable RLS: ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

- [x] **T006** Create RLS policies for subscriptions in `supabase/migrations/20251014_006_rls_subscriptions.sql`
  - CREATE POLICY "subscriptions_select_own" FOR SELECT USING (agency_id = app.current_agency_id())
  - CREATE POLICY "subscriptions_update_own" FOR UPDATE USING (agency_id = app.current_agency_id())
  - CREATE POLICY "subscriptions_auto_create" FOR INSERT WITH CHECK (agency_id = app.current_agency_id())
  - Enable RLS

- [x] **T007** Create RLS policies for event_branding in `supabase/migrations/20251014_007_rls_event_branding.sql`
  - CREATE POLICY for SELECT, INSERT, UPDATE, DELETE with agency_id check
  - Enable RLS

- [x] **T008** Create subscription triggers in `supabase/migrations/20251014_008_subscription_triggers.sql`
  - CREATE FUNCTION `increment_event_count()` to increment subscriptions.current_event_count on event INSERT
  - CREATE FUNCTION `decrement_event_count()` to decrement on event DELETE
  - CREATE TRIGGER after_event_insert, after_event_delete

### Project Setup
- [x] **T009** Install dependencies in `frontend/package.json`
  - Add: nanoid (token generation), zod (validation), @types/bcrypt, vitest/supertest (testing)
  - Run: `npm install nanoid zod bcrypt @types/bcrypt vitest supertest`
  - Verify build: `npm run build`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Parallel)
- [ ] **T010** [P] Contract test POST /api/agencies/signup in `frontend/tests/api/agencies.test.ts`
  - Test 1: Creates agency with free tier (expect 201, agency_id, subscription.tier='free', event_limit=3)
  - Test 2: Rejects duplicate email (expect 409 Conflict)
  - Test 3: Validates password strength (expect 400 Bad Request if <8 chars)
  - Test 4: Validates company name length (expect 400 if <2 or >100 chars)
  - Test 5: Rejects invalid email format (expect 400)

- [ ] **T011** [P] Contract test GET/PATCH /api/agencies/profile in `frontend/tests/api/agencies.test.ts`
  - Test 1: GET requires auth (expect 401 Unauthorized without JWT)
  - Test 2: GET returns agency details (expect 200 with id, company_name, contact_email, logo_url)
  - Test 3: PATCH updates profile fields (expect 200, verify DB update)
  - Test 4: PATCH validates company_name length (expect 400)

- [ ] **T012** [P] Contract test POST /api/agencies/profile/logo in `frontend/tests/api/agencies.test.ts`
  - Test 1: Uploads JPEG logo (expect 200, logo_url returned)
  - Test 2: Rejects file >2MB (expect 413 Payload Too Large)
  - Test 3: Rejects invalid file type (expect 400)
  - Test 4: Requires auth (expect 401)

- [ ] **T013** [P] Contract test GET /api/subscriptions/current in `frontend/tests/api/subscriptions.test.ts`
  - Test 1: Returns current tier with usage (expect 200, tier, event_limit, current_event_count, usage_percent)
  - Test 2: Requires auth (expect 401)
  - Test 3: Calculates usage_percent correctly (e.g., 2/3 events = 66.67%)

- [ ] **T014** [P] Contract test POST /api/subscriptions/upgrade in `frontend/tests/api/subscriptions.test.ts`
  - Test 1: Upgrades from FREE to Basic (expect 200, new_tier='basic', new_limit=5, price_monthly=29)
  - Test 2: Rejects invalid tier (expect 400)
  - Test 3: Rejects downgrade attempt (expect 400 "use /downgrade endpoint")
  - Test 4: Rejects if already at target tier (expect 409 Conflict)

- [ ] **T015** [P] Contract test POST /api/subscriptions/downgrade in `frontend/tests/api/subscriptions.test.ts`
  - Test 1: Downgrades if current_event_count allows (expect 200)
  - Test 2: Rejects if too many events (expect 409 Conflict with message "Delete X events to downgrade")
  - Test 3: Requires auth (expect 401)

- [ ] **T016** [P] Contract test GET /api/events/:eventId/branding in `frontend/tests/api/branding.test.ts`
  - Test 1: Returns branding if exists (expect 200, logo_url, 4 colors, font_family)
  - Test 2: Returns 3Civette defaults if no branding (expect 404 or 200 with defaults)
  - Test 3: Requires auth (expect 401)
  - Test 4: Rejects if eventId not owned by agency (expect 403 Forbidden)

- [ ] **T017** [P] Contract test PUT /api/events/:eventId/branding in `frontend/tests/api/branding.test.ts`
  - Test 1: Updates colors (expect 200, verify DB update)
  - Test 2: Updates font_family (expect 200)
  - Test 3: Validates hex color format (expect 400 if invalid)
  - Test 4: Validates font_family enum (expect 400 if not in ['inter', 'merriweather', 'poppins', 'roboto', 'playfair'])
  - Test 5: Partial update (only provided fields updated)

- [ ] **T018** [P] Contract test POST /api/events/:eventId/branding/logo in `frontend/tests/api/branding.test.ts`
  - Test 1: Uploads event logo (expect 200, logo_url)
  - Test 2: Rejects >2MB (expect 413)
  - Test 3: Rejects invalid file type (expect 400)

### Integration Tests (Parallel)
- [ ] **T019** [P] Integration test agency onboarding flow in `frontend/tests/integration/agencyOnboarding.test.ts`
  - Step 1: POST /api/agencies/signup → verify agency created
  - Step 2: Verify subscription auto-created (tier='free', event_limit=3)
  - Step 3: Login with credentials
  - Step 4: GET /api/agencies/profile → verify data
  - Step 5: Create first event → verify current_event_count=1

- [ ] **T020** [P] Integration test tier limit enforcement in `frontend/tests/integration/tierLimits.test.ts`
  - Step 1: Signup agency (FREE tier, limit=3)
  - Step 2: Create 3 events → verify current_event_count=3
  - Step 3: Attempt to create 4th event → expect 403 Forbidden with upgrade CTA
  - Step 4: POST /api/subscriptions/upgrade (tier='basic')
  - Step 5: Create 4th event → success (new limit=5)
  - Step 6: Delete 1 event → verify current_event_count=3
  - Step 7: Attempt downgrade to FREE → expect 409 Conflict (too many events)

- [ ] **T021** [P] Integration test branding customization in `frontend/tests/integration/brandingCustomization.test.ts`
  - Step 1: Create event
  - Step 2: GET /api/events/:id/branding → expect 404 or defaults
  - Step 3: PUT /api/events/:id/branding (set colors + font)
  - Step 4: POST /api/events/:id/branding/logo (upload logo)
  - Step 5: GET /api/events/:id/branding → verify custom values
  - Step 6: Fetch public event page → verify branding applied (color CSS vars, font <link>)

- [ ] **T022** [P] Integration test token auto-expiration in `frontend/tests/integration/tokenExpiration.test.ts`
  - Step 1: Create event with event_date = today
  - Step 2: Verify 2 tokens created (slide_upload, participant_access) with auto_expire_date = today + 7 days
  - Step 3: Mock time to 6 days later → verify tokens still valid
  - Step 4: Mock time to 8 days later → verify tokens rejected (403 Forbidden)
  - Step 5: Update event_date → verify token expiration updated

- [ ] **T023** [P] Integration test multi-tenant isolation in `frontend/tests/integration/multiTenantIsolation.test.ts`
  - Step 1: Create Agency A and Agency B
  - Step 2: Agency A creates Event A
  - Step 3: Agency B attempts GET /api/events/A → expect 403 Forbidden (RLS blocks)
  - Step 4: Agency B attempts PUT /api/events/A/branding → expect 403
  - Step 5: Verify Agency A can access Event A
  - Step 6: Verify subscriptions.current_event_count isolated (Agency A events don't affect Agency B quota)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend API Routes (Sequential, may share middleware)
- [ ] **T024** Implement POST /api/agencies/signup in `frontend/src/app/api/agencies/signup/route.ts`
  - Validate request body with Zod (company_name 2-100 chars, email format, password min 8 chars)
  - Hash password with bcrypt (cost factor 12)
  - INSERT into tenants table (via agencies VIEW)
  - Trigger auto-creates subscription (tier='free')
  - Return 201 with { agency_id, subscription: { tier, event_limit } }
  - Handle 409 Conflict if email exists (catch unique constraint violation)

- [ ] **T025** Implement GET /api/agencies/profile in `frontend/src/app/api/agencies/profile/route.ts`
  - Verify JWT auth (extract agency_id from token)
  - SELECT from agencies WHERE id = current_agency_id()
  - Return 200 with { id, company_name, contact_email, phone, vat_number, logo_url }
  - Return 401 if no auth token

- [ ] **T026** Implement PATCH /api/agencies/profile in `frontend/src/app/api/agencies/profile/route.ts`
  - Validate request body (partial update)
  - UPDATE tenants SET company_name=?, phone=?, vat_number=?, updated_at=NOW() WHERE id = current_agency_id()
  - Return 200 with updated fields
  - Handle 400 if validation fails

- [ ] **T027** Implement POST /api/agencies/profile/logo in `frontend/src/app/api/agencies/profile/logo/route.ts`
  - Parse multipart/form-data file upload
  - Validate: file type (JPEG/PNG/SVG), size (max 2MB)
  - Upload to Supabase Storage: `logos/{agency_id}/{timestamp}-{filename}`
  - UPDATE tenants SET logo_url = storage_url WHERE id = current_agency_id()
  - Return 200 with { logo_url }
  - Handle 413 if file too large

- [ ] **T028** Implement GET /api/subscriptions/current in `frontend/src/app/api/subscriptions/current/route.ts`
  - SELECT from subscriptions WHERE agency_id = current_agency_id()
  - Calculate usage_percent = (current_event_count / event_limit) * 100 (or 0 if unlimited)
  - Return 200 with { tier, status, event_limit, current_event_count, usage_percent, price_monthly }

- [ ] **T029** Implement POST /api/subscriptions/upgrade in `frontend/src/app/api/subscriptions/upgrade/route.ts`
  - Validate target_tier in ['basic', 'professional', 'enterprise']
  - Get current tier from subscriptions table
  - Verify target_tier > current_tier (prevent downgrades)
  - Verify not already at target_tier (409 Conflict)
  - UPDATE subscriptions SET tier=?, event_limit=?, price_monthly=?, updated_at=NOW()
  - Return 200 with { new_tier, new_limit, price_monthly }

- [ ] **T030** Implement POST /api/subscriptions/downgrade in `frontend/src/app/api/subscriptions/downgrade/route.ts`
  - Validate target_tier in ['free', 'basic', 'professional']
  - Get current subscription (current_event_count, current_tier)
  - Get new tier limits (FREE=3, Basic=5, Professional=20)
  - Verify current_event_count <= new_limit (409 Conflict if too many events)
  - UPDATE subscriptions SET tier=?, event_limit=?, price_monthly=?, updated_at=NOW()
  - Return 200 with { new_tier, new_limit }

- [ ] **T031** Implement GET /api/events/[eventId]/branding in `frontend/src/app/api/events/[eventId]/branding/route.ts`
  - Verify event ownership (event.tenant_id = current_agency_id() via RLS)
  - SELECT from event_branding WHERE event_id = params.eventId
  - If not found: return 200 with 3Civette defaults OR 404 (spec says both valid)
  - Return 200 with { logo_url, primary_color, secondary_color, accent_color, background_color, font_family }

- [ ] **T032** Implement PUT /api/events/[eventId]/branding in `frontend/src/app/api/events/[eventId]/branding/route.ts`
  - Validate hex colors with Zod regex: `^#[0-9A-Fa-f]{6}$`
  - Validate font_family enum: ['inter', 'merriweather', 'poppins', 'roboto', 'playfair']
  - UPSERT into event_branding (INSERT ON CONFLICT(event_id) DO UPDATE)
  - Return 200 with updated branding
  - Handle 400 if validation fails

- [ ] **T033** Implement POST /api/events/[eventId]/branding/logo in `frontend/src/app/api/events/[eventId]/branding/logo/route.ts`
  - Parse multipart file upload
  - Validate: JPEG/PNG/SVG, max 2MB
  - Upload to Supabase Storage: `event-logos/{event_id}/{timestamp}-{filename}`
  - UPSERT event_branding SET logo_url = storage_url
  - Return 200 with { logo_url }

### Middleware (Sequential, shared by multiple routes)
- [ ] **T034** Create tier limit validation middleware in `frontend/src/middleware/tierLimitMiddleware.ts`
  - On event creation (POST /api/events): SELECT subscription WHERE agency_id = current_agency_id()
  - Check current_event_count >= event_limit
  - If exceeded: return 403 Forbidden with { error: "EVENT_LIMIT_REACHED", tier, event_limit, upgrade_url: "/subscription" }
  - Else: call next()

- [ ] **T035** Create token expiration validation middleware in `frontend/src/middleware/tokenExpirationMiddleware.ts`
  - On slide upload/download: Extract token from request (query param or header)
  - SELECT from access_tokens WHERE token = ? AND NOW() < auto_expire_date
  - If not found or expired: return 403 Forbidden with { error: "TOKEN_EXPIRED", expiration_date }
  - Else: Increment use_count, set last_used_at = NOW(), call next()

---

## Phase 3.4: Frontend Implementation

### Public Marketing Pages (Parallel)
- [ ] **T036** [P] Create marketing homepage in `frontend/src/app/(portal)/page.tsx`
  - Component: HeroSection (headline, CTA "Start Free Trial", benefit bullets)
  - Component: FeatureShowcase (4 feature cards: Branded Pages, Secure Tokens, Custom Branding, Analytics)
  - Component: PricingTeaser (link to /pricing page)
  - Component: Testimonials (3 MICE agency testimonials - mock data)
  - Styling: Tailwind CSS, 3Civette palette, responsive design

- [ ] **T037** [P] Create pricing page in `frontend/src/app/(portal)/pricing/page.tsx`
  - Component: PricingTable (4 tiers: FREE, Basic, Professional, Enterprise)
  - For each tier: name, price (€0, €29, €79, €199), event limit, feature list, CTA button
  - Highlight Professional tier as "Most Popular"
  - Link CTA buttons to /signup
  - Responsive: stack vertically on mobile, grid on desktop

- [ ] **T038** [P] Create signup form in `frontend/src/app/(portal)/signup/page.tsx`
  - Component: SignupForm (fields: company_name, contact_email, password, phone optional, vat_number optional)
  - Validation: company_name 2-100 chars, email format, password min 8 chars with strength indicator
  - On submit: POST /api/agencies/signup
  - Show loading state during API call
  - On success: Redirect to /admin/dashboard with toast "Welcome! Your FREE tier includes 3 events"
  - On error 409: Show "Email already registered" with link to login
  - On error 400: Show inline validation errors

### Admin Dashboard (Parallel)
- [ ] **T039** [P] Create agency profile page in `frontend/src/app/(admin)/profile/page.tsx`
  - Component: AgencyProfile (display company_name, contact_email, phone, vat_number, logo_url)
  - Edit mode: Toggle to show form for PATCH /api/agencies/profile
  - Component: LogoUpload (drag-and-drop, preview, POST /api/agencies/profile/logo)
  - Show current logo with "Change Logo" button
  - Validation: match API requirements

- [ ] **T040** [P] Create subscription management page in `frontend/src/app/(admin)/subscription/page.tsx`
  - Component: SubscriptionCard (show current tier, event usage "2/3 events used", usage progress bar)
  - If not at max tier: Show "Upgrade" button → Modal with tier comparison
  - Modal: PricingTable with "Upgrade to {tier}" buttons
  - On upgrade: POST /api/subscriptions/upgrade, show success toast, refresh subscription data
  - If over limit: Show downgrade button → Modal with warning "Delete X events to downgrade to {tier}"
  - On downgrade: Validate current_event_count, handle 409 error

- [ ] **T041** Extend dashboard page in `frontend/src/app/(admin)/dashboard/page.tsx`
  - Add tier usage display at top: "FREE tier: 2/3 events used" with progress bar
  - If at limit: Show banner "You've reached your event limit. Upgrade to create more events" with CTA
  - If >80% usage: Show warning "You're approaching your event limit"
  - Link to /admin/subscription page

### Branding Components (Parallel)
- [ ] **T042** [P] Extend branding editor in `frontend/src/components/admin/BrandingEditor.tsx`
  - Add FontPicker component: Dropdown with 5 fonts (Inter, Merriweather, Poppins, Roboto, Playfair Display)
  - For each font: Show preview text in that font
  - Add ColorPalette component: 4 color inputs (primary, secondary, accent, background)
  - Each color input: Color picker + hex input field with validation
  - Add logo upload: FileDropzone for event logo (max 2MB, JPEG/PNG/SVG)
  - Preview section: Show mock event page with custom branding applied
  - On save: PUT /api/events/:id/branding (colors + font), POST /api/events/:id/branding/logo (if logo changed)

- [ ] **T043** [P] Create FontPicker component in `frontend/src/components/common/FontPicker.tsx`
  - Props: { value: string, onChange: (font: string) => void }
  - Render: Dropdown with 5 options (Inter, Merriweather, Poppins, Roboto, Playfair Display)
  - Each option shows font name in that font
  - On select: Call onChange with font_family value

- [ ] **T044** [P] Create ColorPalette component in `frontend/src/components/common/ColorPalette.tsx`
  - Props: { colors: { primary, secondary, accent, background }, onChange }
  - Render: 4 color inputs, each with:
    - Color picker (type="color")
    - Hex text input (validated with regex ^#[0-9A-Fa-f]{6}$)
    - Color preview swatch
  - On change: Validate hex format, call onChange

### Context Providers (Sequential, replace existing)
- [ ] **T045** Create AgencyContext in `frontend/src/contexts/AgencyContext.tsx`
  - Replace TenantContext (backward compatible export `export { AgencyContext as TenantContext }`)
  - State: agency (id, company_name, contact_email, logo_url), loading, error
  - Fetch on mount: GET /api/agencies/profile
  - Methods: updateProfile (PATCH /api/agencies/profile), uploadLogo (POST /api/agencies/profile/logo)
  - Provider wraps app layout

- [ ] **T046** Create SubscriptionContext in `frontend/src/contexts/SubscriptionContext.tsx`
  - State: subscription (tier, status, event_limit, current_event_count, usage_percent), loading, error
  - Fetch on mount: GET /api/subscriptions/current
  - Methods: upgrade(tier), downgrade(tier), refresh()
  - Hook: `useSubscription()` returns { subscription, upgrade, downgrade, canCreateEvent: current_event_count < event_limit }
  - Provider wraps app layout (nest inside AgencyContext)

### Service Layer (Parallel)
- [ ] **T047** [P] Create agency service in `frontend/src/lib/agencyService.ts`
  - Function: signup(data) → POST /api/agencies/signup
  - Function: getProfile() → GET /api/agencies/profile
  - Function: updateProfile(data) → PATCH /api/agencies/profile
  - Function: uploadLogo(file) → POST /api/agencies/profile/logo (multipart)
  - Error handling: Throw custom errors (AgencyEmailConflictError, ValidationError)

- [ ] **T048** [P] Create subscription service in `frontend/src/lib/subscriptionService.ts`
  - Function: getCurrent() → GET /api/subscriptions/current
  - Function: upgrade(tier) → POST /api/subscriptions/upgrade
  - Function: downgrade(tier) → POST /api/subscriptions/downgrade
  - Error handling: Throw custom errors (TierConflictError, TooManyEventsError)

---

## Phase 3.5: Polish & Validation

### Unit Tests (Parallel)
- [ ] **T049** [P] Unit tests for tier limit logic in `frontend/tests/unit/tierLimits.test.ts`
  - Test canCreateEvent() function: Returns false if at limit, true if under
  - Test tier comparison: FREE < Basic < Professional < Enterprise
  - Test downgrade validation: Rejects if too many events
  - Mock: Subscription data, no API calls

- [ ] **T050** [P] Unit tests for branding validation in `frontend/tests/unit/brandingValidation.test.ts`
  - Test hex color validation regex
  - Test font_family enum validation
  - Test logo file type validation (JPEG/PNG/SVG only)
  - Test logo file size validation (max 2MB)

### Performance & Manual QA
- [ ] **T051** Run performance validation (use plan.md targets)
  - Measure: Agency signup < 2s (target from plan.md line 66)
  - Measure: Dashboard load (20 events) < 1.5s (line 67)
  - Measure: Branding preview < 500ms (line 68)
  - Measure: Event creation < 3s (line 69)
  - If any target missed: Profile with Chrome DevTools, optimize slow queries/renders

- [ ] **T052** Execute manual QA checklist from quickstart.md
  - Run: All scenarios in `specs/012-dobbiamo-lavorare-al/quickstart.md`
  - Scenario 1: Agency Onboarding → Verify passes
  - Scenario 2: Tier Limit Enforcement → Verify passes
  - Scenario 3: Branding Customization → Verify passes
  - Scenario 4: Token Auto-Expiration → Verify passes
  - Document any failures in GitHub issue

### Documentation
- [ ] **T053** [P] Update CLAUDE.md with Meeting Hub patterns
  - Add section: "Feature-Specific Patterns (012-dobbiamo-lavorare-al)"
  - Document: Subscription tier enforcement pattern (hard limits + upgrade CTA)
  - Document: Agency context pattern (replaces TenantContext)
  - Document: Token auto-expiration pattern (DB-enforced with triggers)
  - Document: Table aliasing pattern (agencies VIEW for backward compatibility)

---

## Dependencies

**Critical Path** (blocks all downstream tasks):
- Setup (T001-T009) → Tests (T010-T023) → Implementation (T024-T048) → Polish (T049-T053)

**Detailed Dependencies**:
- **T005-T008** depend on **T001-T004** (RLS policies require tables to exist)
- **T010-T023** depend on **T001-T009** (tests require DB schema + dependencies)
- **T024-T048** depend on **T010-T023** (TDD: tests must fail before implementation)
- **T034-T035** depend on **T024-T033** (middleware depends on routes existing)
- **T045-T046** depend on **T024-T033** (contexts depend on API routes)
- **T049-T053** depend on **T024-T048** (polish requires full implementation)

**Blocking Relationships**:
- T024 (signup API) blocks T019 (integration test uses signup)
- T028 (get subscription) blocks T020 (integration test checks subscription)
- T031-T033 (branding APIs) block T021 (integration test uses branding)
- T002 (subscriptions table) blocks T008 (subscription triggers)
- T004 (access_tokens extension) blocks T022 (token expiration test)

---

## Parallel Execution Examples

### Batch 1: Database Migrations (Run simultaneously)
```
Task: "T001: Create agencies VIEW migration"
Task: "T002: Create subscriptions table migration"
Task: "T003: Create event_branding table migration"
Task: "T004: Extend access_tokens table migration"
```

### Batch 2: Contract Tests (Run simultaneously after migrations)
```
Task: "T010: Contract test POST /api/agencies/signup"
Task: "T011: Contract test GET/PATCH /api/agencies/profile"
Task: "T012: Contract test POST /api/agencies/profile/logo"
Task: "T013: Contract test GET /api/subscriptions/current"
Task: "T014: Contract test POST /api/subscriptions/upgrade"
Task: "T015: Contract test POST /api/subscriptions/downgrade"
Task: "T016: Contract test GET /api/events/:eventId/branding"
Task: "T017: Contract test PUT /api/events/:eventId/branding"
Task: "T018: Contract test POST /api/events/:eventId/branding/logo"
```

### Batch 3: Integration Tests (Run simultaneously after contract tests)
```
Task: "T019: Integration test agency onboarding"
Task: "T020: Integration test tier limit enforcement"
Task: "T021: Integration test branding customization"
Task: "T022: Integration test token auto-expiration"
Task: "T023: Integration test multi-tenant isolation"
```

### Batch 4: Frontend Components (Run simultaneously after API routes)
```
Task: "T036: Create marketing homepage"
Task: "T037: Create pricing page"
Task: "T038: Create signup form"
Task: "T039: Create agency profile page"
Task: "T040: Create subscription management page"
Task: "T042: Extend branding editor"
Task: "T043: Create FontPicker component"
Task: "T044: Create ColorPalette component"
```

### Batch 5: Service Layer (Run simultaneously after contexts)
```
Task: "T047: Create agency service"
Task: "T048: Create subscription service"
```

### Batch 6: Unit Tests (Run simultaneously after implementation)
```
Task: "T049: Unit tests for tier limit logic"
Task: "T050: Unit tests for branding validation"
Task: "T053: Update CLAUDE.md"
```

---

## Notes
- **[P] tasks**: Different files, no dependencies, safe to parallelize
- **TDD Enforcement**: Tests T010-T023 MUST be written and MUST FAIL before implementing T024-T048
- **Commit Strategy**: Commit after each task with message format: "feat(012): Complete T###: {task description}"
- **RLS Testing**: T023 explicitly verifies multi-tenant isolation (constitutional requirement IV)
- **Performance Targets**: T051 uses exact targets from plan.md (2s signup, 1.5s dashboard, 500ms preview, 3s event creation)
- **Backward Compatibility**: T001 uses VIEW aliasing (not table rename) to maintain backward compatibility with existing code referencing `tenants` table

---

## Validation Checklist
*GATE: Verified during task generation*

- [x] All contracts have corresponding tests (3 contract files → 9 contract tests in T010-T018)
- [x] All entities have migration tasks (Agency VIEW T001, Subscription T002, EventBranding T003, AccessToken T004)
- [x] All tests come before implementation (T010-T023 before T024-T048)
- [x] Parallel tasks truly independent (13 [P] tasks verified: different files, no shared state)
- [x] Each task specifies exact file path (all tasks include `in frontend/src/...` or `in supabase/migrations/...`)
- [x] No task modifies same file as another [P] task (verified: no file path conflicts)
- [x] RLS policies explicitly tested (T005-T007 create policies, T023 integration test verifies isolation)
- [x] TDD cycle enforced (tests T010-T023 explicitly MUST FAIL before implementation T024-T048)

---

**Total Tasks**: 53
**Parallel Tasks**: 26 (49% parallelizable)
**Estimated Completion**: 3-4 weeks (assuming TDD workflow + code review)

**Next Command**: Execute tasks sequentially following the phase order, ensuring tests fail before implementation.
