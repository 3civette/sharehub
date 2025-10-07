# Tasks: Admin Panel Secondary Screens

**Input**: Design documents from `/specs/002-facciamo-tutti-gli/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)
**Branch**: `002-facciamo-tutti-gli`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✓ Found: TypeScript 5.3+, Next.js 14, Express.js, Supabase
   → ✓ Structure: Web app (frontend + backend)
2. Load optional design documents:
   → ✓ data-model.md: 2 entities extended, 5 columns, TypeScript interfaces
   → ✓ contracts/: 3 files (events, branding, settings) → 8 endpoints
   → ✓ research.md: 5 decisions (react-colorful, File API, CSS vars, RLS, URL params)
   → ✓ quickstart.md: 5 integration test scenarios
3. Generate tasks by category:
   → Setup: Dependencies (react-colorful), DB migration
   → Tests: 8 contract tests + 5 integration tests
   → Core: 3 services, 3 route files, 7 components, 5 pages
   → Integration: Middleware, context extension
   → Polish: Performance validation, documentation
4. Apply task rules:
   → Contract tests [P], components [P], integration tests [P]
   → Services sequential, routes sequential (shared middleware)
5. Number tasks sequentially (T001-T038)
6. TDD enforced: Tests before implementation
7. Result: 38 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths are absolute from repository root

## Path Conventions
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: Apply via Supabase Dashboard SQL Editor

---

## Phase 3.1: Setup & Dependencies

### [X] T001: Install frontend dependencies
**File**: `frontend/package.json`
**Description**: Install react-colorful for color picker component
```bash
cd frontend
npm install react-colorful
```
**Verification**: `react-colorful` appears in package.json dependencies

---

### [X] T002: Create database migration for admin screens
**File**: `backend/migrations/002_admin_screens.sql`
**Description**: Create migration script to extend events and tenants tables per data-model.md:
- Add `events.branding_overrides` JSONB column
- Add `tenants.branding` JSONB column with default colors
- Add `tenants.hotel_name`, `contact_email`, `contact_phone` columns
- Create indexes: `idx_events_date_sort`, `idx_events_created_sort`
- Create RLS policies: `admin_can_edit_future_events`, `admin_can_update_tenant_branding`

**Verification**: Migration file matches schema in data-model.md lines 17-114

---

### [X] T003: Apply database migration via Supabase Dashboard
**File**: N/A (manual SQL execution)
**Description**: Copy migration SQL from `backend/migrations/002_admin_screens.sql` and execute in Supabase SQL Editor
**Verification**:
- Run `SELECT * FROM pg_tables WHERE tablename IN ('events', 'tenants')` → verify new columns exist
- Run `SELECT * FROM pg_policies WHERE tablename IN ('events', 'tenants')` → verify new RLS policies

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### [X] T004 [P]: Contract test POST /events (create event)
**File**: `backend/tests/contract/events-create.test.ts`
**Description**: Write contract test per contracts/events-api.yaml POST /events endpoint:
- Test valid event creation (public and private)
- Test validation errors (past date, missing fields)
- Test token generation for private events
- Test tenant isolation (admin can't create for other tenant)
- Use vitest + supertest framework
**Expected**: Tests FAIL (endpoints not implemented yet)

---

### [X] T005 [P]: Contract test PUT /events/:id (update event)
**File**: `backend/tests/contract/events-update.test.ts`
**Description**: Write contract test per contracts/events-api.yaml PUT /events/:id endpoint:
- Test update future event (succeeds)
- Test update past event (fails with 400)
- Test validation on updated fields
- Test token preservation (not changed)
- Test tenant isolation
**Expected**: Tests FAIL (endpoint not implemented yet)

---

### [X] T006 [P]: Contract test GET /events (list with sort/filter)
**File**: `backend/tests/contract/events-list.test.ts`
**Description**: Write contract test per contracts/events-api.yaml GET /events endpoint:
- Test default sort (date-asc, soonest first)
- Test sort options (date-asc, date-desc, created-desc)
- Test filters (all, active, past)
- Test combined sort + filter
- Test tenant isolation (only own events)
**Expected**: Tests FAIL (sort/filter not implemented yet)

---

### [X] T007 [P]: Contract test GET /branding/:tenantId
**File**: `backend/tests/contract/branding-get.test.ts`
**Description**: Write contract test per contracts/branding-api.yaml GET /branding/:tenantId:
- Test get existing branding (returns colors + logo_url)
- Test get default branding (new tenant)
- Test tenant isolation (can't get other tenant's branding)
- Test unauthorized access (403)
**Expected**: Tests FAIL (endpoint not implemented yet)

---

### [X] T008 [P]: Contract test PUT /branding/:tenantId
**File**: `backend/tests/contract/branding-update.test.ts`
**Description**: Write contract test per contracts/branding-api.yaml PUT /branding/:tenantId:
- Test update colors (valid hex format)
- Test validation (invalid hex format)
- Test tenant isolation
- Test partial updates (only primary_color)
**Expected**: Tests FAIL (endpoint not implemented yet)

---

### [X] T009 [P]: Contract test POST /branding/:tenantId/logo
**File**: `backend/tests/contract/branding-logo-upload.test.ts`
**Description**: Write contract test per contracts/branding-api.yaml POST /branding/:tenantId/logo:
- Test upload valid PNG (< 2MB)
- Test upload valid JPG (< 2MB)
- Test upload valid SVG (< 2MB)
- Test rejection: file too large (> 2MB)
- Test rejection: invalid file type (PDF, TXT)
- Test tenant isolation
- Use supertest with multipart/form-data
**Expected**: Tests FAIL (endpoint not implemented yet)

---

### [X] T010 [P]: Contract test GET /settings/:tenantId
**File**: `backend/tests/contract/settings-get.test.ts`
**Description**: Write contract test per contracts/settings-api.yaml GET /settings/:tenantId:
- Test get settings (hotel_name, contact_email, contact_phone, billing_info)
- Test billing_info structure (plan_name, renewal_date, payment_method)
- Test tenant isolation
**Expected**: Tests FAIL (endpoint not implemented yet)

---

### [X] T011 [P]: Contract test PUT /settings/:tenantId
**File**: `backend/tests/contract/settings-update.test.ts`
**Description**: Write contract test per contracts/settings-api.yaml PUT /settings/:tenantId:
- Test update hotel_name (valid)
- Test update contact_email (valid format)
- Test update contact_phone (flexible international)
- Test validation: hotel_name too short (< 2 chars)
- Test validation: invalid email format
- Test tenant isolation
- Test billing_info NOT updatable (ignored or rejected)
**Expected**: Tests FAIL (endpoint not implemented yet)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend Services

#### [X] T012: Create TypeScript interfaces for Event, Branding, Settings
**File**: `backend/src/models/index.ts` (extend existing or create new)
**Description**: Define TypeScript interfaces per data-model.md:
- Extend `Event` interface with `branding_overrides?: { primary_color?, secondary_color?, logo_url? }`
- Create `Branding` interface: `{ primary_color: string, secondary_color: string, logo_url: string | null }`
- Create `TenantSettings` interface: `{ id, hotel_name, contact_email, contact_phone, billing_info }`
- Create `EventCreateInput`, `EventUpdateInput`, `BrandingUpdateInput`, `TenantSettingsUpdateInput`
**Verification**: Interfaces match data-model.md lines 176-266

---

#### [X] T013: Create brandingService.ts
**File**: `backend/src/services/brandingService.ts`
**Description**: Implement branding service with methods:
- `getBranding(tenantId: string): Promise<Branding>` - Fetch from tenants.branding JSONB
- `updateColors(tenantId: string, colors: BrandingUpdateInput): Promise<Branding>` - Update primary/secondary colors
- `uploadLogo(tenantId: string, file: Express.Multer.File): Promise<string>` - Upload to Supabase Storage, return logo_url
- `deleteLogo(tenantId: string): Promise<void>` - Remove from Storage, set logo_url = null
- `resetBranding(tenantId: string): Promise<Branding>` - Reset to defaults, delete logo
- Use Supabase client for DB operations
- Use Supabase Storage API for file operations
- Path pattern: `logos/{tenantId}/{timestamp}-{filename}`
**Verification**: Contract tests T007-T009 pass

---

#### [X] T014: Create settingsService.ts
**File**: `backend/src/services/settingsService.ts`
**Description**: Implement settings service with methods:
- `getSettings(tenantId: string): Promise<TenantSettings>` - Fetch hotel_name, contact fields, join/call billing API
- `updateSettings(tenantId: string, input: TenantSettingsUpdateInput): Promise<TenantSettings>` - Update hotel_name, contact fields only
- Validate: hotel_name (2-100 chars), email format, phone format
- Billing info: Mock or call external API (read-only data)
**Verification**: Contract tests T010-T011 pass

---

#### [X] T015: Extend eventService.ts with update method
**File**: `backend/src/services/eventService.ts` (extend existing)
**Description**: Add event update functionality:
- `updateEvent(eventId: string, userId: string, input: EventUpdateInput): Promise<Event>` - Update event fields
- Validation: event_date >= today, user owns event, event is not past
- Preserve: created_at, created_by, tokens (don't allow token updates)
- Return error if event date < today
**Verification**: Contract tests T005 pass

---

### Backend Routes

#### [X] T016: Create branding.ts routes with Multer
**File**: `backend/src/routes/branding.ts`
**Description**: Implement branding routes per contracts/branding-api.yaml:
- `GET /branding/:tenantId` - Call brandingService.getBranding()
- `PUT /branding/:tenantId` - Call brandingService.updateColors(), validate hex colors
- `POST /branding/:tenantId/logo` - Setup Multer middleware (fileFilter: PNG/JPG/SVG, limits: 2MB), call brandingService.uploadLogo()
- `DELETE /branding/:tenantId/logo` - Call brandingService.deleteLogo()
- `POST /branding/:tenantId/reset` - Call brandingService.resetBranding()
- All routes: Require admin auth middleware (T019)
- Export router
**Verification**: Contract tests T007-T009 pass

---

#### [X] T017: Create settings.ts routes
**File**: `backend/src/routes/settings.ts`
**Description**: Implement settings routes per contracts/settings-api.yaml:
- `GET /settings/:tenantId` - Call settingsService.getSettings()
- `PUT /settings/:tenantId` - Call settingsService.updateSettings(), validate input
- All routes: Require admin auth middleware (T019)
- Export router
**Verification**: Contract tests T010-T011 pass

---

#### [X] T018: Extend events.ts routes with update + list sort/filter
**File**: `backend/src/routes/events.ts` (extend existing)
**Description**: Add/modify event routes per contracts/events-api.yaml:
- `PUT /events/:id` - Call eventService.updateEvent(), handle validation errors
- `GET /events` - Extend existing endpoint:
  - Parse query params: `sort` (date-asc, date-desc, created-desc), `filter` (all, active, past)
  - Apply to Supabase query: `.order()` for sort, `.gte('event_date', today)` for active, `.lt()` for past
  - Default: sort=date-asc, filter=all
- All routes: Require admin auth middleware (T019)
**Verification**: Contract tests T005-T006 pass

---

### Backend Middleware

#### [X] T019: Create adminAuth.ts middleware
**File**: `backend/src/middleware/adminAuth.ts`
**Description**: Create middleware to verify user is admin:
- Extract JWT from Authorization header
- Verify token with Supabase Auth
- Query admins table: Check user.id exists in admins and matches tenant_id
- Attach `req.user` and `req.tenantId` to request object
- Return 401 if not authenticated, 403 if not admin
**Verification**: All contract tests pass with auth middleware applied

---

#### [X] T020: Register new routes in app.ts
**File**: `backend/src/app.ts` (extend existing)
**Description**: Import and register new routes:
```typescript
import brandingRouter from './routes/branding';
import settingsRouter from './routes/settings';

