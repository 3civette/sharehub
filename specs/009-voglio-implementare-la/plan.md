# Implementation Plan: CloudConvert Thumbnail Generation with Event-Level Toggle

**Branch**: `009-voglio-implementare-la` | **Date**: 2025-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-voglio-implementare-la/spec.md`

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

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Implement CloudConvert API integration to automatically generate thumbnail images from the first slide of uploaded presentations (PPT, PPTX, PDF). Add event-level toggle to enable/disable thumbnail generation per event. Implement freemium cost model with 5 free thumbnails per tenant, quota tracking, and email notifications for repeated failures. Thumbnail generation must be asynchronous with 5-minute timeout, supporting retroactive generation for existing slides when feature is enabled.

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Next.js 14 App Router (frontend), CloudConvert API SDK, Supabase Client, Cloudflare R2 SDK, Email service (for failure notifications)
**Storage**: Supabase PostgreSQL (database), Cloudflare R2 (thumbnail storage), existing slide storage in R2
**Testing**: Vitest (contract tests), existing test infrastructure
**Target Platform**: Netlify Functions (serverless frontend), Cloudflare Workers compatible
**Project Type**: web (frontend + backend API routes in Next.js)
**Performance Goals**:
- Thumbnail generation: <5 minutes (300 seconds) timeout
- Async processing: Non-blocking slide upload
- Dashboard load: <2s with thumbnail display
- API response: <500ms for quota checks
**Constraints**:
- Netlify Functions: 10-second execution limit (requires async pattern)
- CloudConvert API: External service dependency
- 5 free thumbnails per tenant (hard limit)
- Multi-tenant data isolation via RLS
**Scale/Scope**:
- Support PPT, PPTX, PDF formats
- ~10-50 slides per event typical
- Thumbnail size: 300x300px JPEG
- 5 thumbnails per tenant free tier

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. No Easy Fixes (NON-NEGOTIABLE)
- ✅ **PASS**: CloudConvert API integration addresses root requirement for PPT/PDF conversion (not bypassing complexity)
- ✅ **PASS**: Async processing with proper job tracking (not masking serverless timeout limitations)
- ✅ **PASS**: 5-minute timeout based on clarified business requirement (not arbitrary workaround)

### II. Security First
- ✅ **PASS**: RLS policies required for tenant-scoped thumbnail quota tracking
- ✅ **PASS**: Event-level thumbnail settings respect tenant isolation
- ✅ **PASS**: CloudConvert API keys stored in environment variables (secure secrets management)
- ⚠️ **REVIEW**: Quota enforcement must be checked BEFORE CloudConvert API call to prevent cost overruns

### III. Test-Driven Development (TDD)
- ✅ **PASS**: Contract tests will be written for all new API endpoints before implementation
- ✅ **PASS**: Thumbnail generation workflow will have integration tests
- ✅ **PASS**: Quota enforcement will have unit tests
- ✅ **PASS**: Email notification triggering will have contract tests

### IV. Multi-Tenant Isolation
- ✅ **PASS**: Thumbnail quota tracked per tenant_id
- ✅ **PASS**: Event thumbnail toggle scoped to tenant events
- ✅ **PASS**: RLS policies enforce tenant-scoped access to quota and settings
- ✅ **PASS**: CloudConvert jobs must include tenant_id for audit trail

### V. UX-First Design
- ✅ **PASS**: Async thumbnail generation doesn't block slide upload (<1s preview)
- ✅ **PASS**: Quota visibility provides cost transparency to admins
- ✅ **PASS**: Loading states during thumbnail generation
- ✅ **PASS**: Clear error messages when quota exhausted or generation fails

### VI. Simplicity
- ✅ **PASS**: Using proven CloudConvert API (not building custom PPT parser)
- ✅ **PASS**: Freemium model straightforward (5 free, purchase more later)
- ✅ **PASS**: Event-level toggle simple boolean flag
- ✅ **PASS**: Existing thumbnail status fields reused (no new architecture)

**Initial Constitution Check**: ✅ PASS (no violations, one security review item documented)

---

## Post-Design Constitution Check
*Re-evaluated after Phase 1 (Design & Contracts) completion*

### I. No Easy Fixes (NON-NEGOTIABLE)
- ✅ **PASS**: Design maintains integrity - CloudConvert API with webhook pattern addresses core requirement
- ✅ **PASS**: Atomic quota function prevents race conditions (proper solution, not quick fix)
- ✅ **PASS**: Database-driven queue for retroactive generation (scalable approach)

### II. Security First
- ✅ **PASS**: RLS policies defined for all new tables (cloudconvert_jobs, thumbnail_failure_log)
- ✅ **PASS**: Atomic quota function uses SECURITY DEFINER with row-level locking
- ✅ **PASS**: Webhook signature verification implemented (HMAC-SHA256)
- ✅ **PASS**: Quota checked BEFORE CloudConvert API call (prevents cost overruns) - **Security review resolved**

### III. Test-Driven Development (TDD)
- ✅ **PASS**: Contract tests written for all 4 API endpoints (thumbnail-generation.yml, thumbnail-quota.yml, cloudconvert-webhook.yml, thumbnail-retry.yml)
- ✅ **PASS**: Test files created: thumbnailGeneration.test.ts, thumbnailQuota.test.ts, thumbnailWebhook.test.ts
- ✅ **PASS**: All tests written BEFORE implementation (expected to fail until implementation complete)

### IV. Multi-Tenant Isolation
- ✅ **PASS**: All new tables include tenant_id with ON DELETE CASCADE
- ✅ **PASS**: RLS policies enforce tenant_id filtering on cloudconvert_jobs and thumbnail_failure_log
- ✅ **PASS**: Quota function operates on tenant-scoped data only
- ✅ **PASS**: Webhook processing validates slide ownership via tenant_id

### V. UX-First Design
- ✅ **PASS**: Quota badge design provides real-time visibility (3 states: available/low/exhausted)
- ✅ **PASS**: Failure UI includes retry button and clear error messages
- ✅ **PASS**: Loading states designed for async thumbnail generation
- ✅ **PASS**: Email notifications provide actionable CTAs (view dashboard, retry all)

### VI. Simplicity
- ✅ **PASS**: Data model reuses existing columns (thumbnail_status, thumbnail_r2_key, thumbnail_generated_at)
- ✅ **PASS**: Quota stored as simple columns on tenants table (not separate service)
- ✅ **PASS**: Event toggle is single boolean flag
- ✅ **PASS**: No premature optimization - webhook recovery function only if needed

**Post-Design Constitution Check**: ✅ **PASS** (all 6 principles satisfied, security review resolved)

---

## Project Structure

### Documentation (this feature)
```
specs/009-voglio-implementare-la/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── thumbnail-toggle.yml
│   ├── thumbnail-quota.yml
│   ├── cloudconvert-webhook.yml
│   └── failure-notification.yml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── services/
│   │   ├── cloudConvertService.ts      # CloudConvert API integration
│   │   ├── thumbnailQuotaService.ts    # Quota tracking and enforcement
│   │   └── emailNotificationService.ts # Failure notification emails
│   └── lib/
│       └── cloudconvert.ts             # CloudConvert SDK wrapper

