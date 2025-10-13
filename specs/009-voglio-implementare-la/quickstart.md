# Quickstart Validation Guide: CloudConvert Thumbnail Generation

**Feature**: `009-voglio-implementare-la`
**Purpose**: Step-by-step manual validation of thumbnail generation feature
**Audience**: Developers, QA testers

## Prerequisites

- Development environment running (frontend on localhost:3000)
- Supabase database with migrations applied
- CloudConvert API key configured in environment variables
- Resend API key configured (for email notifications)
- Test admin account with valid authentication token

## Environment Variables Required

```bash
# CloudConvert Configuration
CLOUDCONVERT_API_KEY=your_api_key_here
CLOUDCONVERT_WEBHOOK_SECRET=your_webhook_secret_here

# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
NOTIFICATION_FROM_EMAIL=notifications@sharehub.app
SUPPORT_EMAIL=support@sharehub.app

# R2 Storage (existing)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
```

## Test Scenario 1: Basic Thumbnail Generation

**Goal**: Verify thumbnail generation works for a PPT file

**Steps**:
1. Login as admin user
2. Navigate to Events → Create New Event
3. Enable "Thumbnail Generation" toggle
4. Create event and add a session
5. Upload a PPTX slide file
6. **Expected**:
   - Upload completes in <1s
   - Thumbnail status shows "Generating..."
   - After ~2 minutes, thumbnail appears in speech card
7. **Verify**:
   - Check database: `slides.thumbnail_status = 'completed'`
   - Check database: `slides.thumbnail_r2_key` is NOT NULL
   - Check R2 storage: Thumbnail file exists at specified key
   - Check database: `cloudconvert_jobs.status = 'completed'`

**Pass Criteria**: Thumbnail visible in UI, stored in R2, status = 'completed'

---

## Test Scenario 2: Quota Enforcement

**Goal**: Verify quota blocks generation after 5 thumbnails

**Steps**:
1. Check quota display in admin dashboard
2. **Expected**: Shows "X of 5 thumbnails used"
3. Generate 5 thumbnails (repeat Scenario 1 five times)
4. **Expected**: Quota badge shows "5 of 5 thumbnails used" (red)
5. Attempt to generate 6th thumbnail
6. **Expected**:
   - Error message: "Thumbnail quota exhausted"
   - Upgrade prompt displayed
   - No CloudConvert job created
7. **Verify**:
   - Check database: `tenants.thumbnail_quota_used = 5`
   - Check database: No new `cloudconvert_jobs` record for 6th slide
   - Check UI: Clear error message with upgrade CTA

**Pass Criteria**: 6th generation blocked, quota enforced, clear error messaging

---

## Test Scenario 3: Event Toggle Disabled

**Goal**: Verify thumbnail generation respects event-level toggle

**Steps**:
1. Create event with "Thumbnail Generation" toggle DISABLED
2. Upload a slide to this event
3. **Expected**:
   - No thumbnail generation initiated
   - Placeholder icon shown in speech card
   - Status remains 'none' or 'pending'
4. Edit event → Enable "Thumbnail Generation" toggle
5. **Expected**:
   - Background job initiates retroactive generation
   - Status changes to 'processing'
   - Thumbnail appears after ~2 minutes
6. **Verify**:
   - Check database: `events.thumbnail_generation_enabled = true`
   - Check database: `slides.thumbnail_status` transitions from 'none' → 'processing' → 'completed'

**Pass Criteria**: Toggle controls generation, retroactive generation works

---

## Test Scenario 4: Failure Handling & Retry

**Goal**: Verify failure handling and manual retry

**Steps**:
1. Upload a corrupted or invalid PPT file
2. **Expected**:
   - Generation fails within 5 minutes
   - Status shows "Failed" with error badge
   - Retry button appears
3. Click "Retry" button
4. **Expected**:
   - Checks quota availability
   - Re-initiates generation if quota available
   - Shows "Generating..." status
5. **Verify**:
   - Check database: `thumbnail_failure_log` entry created
   - Check database: `cloudconvert_jobs.status = 'failed'` for first attempt
   - Check database: New `cloudconvert_jobs` record created for retry
   - Check database: `slides.thumbnail_status` changes from 'failed' → 'processing'

**Pass Criteria**: Failure logged, retry mechanism works, quota checked before retry

---

## Test Scenario 5: Email Notification After 3 Failures

**Goal**: Verify email notifications sent after repeated failures

**Steps**:
1. Create event with thumbnail generation enabled
2. Upload 3 slides that will fail generation (corrupted files)
3. Wait for all 3 to fail (within 15 minutes)
4. **Expected**:
   - Email sent to event admin
   - Subject: "⚠️ Thumbnail Generation Failures Detected"
   - Email contains:
     - Event name
     - List of failed slides with filenames
     - Error types and messages
     - "View Event Dashboard" button
     - "Retry All Failed Thumbnails" button
5. **Verify**:
   - Check email inbox for notification
   - Check database: `thumbnail_failure_log` has 3+ entries for event
   - Check database: Email notification logged (future enhancement)

**Pass Criteria**: Email received, contains correct failure details, actionable CTAs

---

## Test Scenario 6: Webhook Processing

**Goal**: Verify CloudConvert webhook handling

**Steps**:
1. Initiate thumbnail generation (creates CloudConvert job)
2. Wait for CloudConvert webhook callback
3. **Expected**:
   - Webhook received within 2-3 minutes
   - Signature verified successfully
   - Thumbnail downloaded from CloudConvert
   - Thumbnail uploaded to R2
   - Database updated atomically
4. **Verify**:
   - Check logs: Webhook signature verification passed
   - Check database: `cloudconvert_jobs.webhook_received_at` is NOT NULL
   - Check database: `cloudconvert_jobs.completed_at` matches webhook timestamp
   - Check R2: Thumbnail file exists
   - Check database: `slides.thumbnail_r2_key` set