app.use('/branding', brandingRouter);
app.use('/settings', settingsRouter);
```
**Verification**: `npm run dev` starts without errors, routes accessible

---

### Frontend Components

#### [X] T021 [P]: Create ColorPicker.tsx component
**File**: `frontend/src/components/admin/ColorPicker.tsx`
**Description**: Create color picker component using react-colorful (research.md decision 1):
- Props: `value: string` (hex), `onChange: (color: string) => void`, `label: string`
- Use `HexColorPicker` from react-colorful
- Display current hex value as text input (editable)
- Validate hex format on text input change
- Tailwind styling
**Verification**: Component renders with default color, onChange fires on color change

---

#### [X] T022 [P]: Create LogoUpload.tsx with client validation
**File**: `frontend/src/components/admin/LogoUpload.tsx`
**Description**: Create logo upload component with client-side validation (research.md decision 2):
- Props: `currentLogo?: string`, `onUpload: (file: File) => void`, `onRemove: () => void`
- File input for PNG/JPG/SVG
- Client validation: file.size <= 2MB, file.type in [image/png, image/jpeg, image/svg+xml]
- Show error messages for invalid files
- Preview uploaded file using `URL.createObjectURL(file)`
- Display current logo if exists
- Remove button to delete logo
**Verification**: Valid files trigger onUpload, invalid files show error, preview displays

---

#### [X] T023 [P]: Create BrandingPreview.tsx live preview
**File**: `frontend/src/components/admin/BrandingPreview.tsx`
**Description**: Create live preview component for branding changes (research.md decision 3):
- Props: `primaryColor: string`, `secondaryColor: string`, `logoUrl?: string`
- Render sample UI elements with applied branding:
  - Header with logo and primary background
  - Button with secondary color
  - Text with primary color
- Use inline styles or CSS custom properties
- Update preview in real-time as colors change
**Verification**: Preview updates immediately when colors change

---

#### [X] T024 [P]: Create EventForm.tsx shared create/edit form
**File**: `frontend/src/components/admin/EventForm.tsx`
**Description**: Create shared form component for create and edit event:
- Props: `initialData?: Event`, `onSubmit: (data: EventCreateInput | EventUpdateInput) => void`, `mode: 'create' | 'edit'`, `isReadOnly?: boolean`
- Fields: event_name (text), event_date (date picker), description (textarea), visibility (radio: public/private)
- Validation: required fields, date >= today (for create/edit future)
- Disable all fields if isReadOnly=true (for past events)
- Show generated tokens after creation (if private event)
- Tailwind form styling
**Verification**: Form submits valid data, validation errors display, read-only mode disables inputs

---

#### [X] T025 [P]: Create EventList.tsx with sort/filter UI
**File**: `frontend/src/components/admin/EventList.tsx`
**Description**: Create event list component with sort and filter controls (research.md decision 5):
- Props: `events: Event[]`, `onEventClick: (id: string) => void`
- Sort dropdown: Date (Soonest First), Date (Newest First), Recently Created
- Filter dropdown: All Events, Active, Past
- Update URL search params on sort/filter change (useSearchParams, useRouter)
- Parse URL params on mount to initialize sort/filter state
- Display events in table: name, date, visibility, status, actions (view/edit)
- Visual indicator for public/private (icon)
- Visual indicator for editable vs read-only (past events grayed out)
**Verification**: Sort changes order, filter changes visible events, URL updates, state persists on refresh

---

#### [X] T026 [P]: Create SettingsForm.tsx
**File**: `frontend/src/components/admin/SettingsForm.tsx`
**Description**: Create settings form component:
- Props: `initialData: TenantSettings`, `onSubmit: (data: TenantSettingsUpdateInput) => void`
- Editable fields: hotel_name (text), contact_email (email), contact_phone (tel)
- Read-only fields: billing_info (display plan_name, renewal_date, payment_method as text)
- Validation: hotel_name 2-100 chars, email format, phone format
- Tailwind form styling with disabled styling for read-only fields
**Verification**: Form submits valid data, validation errors display, billing fields disabled

---

#### [X] T027 [P]: Extend AdminNav.tsx with new routes
**File**: `frontend/src/components/layout/AdminNav.tsx` (extend existing)
**Description**: Add navigation links for new admin screens:
- Link to `/admin/events` (Events List)
- Link to `/admin/events/new` (Create Event)
- Link to `/admin/branding` (Branding)
- Link to `/admin/settings` (Settings)
- Highlight active link based on current route (usePathname)
**Verification**: All links navigate correctly, active link highlighted

---

### Frontend Pages

#### [X] T028: Create /admin/events/new/page.tsx (create event screen)
**File**: `frontend/src/app/admin/events/new/page.tsx`
**Description**: Create event creation page:
- Fetch tenant ID from auth context
- Render EventForm component (mode='create')
- onSubmit: POST to `/events` API
- Show loading state during submission
- On success: Show generated tokens (if private), redirect to `/admin/events`
- On error: Display error message
- Require admin auth (redirect if not authenticated)
**Verification**: Page loads, form submits, creates event, redirects, shows tokens for private events

---

#### [X] T029: Create /admin/events/[id]/edit/page.tsx (edit event screen)
**File**: `frontend/src/app/admin/events/[id]/edit/page.tsx`
**Description**: Create event edit page:
- Fetch event by ID from `/events/:id` API
- Compute isReadOnly: event.status === 'past' OR event.event_date < today
- Render EventForm component (mode='edit', isReadOnly if past)
- onSubmit: PUT to `/events/:id` API (disabled if isReadOnly)
- Show loading state during submission
- On success: Redirect to `/admin/events`
- On error: Display error message (e.g., "Cannot edit past events")
- Require admin auth
**Verification**: Future events editable, past events read-only, updates save correctly

---

#### [X] T030: Update /admin/events/page.tsx (event list with sort/filter)
**File**: `frontend/src/app/admin/events/page.tsx` (extend or create)
**Description**: Create/update event list page:
- Parse URL search params for sort and filter (useSearchParams)
- Fetch events from `/events?sort={sort}&filter={filter}` API
- Render EventList component with fetched events
- onEventClick: Navigate to `/admin/events/[id]/edit`
- Show loading state while fetching
- Require admin auth
**Verification**: Page loads, events display, sort/filter work, URL syncs, pagination works (if needed)

---

#### [X] T031: Create /admin/branding/page.tsx (branding customization)
**File**: `frontend/src/app/admin/branding/page.tsx`
**Description**: Create branding customization page:
- Fetch tenant branding from `/branding/:tenantId` API
- State: primaryColor, secondaryColor, logoFile, logoUrl
- Render ColorPicker for primary and secondary colors
- Render LogoUpload component
- Render BrandingPreview component (live preview)
- Save button:
  - PUT `/branding/:tenantId` with colors
  - If logoFile: POST `/branding/:tenantId/logo` with multipart form data
- Reset button: POST `/branding/:tenantId/reset`
- Show loading/saving states
- Optimistic UI updates (update preview immediately)
- On save success: Show confirmation, update TenantContext (T033)
- Require admin auth
**Verification**: Colors update with live preview, logo uploads, reset works, changes persist

---

#### [X] T032: Create /admin/settings/page.tsx (settings screen)
**File**: `frontend/src/app/admin/settings/page.tsx`
**Description**: Create settings page:
- Fetch settings from `/settings/:tenantId` API
- Render SettingsForm component with fetched data
- onSubmit: PUT `/settings/:tenantId` with updated fields
- Show loading/saving states
- On save success: Show confirmation
- Display billing info as read-only (plan, renewal, payment method)
- Require admin auth
**Verification**: Page loads, form submits, settings update, billing info displayed correctly

---

#### [X] T033: Extend TenantContext.tsx with branding state
**File**: `frontend/src/contexts/TenantContext.tsx` (extend existing)
**Description**: Extend tenant context to include branding:
- Add `branding: Branding` to context state
- Add `updateBranding(branding: Branding): void` method
- Fetch branding on context initialization (from `/branding/:tenantId`)
- Apply branding via CSS custom properties (research.md decision 3):
  ```tsx
  <div style={{
    '--color-primary': branding.primary_color,
    '--color-secondary': branding.secondary_color
  } as React.CSSProperties}>
  ```
- Cache branding to avoid refetching
- Export hook: `useTenantBranding()`
**Verification**: Branding loads on app init, CSS variables available, updates reflected across all pages

---

## Phase 3.4: Integration Tests (After Implementation)

### [X] T034 [P]: Integration test - Create Event Flow (Scenario 1)
**File**: `backend/tests/integration/create-event-flow.test.ts`
**Description**: Implement integration test per quickstart.md Scenario 1:
- Login as admin → save token
- Create public event → verify response (no tokens)
- Create private event → verify response + tokens generated in database
- Test tenant isolation (create with different admin, verify first can't see)
- Use real Supabase instance (test tenant)
**Expected**: All assertions pass

---

### [X] T035 [P]: Integration test - Edit Event Flow (Scenario 2)
**File**: `backend/tests/integration/edit-event-flow.test.ts`
**Description**: Implement integration test per quickstart.md Scenario 2:
- Create future event
- Update future event → verify succeeds, metadata preserved
- Manually create past event in DB
- Attempt update past event → verify fails with 400 error
**Expected**: All assertions pass

---

### [X] T036 [P]: Integration test - Branding Flow (Scenario 3)
**File**: `backend/tests/integration/branding-flow.test.ts`
**Description**: Implement integration test per quickstart.md Scenario 3:
- Get current branding → verify defaults
- Update colors → verify response + DB update
- Upload logo → verify file in Supabase Storage + logo_url returned
- Check branding applied (fetch from API)
- Reset branding → verify defaults restored + logo file deleted
**Expected**: All assertions pass

---

### [X] T037 [P]: Integration test - Event List Flow (Scenario 4)
**File**: `backend/tests/integration/event-list-flow.test.ts`
**Description**: Implement integration test per quickstart.md Scenario 4:
- Create 3 future events with different dates
- Manually create 1 past event
- List with default sort → verify order (date-asc)
- List with sort=date-desc → verify reverse order
- List with filter=active → verify only future events
- List with filter=past → verify only past event
- Verify tenant isolation
**Expected**: All assertions pass

---

### [X] T038 [P]: Integration test - Settings Flow (Scenario 5)
**File**: `backend/tests/integration/settings-flow.test.ts`
**Description**: Implement integration test per quickstart.md Scenario 5:
- Get settings → verify current values + billing_info present
- Update hotel_name → verify response + DB update
- Update contact info → verify response + DB update
- Test validation: invalid email → verify 400 error
- Test validation: hotel_name too short → verify 400 error
- Verify billing_info not updatable (ignored or rejected)
**Expected**: All assertions pass

---

## Phase 3.5: Polish

### [X] T039: Performance validation (<1s page load, <2s list render)
**File**: N/A (manual testing + performance metrics)
**Description**: Validate performance targets per plan.md:
- Page load time: < 1s (measure Time to First Contentful Paint for /admin/dashboard)
- Event list render: < 2s (with 100+ events, measure initial render time)
- API response: < 500ms (measure GET /events, GET /branding, GET /settings)
- Logo upload: < 10s (upload 1.5MB PNG)
- Use Chrome DevTools Performance tab or Lighthouse
- Document results in performance report
**Verification**: All targets met or documented if not

---

### [X] T040: Run manual testing checklist from quickstart.md
**File**: N/A (manual testing)
**Description**: Execute all manual tests from quickstart.md manual testing checklist (lines 229-254):
- Create public/private events → verify tokens
- Edit future/past events → verify constraints
- Upload logos (PNG, JPG, SVG, various sizes) → verify validation
- Change colors → verify live preview
- Sort/filter events → verify correct results
- Update settings → verify validation
- Test as non-admin → verify 403 errors
- Check mark each item in checklist as complete
**Verification**: All checklist items pass

---

### [X] T041: Update CLAUDE.md with feature notes
**File**: `CLAUDE.md` (extend existing)
**Description**: Document feature-specific patterns for future development:
- Branding: CSS custom properties pattern for dynamic theming
- File uploads: Multer + Supabase Storage pattern with RLS
- Sort/filter: URL search params pattern for shareable state
- Event editing: Date-based constraints (future vs past)
- Add to "Recent Changes" section
**Verification**: Documentation clear and useful for next developer

---

## Dependencies

**Sequential Dependencies**:
- T001-T003 (Setup) → All other tasks
- T004-T011 (Tests) → T012-T020 (Implementation)
- T012 (Models) → T013-T015 (Services)
- T013-T015 (Services) → T016-T018 (Routes)
- T019 (Middleware) → T016-T018 (Routes need auth)
- T016-T020 (Backend complete) → T021-T027 (Components)
- T021-T027 (Components) → T028-T032 (Pages)
- T028-T033 (Frontend complete) → T034-T038 (Integration tests)
- T034-T038 (Integration tests pass) → T039-T041 (Polish)

**Parallel Execution Groups**:
- Tests: T004-T011 can run in parallel (different files)
- Components: T021-T027 can run in parallel (different files)
- Pages: T028-T032 can run in parallel (different files, API already exists)
- Integration tests: T034-T038 can run in parallel (different files)

---

## Parallel Execution Examples

### Run all contract tests in parallel:
```bash
# Terminal 1
npm test backend/tests/contract/events-create.test.ts

