# Tasks: CloudConvert Thumbnail Generation with Event-Level Toggle

**Feature**: `009-voglio-implementare-la`
**Input**: Design documents from `/specs/009-voglio-implementare-la/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Tech Stack (from plan.md)
- **Language**: TypeScript 5.3+ (Node.js 20 LTS, React 18)
- **Framework**: Next.js 14 App Router (frontend), Vitest (testing)
- **Database**: Supabase PostgreSQL with RLS
- **Storage**: Cloudflare R2
- **Email**: Resend
- **External API**: CloudConvert

## Path Conventions
- Frontend: `frontend/src/`
- Tests: `tests/contract/`
- Database: Supabase migrations (SQL)

---

## Phase 3.1: Setup & Dependencies

- [ ] **T001** Install CloudConvert SDK dependency
  ```bash
  cd frontend && npm install cloudconvert --save
  ```

- [ ] **T002** Install Resend email SDK dependency
  ```bash
  cd frontend && npm install resend react-email --save
  ```

- [ ] **T003** [P] Add environment variables to `.env.local` documentation
  - File: `frontend/.env.example` (add new variables)
  - Variables: `CLOUDCONVERT_API_KEY`, `CLOUDCONVERT_WEBHOOK_SECRET`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, `SUPPORT_EMAIL`

---

## Phase 3.2: Database Migrations ⚠️ CRITICAL: MUST COMPLETE BEFORE TESTS

- [ ] **T004** [P] Create migration: Add quota columns to tenants table
  - File: `supabase/migrations/009_add_thumbnail_quota_to_tenants.sql`
  - Add columns: `thumbnail_quota_total INTEGER DEFAULT 5`, `thumbnail_quota_used INTEGER DEFAULT 0`
  - Add CHECK constraint: `thumbnail_quota_used >= 0 AND thumbnail_quota_used <= thumbnail_quota_total`

- [ ] **T005** [P] Create migration: Add thumbnail_generation_enabled to events table
  - File: `supabase/migrations/009_add_thumbnail_toggle_to_events.sql`
  - Add column: `thumbnail_generation_enabled BOOLEAN DEFAULT FALSE`
  - Create index: `idx_events_thumbnail_enabled`

- [ ] **T006** [P] Create migration: cloudconvert_jobs table
  - File: `supabase/migrations/009_create_cloudconvert_jobs.sql`
  - Columns: id, tenant_id, slide_id, cloudconvert_job_id, status, error_message, idempotency_key, started_at, completed_at, webhook_received_at
  - UNIQUE constraint on slide_id
  - Foreign keys with ON DELETE CASCADE

- [ ] **T007** [P] Create migration: thumbnail_failure_log table
  - File: `supabase/migrations/009_create_thumbnail_failure_log.sql`
  - Columns: id, tenant_id, event_id, slide_id, error_type, error_message, occurred_at
  - Foreign keys with ON DELETE CASCADE

- [ ] **T008** [P] Create RLS policies for cloudconvert_jobs
  - File: `supabase/migrations/009_rls_cloudconvert_jobs.sql`
  - Policy: admins_view_own_jobs (SELECT where tenant_id matches)
  - Policy: system_manage_jobs (ALL for system)

- [ ] **T009** [P] Create RLS policies for thumbnail_failure_log
  - File: `supabase/migrations/009_rls_thumbnail_failure_log.sql`
  - Policy: admins_view_own_failures (SELECT where tenant_id matches)
  - Policy: system_insert_failures (INSERT for system)

- [ ] **T010** Create atomic quota function
  - File: `supabase/migrations/009_quota_functions.sql`
  - Function: `check_and_increment_thumbnail_quota(p_tenant_id UUID)`
  - Returns: quota_available, quota_used, quota_total, quota_remaining
  - Use FOR UPDATE locking
  - Function: `rollback_thumbnail_quota(p_tenant_id UUID)`

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: Contract tests already written in Phase 1. Verify they FAIL before implementation.**

- [ ] **T011** Run existing contract tests to verify they fail
  ```bash
  npm test tests/contract/thumbnailGeneration.test.ts
  npm test tests/contract/thumbnailQuota.test.ts
  npm test tests/contract/thumbnailWebhook.test.ts
  ```
  Expected: ALL TESTS SHOULD FAIL (endpoints not implemented yet)

---

## Phase 3.4: Core Implementation (ONLY after tests are failing)

### Backend Services

- [ ] **T012** [P] Create CloudConvert SDK wrapper
  - File: `frontend/src/lib/cloudconvert.ts`
  - Export: `initializeCloudConvert()`, `createThumbnailJob()`, `verifyWebhookSignature()`
  - Use environment variable: `CLOUDCONVERT_API_KEY`

- [ ] **T013** [P] Create thumbnailQuotaService
  - File: `frontend/src/services/thumbnailQuotaService.ts`
  - Functions: `checkAndIncrementQuota(tenantId)`, `rollbackQuota(tenantId)`, `getQuotaInfo(tenantId)`
  - Call Supabase RPC functions

- [ ] **T014** [P] Create cloudConvertService
  - File: `frontend/src/services/cloudConvertService.ts`
  - Functions: `initiateJob(slideId, r2Key, mimeType, tenantId)`, `getJobStatus(jobId)`, `downloadThumbnail(url)`
  - Create cloudconvert_jobs database records

- [ ] **T015** [P] Create emailNotificationService using Resend
  - File: `frontend/src/services/emailNotificationService.ts`
  - Function: `sendThumbnailFailureEmail(emailData)`
  - Use Resend API
  - Check failure count >= 3 before sending

- [ ] **T016** [P] Create React Email template for failure notifications
  - File: `frontend/src/emails/thumbnail-failure-notification.tsx`
  - Include: event name, failure count, failed slides list, CTA buttons

### API Routes

- [ ] **T017** Update POST /api/slides/[id]/generate-thumbnail route with CloudConvert
  - File: `frontend/src/app/api/slides/[id]/generate-thumbnail/route.ts` (UPDATE EXISTING)
  - Steps:
    1. Check event.thumbnail_generation_enabled
    2. Check tenant quota (call atomic function)
    3. Create CloudConvert job
    4. Create cloudconvert_jobs record
    5. Update slides.thumbnail_status = 'processing'
    6. Return 202 Accepted with job_id
  - Error handling: Rollback quota on failure

- [ ] **T018** Create GET /api/admin/thumbnails/quota route
  - File: `frontend/src/app/api/admin/thumbnails/quota/route.ts` (NEW)
  - Get tenant_id from auth
  - Query tenants.thumbnail_quota_used and thumbnail_quota_total
  - Calculate: remaining, percentage_used, quota_status (available/low/exhausted)
  - Return JSON response per contract

- [ ] **T019** Create POST /api/admin/thumbnails/retry route
  - File: `frontend/src/app/api/admin/thumbnails/retry/route.ts` (NEW)
  - Validate slide_id
  - Check thumbnail_status = 'failed'
  - Check event.thumbnail_generation_enabled
  - Check quota available
  - Initiate new CloudConvert job
  - Return 202 Accepted

- [ ] **T020** Create POST /api/webhooks/cloudconvert route
  - File: `frontend/src/app/api/webhooks/cloudconvert/route.ts` (NEW)
  - Verify webhook signature (HMAC-SHA256)
  - Extract job_id and status from payload
  - Query cloudconvert_jobs table
  - If status = 'finished':
    - Download thumbnail from CloudConvert
    - Upload to R2
    - Update slides table (thumbnail_status = 'completed', thumbnail_r2_key set)
    - Update cloudconvert_jobs (status = 'completed', completed_at, webhook_received_at)
  - If status = 'error':
    - Update slides.thumbnail_status = 'failed'
    - Update cloudconvert_jobs.status = 'failed'
    - Create thumbnail_failure_log entry
    - Check for 3+ consecutive failures → trigger email
  - Return 200 OK

### Frontend Components

- [ ] **T021** [P] Add thumbnail toggle to EventForm component
  - File: `frontend/src/components/admin/EventForm.tsx` (UPDATE EXISTING)
  - Add checkbox input for `thumbnail_generation_enabled`
  - Label: "Enable Thumbnail Generation"
  - Tooltip: "Automatically generate thumbnails from uploaded slides (uses quota)"

- [ ] **T022** [P] Create ThumbnailQuotaBadge component
  - File: `frontend/src/components/admin/ThumbnailQuotaBadge.tsx` (NEW)
  - Fetch quota from `/api/admin/thumbnails/quota`
  - Display: "X of Y thumbnails used"
  - Colors: Green (available), Yellow (low), Red (exhausted)
  - Show upgrade prompt if exhausted

- [ ] **T023** [P] Create thumbnailService client utility
  - File: `frontend/src/services/thumbnailService.ts` (NEW)
  - Functions: `generateThumbnail(slideId)`, `getQuota()`, `retryGeneration(slideId)`
  - Wrapper around fetch calls to API routes

- [ ] **T024** Update DashboardSessionsSpeeches to show quota badge
  - File: `frontend/src/components/admin/DashboardSessionsSpeeches.tsx` (UPDATE EXISTING)
  - Import and render `<ThumbnailQuotaBadge />` in header
  - Show retry button for failed thumbnails
  - Display loading state during generation

---

## Phase 3.5: Integration & Retroactive Generation

- [ ] **T025** Create Netlify Scheduled Function for retroactive generation
  - File: `frontend/netlify/functions/thumbnail-retroactive-generation.ts` (NEW)
  - Schedule: Every 5 minutes
  - Query slides with: thumbnail_status = 'pending' AND event.thumbnail_generation_enabled = true
  - Batch process: 50 slides per invocation
  - Check quota for each slide before generation

- [ ] **T026** Add Supabase Realtime subscription for progress tracking
  - File: `frontend/src/hooks/useThumbnailProgress.ts` (NEW)
  - Subscribe to slides table changes
  - Filter by thumbnail_status updates
  - Update UI in real-time

---

## Phase 3.6: Integration Tests

- [ ] **T027** [P] Integration test: Full thumbnail generation workflow
  - File: `tests/integration/thumbnailWorkflow.test.ts` (NEW)
  - Test: Upload slide → job created → webhook received → thumbnail stored in R2
  - Verify all database state transitions

- [ ] **T028** [P] Integration test: Quota exhaustion scenario
  - File: `tests/integration/quotaExhaustion.test.ts` (NEW)
  - Test: Exhaust quota → attempt generation → verify blocked → verify error message

- [ ] **T029** [P] Integration test: Retroactive generation
  - File: `tests/integration/retroactiveGeneration.test.ts` (NEW)
  - Test: Enable toggle on event with existing slides → verify batch processing

- [ ] **T030** [P] Integration test: Email notification triggering
  - File: `tests/integration/emailNotifications.test.ts` (NEW)
  - Test: Create 3 consecutive failures → verify email sent

---

## Phase 3.7: Polish & Validation

- [ ] **T031** [P] Run all contract tests to verify they pass
  ```bash
  npm test tests/contract/thumbnailGeneration.test.ts
  npm test tests/contract/thumbnailQuota.test.ts
  npm test tests/contract/thumbnailWebhook.test.ts
  ```
  Expected: ALL TESTS SHOULD PASS

- [ ] **T032** [P] Run manual validation using quickstart.md
  - Follow all 10 test scenarios in `specs/009-voglio-implementare-la/quickstart.md`
  - Document any issues found

- [ ] **T033** Performance validation: Verify targets met
  - Thumbnail generation: < 5 minutes
  - Dashboard load: < 2s with thumbnails
  - Quota API: < 500ms
  - Upload response: < 1s (async)

- [ ] **T034** Security audit: RLS policies verification
  - Test cross-tenant access attempts
  - Verify webhook signature validation
  - Verify quota enforcement cannot be bypassed

- [ ] **T035** Update CLAUDE.md with new patterns (if needed)
  - Run: `powershell -ExecutionPolicy Bypass -File .specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`
  - Document webhook pattern
  - Document atomic quota pattern

---

## Dependencies

### Critical Path
```
T001-T003 (Setup)
  ↓