**Pass Criteria**: Webhook processed, thumbnail stored, database consistent

---

## Test Scenario 7: Retroactive Generation (Batch)

**Goal**: Verify retroactive generation for existing slides

**Steps**:
1. Create event with toggle DISABLED
2. Upload 10 slides
3. Enable "Thumbnail Generation" toggle
4. **Expected**:
   - Background job queues all 10 slides
   - Progress indicator shows "3 of 10 thumbnails generated"
   - Thumbnails appear incrementally over ~15-20 minutes
   - Quota enforced (stops at 5 if free tier)
5. **Verify**:
   - Check database: `slides.thumbnail_status = 'pending'` for slides without thumbnails
   - Check database: Slides transition to 'processing' → 'completed' incrementally
   - Check logs: Netlify Scheduled Function executing every 5 minutes
   - Check database: Quota incremented correctly

**Pass Criteria**: Batch processing works, quota enforced, progress visible

---

## Test Scenario 8: Performance Validation

**Goal**: Verify performance targets met

**Performance Targets** (from plan.md):
- Thumbnail generation: <5 minutes (300 seconds) timeout
- Async processing: Non-blocking slide upload (<1s)
- Dashboard load: <2s with thumbnail display
- API response: <500ms for quota checks

**Steps**:
1. Upload slide → Measure response time
   - **Target**: <1 second
2. Generate thumbnail → Measure completion time
   - **Target**: <5 minutes
3. Load dashboard with 50 speeches (with thumbnails)
   - **Target**: <2 seconds initial render
4. Call `/api/admin/thumbnails/quota`
   - **Target**: <500ms response time

**Verification**:
```bash
# Test quota endpoint performance
time curl -X GET http://localhost:3000/api/admin/thumbnails/quota \
  -H "Authorization: Bearer $AUTH_TOKEN"
# Expected: <500ms
```

**Pass Criteria**: All performance targets met

---

## Test Scenario 9: Multi-Tenant Isolation

**Goal**: Verify tenant isolation (no cross-tenant access)

**Steps**:
1. Create Tenant A and Tenant B
2. Generate thumbnails for Tenant A
3. Login as Tenant B admin
4. Attempt to access Tenant A's quota endpoint
5. **Expected**:
   - Returns Tenant B's quota (not Tenant A's)
6. Attempt to retry Tenant A's failed slide
7. **Expected**:
   - Returns 404 "Slide not found" (RLS blocks access)
8. **Verify**:
   - Check database: RLS policies enforce tenant_id filtering
   - Check logs: No cross-tenant data leakage

**Pass Criteria**: Complete tenant isolation, RLS policies working

---

## Test Scenario 10: Unsupported File Types

**Goal**: Verify graceful handling of unsupported formats

**Steps**:
1. Attempt to generate thumbnail for:
   - Word document (.docx)
   - Excel spreadsheet (.xlsx)
   - Plain text file (.txt)
2. **Expected**:
   - Clear error message: "Thumbnail generation only supports PPT, PPTX, PDF, JPEG, PNG"
   - No quota consumed
   - Status remains 'none'
3. Upload supported file (PPT)
4. **Expected**:
   - Generation proceeds normally

**Pass Criteria**: Unsupported types rejected, quota not consumed, clear errors

---

## Debugging Commands

### Check Thumbnail Status
```sql
SELECT
  s.id,
  s.filename,
  s.thumbnail_status,
  s.thumbnail_r2_key,
  s.thumbnail_generated_at,
  ccj.status as job_status,
  ccj.error_message
FROM slides s
LEFT JOIN cloudconvert_jobs ccj ON ccj.slide_id = s.id
WHERE s.id = 'your-slide-id-here';
```

### Check Quota
```sql
SELECT
  name,
  thumbnail_quota_used,
  thumbnail_quota_total,
  (thumbnail_quota_total - thumbnail_quota_used) as remaining
FROM tenants
WHERE id = 'your-tenant-id-here';
```

### Check Failure Log
```sql
SELECT
  tfl.*,
  s.filename,
  e.name as event_name
FROM thumbnail_failure_log tfl
JOIN slides s ON s.id = tfl.slide_id
JOIN events e ON e.id = tfl.event_id
WHERE tfl.event_id = 'your-event-id-here'
ORDER BY tfl.occurred_at DESC
LIMIT 10;
```

### Check Webhook Processing
```sql
SELECT
  cloudconvert_job_id,
  status,
  started_at,
  completed_at,
  webhook_received_at,
  (completed_at - started_at) as processing_duration
FROM cloudconvert_jobs
WHERE slide_id = 'your-slide-id-here';
```

---

## Success Criteria Summary

**Must Pass** (All 10 scenarios):
- ✅ Thumbnail generation works end-to-end
- ✅ Quota enforcement blocks after 5 thumbnails
- ✅ Event toggle controls generation
- ✅ Failure handling and retry mechanism
- ✅ Email notifications after 3+ failures
- ✅ Webhook processing and signature verification
- ✅ Retroactive batch processing
- ✅ Performance targets met
- ✅ Multi-tenant isolation enforced
- ✅ Unsupported file types handled gracefully

**Known Limitations**:
- CloudConvert API may be temporarily unavailable (external dependency)
- Webhook delivery may be delayed by CloudConvert (not under our control)
- Free CloudConvert tier limited to 25 conversions/day

**Next Steps After Validation**:
- Run automated contract tests: `npm test tests/contract/thumbnail*.test.ts`
- Performance profiling with 100+ slides
- Load testing with concurrent thumbnail generations
- Monitor CloudConvert API costs and usage