# Terminal 2
npm test backend/tests/contract/events-update.test.ts

# Terminal 3
npm test backend/tests/contract/events-list.test.ts

# ... (T004-T011)
```

### Run all component development in parallel:
```bash
# Developer 1: T021-T022
# Developer 2: T023-T024
# Developer 3: T025-T027
```

### Run all integration tests in parallel:
```bash
npm test backend/tests/integration/*.test.ts
```

---

## Validation Checklist
*GATE: Verify before marking plan complete*

- [x] All contracts have corresponding tests (T004-T011 cover 8 endpoints)
- [x] All entities have model tasks (T012 defines TypeScript interfaces)
- [x] All tests come before implementation (T004-T011 before T012-T020)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD enforced: Tests MUST FAIL before implementation starts
- [x] All 5 integration scenarios from quickstart.md covered (T034-T038)

---

## Notes

- **[P] tasks**: Different files, no dependencies → safe for parallel execution
- **TDD critical**: Verify tests FAIL before implementing (proves tests work)
- **Commit strategy**: Commit after each task completion for atomic changes
- **RLS policies**: Apply via Supabase Dashboard (T003), test thoroughly
- **File uploads**: Client + server validation (defense in depth)
- **Branding state**: Context updates trigger re-render of all pages with new colors
- **Performance**: Monitor API response times, optimize queries if needed
- **Avoid**: Vague tasks, implementation without tests, same-file conflicts in parallel

---

## Summary

- **Total Tasks**: 41 (T001-T041)
- **Setup**: 3 tasks (dependencies, migration, apply)
- **Contract Tests**: 8 tasks [P] (TDD - must fail first)
- **Backend Implementation**: 9 tasks (models, services, routes, middleware)
- **Frontend Components**: 7 tasks [P]
- **Frontend Pages**: 6 tasks [P]
- **Integration Tests**: 5 tasks [P]
- **Polish**: 3 tasks (performance, manual testing, docs)

**Estimated Completion**:
- Setup: 1 hour
- Tests: 8 hours (TDD)
- Backend: 12 hours
- Frontend: 16 hours
- Integration: 4 hours
- Polish: 3 hours
- **Total**: ~44 hours (~1 week for 1 developer)

**Ready for execution following TDD principles!**