frontend/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── slides/
│   │       │   └── [id]/
│   │       │       └── generate-thumbnail/
│   │       │           └── route.ts    # UPDATED: CloudConvert integration
│   │       └── admin/
│   │           └── thumbnails/
│   │               ├── quota/route.ts  # NEW: Get tenant thumbnail quota
│   │               └── retry/route.ts  # NEW: Manual retry endpoint
│   ├── components/
│   │   └── admin/
│   │       ├── EventForm.tsx           # UPDATED: Add thumbnail toggle
│   │       └── ThumbnailQuotaBadge.tsx # NEW: Display remaining quota
│   └── services/
│       └── thumbnailService.ts         # NEW: Client-side thumbnail API calls

tests/
└── contract/
    ├── thumbnailGeneration.test.ts     # CloudConvert workflow tests
    ├── thumbnailQuota.test.ts          # Quota enforcement tests
    └── thumbnailNotifications.test.ts  # Email notification tests
```

**Structure Decision**: Web application structure (frontend + backend). Next.js 14 App Router used for API routes (serverless functions on Netlify). CloudConvert integration will be in Next.js API routes rather than separate backend service to leverage existing R2 access patterns. Frontend components updated to display thumbnail toggle and quota information.

## Phase 0: Outline & Research

### Research Tasks

1. **CloudConvert API Integration**
   - Research CloudConvert Node.js SDK usage and authentication
   - Find best practices for PPT/PPTX/PDF → thumbnail conversion
   - Determine optimal output format and dimensions (300x300px JPEG)
   - Investigate webhook vs polling for async job completion

2. **Async Job Processing in Serverless**
   - Research patterns for long-running jobs in Netlify Functions (10s limit)
   - Evaluate CloudConvert webhook integration with Next.js API routes
   - Determine job tracking strategy (database vs CloudConvert API polling)
   - Find timeout handling patterns for 5-minute max duration

3. **Email Notification Service**
   - Research email service options compatible with Next.js (Resend, SendGrid, etc.)
   - Find patterns for transactional email templates
   - Determine failure threshold logic (3+ consecutive failures)
   - Investigate email delivery tracking and retry mechanisms

4. **Quota Management Patterns**
   - Research freemium quota enforcement patterns
   - Find database schema patterns for quota tracking per tenant
   - Determine atomic increment/decrement strategies to prevent race conditions
   - Investigate quota reset strategies (future: purchase more)

5. **Retroactive Thumbnail Generation**
   - Research background job patterns for batch processing existing slides
   - Find incremental processing patterns (only slides without thumbnails)
   - Determine queue management for multiple retroactive jobs
   - Investigate progress tracking UI for admin visibility

**Research Output Target**: `research.md` documenting:
- CloudConvert SDK setup and conversion workflow
- Webhook integration architecture for async job completion
- Email service selection and notification template design
- Quota enforcement strategy with database schema
- Retroactive generation queue architecture

## Phase 1: Design & Contracts

### Data Model Changes

**New Tables**:
1. `thumbnail_quota` - Track per-tenant thumbnail usage
   ```sql
   CREATE TABLE thumbnail_quota (
     tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
     used_count INTEGER DEFAULT 0,
     total_free INTEGER DEFAULT 5,
     purchased_count INTEGER DEFAULT 0,
     last_reset_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. `cloudconvert_jobs` - Track async conversion jobs
   ```sql
   CREATE TABLE cloudconvert_jobs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     slide_id UUID NOT NULL REFERENCES slides(id),
     job_id TEXT NOT NULL, -- CloudConvert job ID
     status TEXT NOT NULL DEFAULT 'pending',
     error_message TEXT,
     started_at TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ,
     UNIQUE(slide_id)
   );
   ```

3. `thumbnail_failure_log` - Track failures for notification triggering
   ```sql
   CREATE TABLE thumbnail_failure_log (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     event_id UUID NOT NULL REFERENCES events(id),
     slide_id UUID NOT NULL REFERENCES slides(id),
     error_type TEXT NOT NULL,
     error_message TEXT,
     occurred_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

**Modified Tables**:
1. `events` - Add thumbnail toggle
   ```sql
   ALTER TABLE events
   ADD COLUMN thumbnail_generation_enabled BOOLEAN DEFAULT FALSE;
   ```

2. `slides` - Already has `thumbnail_status`, `thumbnail_r2_key`, `thumbnail_generated_at` (existing fields reused)

### API Contracts

1. **POST /api/slides/[id]/generate-thumbnail** (UPDATED)
   - Adds CloudConvert API integration
   - Checks tenant quota before generation
   - Creates cloudconvert_jobs tracking record
   - Returns 202 Accepted with job status

2. **GET /api/admin/thumbnails/quota** (NEW)
   - Returns tenant thumbnail quota information
   - Response: `{ used: number, total: number, remaining: number }`

3. **POST /api/admin/thumbnails/retry** (NEW)
   - Manually retry failed thumbnail generation
   - Request: `{ slide_id: string }`
   - Checks quota before retry

4. **POST /api/webhooks/cloudconvert** (NEW)
   - CloudConvert webhook endpoint for job completion
   - Updates cloudconvert_jobs status
   - Downloads thumbnail from CloudConvert
   - Uploads to R2 and updates slides table

### Contract Tests

1. **thumbnailGeneration.test.ts**
   - Test quota check before generation
   - Test CloudConvert job creation
   - Test async webhook handling
   - Test R2 thumbnail upload after completion

2. **thumbnailQuota.test.ts**
   - Test quota enforcement (block when exhausted)
   - Test quota increment on generation
   - Test quota display endpoint

3. **thumbnailNotifications.test.ts**
   - Test failure tracking after 3+ consecutive failures
   - Test email notification triggering
   - Test notification template rendering

### Integration Test Scenarios (from User Stories)

1. **Thumbnail generation for PPT upload**
   - Given event with thumbnail_generation_enabled = true
   - When admin uploads PPT slide
   - Then CloudConvert job created
   - And quota incremented
   - And webhook completes job
   - And thumbnail displayed in dashboard

2. **Quota exhaustion blocks generation**
   - Given tenant with 5 used thumbnails
   - When admin uploads new slide
   - Then generation blocked with clear error message
   - And quota purchase prompt displayed

3. **Retroactive generation on toggle enable**
   - Given event with existing slides without thumbnails
   - When admin enables thumbnail_generation_enabled
   - Then background job queues generation for slides without thumbnails
   - And quota checked per slide

4. **Email notification after 3 failures**
   - Given event with thumbnail generation enabled
   - When 3 consecutive thumbnail jobs fail
   - Then email sent to event admin
   - And failure log created

### Quickstart Validation

**quickstart.md** will contain step-by-step verification:
1. Create event with thumbnail toggle enabled
2. Upload PPT slide and verify async generation
3. Check quota display updates
4. Exhaust quota and verify blocking message
5. Enable toggle on existing event with slides
6. Verify retroactive generation (incremental)
7. Trigger 3 failures and verify email notification

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 contracts and data model
3. TDD order: Contract tests → Data model → Implementation → Integration tests

**Task Ordering**:
1. **Database Tasks** [P = Parallel]:
   - [P] Create thumbnail_quota table migration
   - [P] Create cloudconvert_jobs table migration
   - [P] Create thumbnail_failure_log table migration
   - [P] Add thumbnail_generation_enabled column to events table
   - [P] Create RLS policies for new tables

2. **Contract Test Tasks** [Sequential per endpoint]:
   - Write contract tests for quota check endpoint
   - Write contract tests for CloudConvert generation endpoint
   - Write contract tests for webhook endpoint
   - Write contract tests for retry endpoint
   - Write contract tests for email notifications

3. **Backend Implementation Tasks** [Sequential dependencies]:
   - Implement CloudConvert SDK wrapper
   - Implement thumbnailQuotaService (quota check/increment)
   - Implement cloudConvertService (job creation/tracking)
   - Implement emailNotificationService (failure emails)
   - Update generate-thumbnail route with CloudConvert integration
   - Create quota endpoint
   - Create retry endpoint
   - Create webhook endpoint

4. **Frontend Implementation Tasks** [P after backend complete]:
   - [P] Add thumbnail toggle to EventForm component
   - [P] Create ThumbnailQuotaBadge component
   - [P] Update DashboardSessionsSpeeches to show quota
   - [P] Add quota exhaustion error UI
   - [P] Implement thumbnailService client calls

5. **Integration Test Tasks** [After implementation]:
   - Write integration test for full thumbnail generation workflow
   - Write integration test for quota exhaustion scenario
   - Write integration test for retroactive generation
   - Write integration test for email notification triggering

6. **Documentation Tasks** [Parallel with testing]:
   - [P] Document CloudConvert API setup in quickstart.md
   - [P] Document environment variables required
   - [P] Update CLAUDE.md with thumbnail patterns

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations requiring justification*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - `research.md` created
- [x] Phase 1: Design complete (/plan command) - `data-model.md`, `contracts/`, `quickstart.md`, contract tests, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - See "Phase 2: Task Planning Approach" section
- [ ] Phase 3: Tasks generated (/tasks command) - Ready for `/tasks` command
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (all 6 principles satisfied)
- [x] All NEEDS CLARIFICATION resolved - All research findings documented in research.md
- [x] Complexity deviations documented (none)
- [x] Contract tests written (TDD approach followed)
- [x] Data model documented with validation rules
- [x] API contracts specified (4 endpoints + email service)
- [x] Quickstart validation guide created (10 test scenarios)

---
*Based on Constitution v2.1.1 - See `.specify/memory/constitution.md`*