T004-T010 (Database Migrations) ← MUST COMPLETE BEFORE ANY CODE
  ↓
T011 (Verify Tests Fail) ← GATE: Tests must fail
  ↓
T012-T016 (Services) → Can run in parallel
  ↓
T017-T020 (API Routes) → Sequential (shared dependencies)
  ↓
T021-T024 (Frontend) → Can run in parallel (different files)
  ↓
T025-T026 (Scheduled Functions)
  ↓
T027-T030 (Integration Tests) → Can run in parallel
  ↓
T031-T035 (Polish) → Can run in parallel
```

### Detailed Dependencies
- **T011** blocks **T012-T035** (tests must fail first)
- **T012-T016** (services) must complete before **T017-T020** (API routes use services)
- **T017-T020** must complete before **T021-T024** (frontend calls API routes)
- **T021-T024** must complete before **T027-T030** (integration tests need UI)

---

## Parallel Execution Examples

### Batch 1: Database Migrations
```bash
# Can run in parallel (different files)
Task T004: Add quota columns to tenants
Task T005: Add thumbnail toggle to events
Task T006: Create cloudconvert_jobs table
Task T007: Create thumbnail_failure_log table
Task T008: RLS policies for cloudconvert_jobs
Task T009: RLS policies for thumbnail_failure_log
```

### Batch 2: Backend Services
```bash
# Can run in parallel (different files, no dependencies)
Task T012: CloudConvert SDK wrapper (lib/cloudconvert.ts)
Task T013: thumbnailQuotaService (services/thumbnailQuotaService.ts)
Task T014: cloudConvertService (services/cloudConvertService.ts)
Task T015: emailNotificationService (services/emailNotificationService.ts)
Task T016: React Email template (emails/thumbnail-failure-notification.tsx)
```

### Batch 3: Frontend Components
```bash
# Can run in parallel (different files)
Task T021: Update EventForm component
Task T022: Create ThumbnailQuotaBadge component
Task T023: Create thumbnailService utility
```

### Batch 4: Integration Tests
```bash
# Can run in parallel (different test files)
Task T027: Workflow integration test
Task T028: Quota exhaustion integration test
Task T029: Retroactive generation integration test
Task T030: Email notifications integration test
```

---

## Notes & Best Practices

### TDD Compliance
- ✅ Contract tests already written in Phase 1 (thumbnailGeneration.test.ts, thumbnailQuota.test.ts, thumbnailWebhook.test.ts)
- ⚠️ **CRITICAL**: Run T011 to verify tests fail before starting implementation
- ✅ Integration tests (T027-T030) written after implementation

### Atomic Operations
- T013 (thumbnailQuotaService) MUST use atomic database function to prevent race conditions
- Never increment quota directly - always use `check_and_increment_thumbnail_quota()` RPC

### Security Checklist
- All new tables have RLS policies
- Webhook signature verification required
- Quota checked BEFORE external API call
- Tenant isolation enforced at database level

### Cost Management
- Hard limit: 5 free thumbnails per tenant
- Quota must be checked before every CloudConvert API call
- Rollback quota if CloudConvert job creation fails

### Performance Targets
- Thumbnail generation: < 5 minutes (300 seconds) timeout
- Async processing: Non-blocking slide upload (< 1s)
- Dashboard load: < 2s with thumbnail display
- API response: < 500ms for quota checks

---

## Validation Checklist
*GATE: Verify before marking feature complete*

- [ ] All 4 contract files have corresponding tests (thumbnail-generation.yml → test, quota.yml → test, webhook.yml → test, retry.yml → test)
- [ ] All 3 new tables have migrations (cloudconvert_jobs ✓, thumbnail_failure_log ✓, tenants modified ✓)
- [ ] All tests run before implementation (TDD enforced by T011)
- [ ] Parallel tasks ([P]) modify different files
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
- [ ] All quickstart scenarios pass (10 scenarios in quickstart.md)
- [ ] Performance targets met (T033)
- [ ] Security audit passed (T034)

---

**Total Tasks**: 35
**Estimated Duration**: 9-13 days (72-104 hours from research.md)
**TDD Enforced**: Tests written before implementation (contract tests already exist)

---

*Generated from Phase 1 design documents: plan.md, data-model.md, contracts/, quickstart.md*
