# Manual Validation Checklist

**Feature**: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
**Date**: 2025-10-13
**Status**: Ready for Validation

## Pre-Validation Setup

### Environment Configuration Status

- [ ] CLOUDCONVERT_API_KEY configured in Netlify
- [ ] CLOUDCONVERT_WEBHOOK_SECRET configured in Netlify
- [ ] RESEND_API_KEY configured in Netlify
- [ ] NOTIFICATION_FROM_EMAIL configured
- [ ] SUPPORT_EMAIL configured
- [ ] R2 credentials verified (existing)
- [ ] Supabase migrations applied
- [ ] Frontend deployed to Netlify
- [ ] Test admin account created

### Database Verification

Run these queries to verify schema is ready:

```sql
-- Check tenants table has quota columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tenants' AND column_name LIKE 'thumbnail_quota%';

-- Check events table has toggle column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'thumbnail_generation_enabled';

-- Check cloudconvert_jobs table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'cloudconvert_jobs';

-- Check thumbnail_failure_log table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'thumbnail_failure_log';
```

## Test Scenarios (from quickstart.md)

### ✅ Scenario 1: Basic Thumbnail Generation
- [ ] Event created with toggle enabled
- [ ] PPTX file uploaded successfully (<1s)
- [ ] Thumbnail status shows "Generating..."
- [ ] Thumbnail appears within 5 minutes
- [ ] Database: `slides.thumbnail_status = 'completed'`
- [ ] Database: `slides.thumbnail_r2_key` populated
- [ ] R2 Storage: Thumbnail file exists
- [ ] Database: `cloudconvert_jobs.status = 'completed'`

**Notes**:
```
Expected Duration: ~2-5 minutes
CloudConvert Job ID: _______________
Thumbnail R2 Key: _______________
```

---

### ✅ Scenario 2: Quota Enforcement
- [ ] Initial quota badge shows "X of 5"
- [ ] Generated 5 thumbnails successfully
- [ ] Quota badge shows "5 of 5" (red indicator)
- [ ] 6th thumbnail blocked with error message
- [ ] Error shows "Thumbnail quota exhausted"
- [ ] Upgrade CTA displayed
- [ ] Database: `tenants.thumbnail_quota_used = 5`
- [ ] No CloudConvert job created for 6th slide

**Notes**:
```
Quota Used After Test: _____
Error Message Shown: _______________
```

---

### ✅ Scenario 3: Event Toggle Disabled
- [ ] Event created with toggle DISABLED
- [ ] Slide uploaded (no thumbnail generated)
- [ ] Placeholder icon shown
- [ ] Status remains 'none' or 'pending'
- [ ] Toggle enabled via event edit
- [ ] Retroactive generation started
- [ ] Thumbnail appears after ~2-5 minutes
- [ ] Database: Status transitions: none → processing → completed

**Notes**:
```
Event ID: _______________
Toggle Change Time: _______________
Completion Time: _______________
```

---

### ✅ Scenario 4: Failure Handling & Retry
- [ ] Corrupted/invalid file uploaded
- [ ] Generation fails within 5 minutes
- [ ] Status shows "Failed" with error badge
- [ ] Retry button appears
- [ ] Retry initiated successfully
- [ ] Quota checked before retry
- [ ] Database: `thumbnail_failure_log` entry created
- [ ] Database: Old job status = 'failed'
- [ ] Database: New job created for retry

**Notes**:
```
Error Type: _______________
Error Message: _______________
Retry Success: _______________
```

---

### ✅ Scenario 5: Email Notification (3+ Failures)
- [ ] 3 corrupted files uploaded
- [ ] All 3 failed within 15 minutes
- [ ] Email received at admin address
- [ ] Subject: "⚠️ Thumbnail Generation Failures Detected"
- [ ] Email contains event name
- [ ] Email lists failed slides with filenames
- [ ] Email shows error types/messages
- [ ] "View Event Dashboard" button present
- [ ] "Retry All Failed Thumbnails" button present
- [ ] Database: 3+ entries in `thumbnail_failure_log`

**Notes**:
```
Email Received Time: _______________
Email Recipient: _______________
Failures Count: _____
```

---

### ✅ Scenario 6: Webhook Processing
- [ ] Thumbnail generation initiated
- [ ] Webhook received within 2-3 minutes
- [ ] Signature verification passed
- [ ] Thumbnail downloaded from CloudConvert
- [ ] Thumbnail uploaded to R2
- [ ] Database updated atomically
- [ ] Database: `webhook_received_at` populated
- [ ] Database: `completed_at` matches webhook time
- [ ] R2: Thumbnail file exists
- [ ] Database: `thumbnail_r2_key` set

**Notes**:
```
Webhook Received: _______________
Processing Duration: _____ms
R2 Upload Success: _______________
```

---

### ✅ Scenario 7: Retroactive Generation (Batch)
- [ ] Event created with toggle DISABLED
- [ ] 10 slides uploaded
- [ ] Toggle enabled
- [ ] Background job queued all slides
- [ ] Progress indicator updates incrementally
- [ ] Thumbnails appear over 15-20 minutes
- [ ] Quota enforced (stops at 5 for free tier)
- [ ] Database: Slides transition incrementally
- [ ] Logs: Scheduled function executes

**Notes**:
```
Total Slides: 10
Completed: _____
Quota Exhausted At: _____
Processing Time: _____minutes
```

---

### ✅ Scenario 8: Performance Validation
- [ ] Slide upload: <1 second
- [ ] Thumbnail generation: <5 minutes
- [ ] Dashboard load (50 speeches): <2 seconds
- [ ] Quota API response: <500ms

**Measurements**:
```bash
# Quota endpoint performance
curl -X GET https://your-app.netlify.app/api/admin/thumbnails/quota \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -w "\nTime: %{time_total}s\n"

Expected: <0.5s
Actual: _____s
```

**Notes**:
```
Upload Time: _____ms
Generation Time: _____minutes
Dashboard Load: _____s
API Response: _____ms
```

---

### ✅ Scenario 9: Multi-Tenant Isolation
- [ ] Tenant A created with thumbnails
- [ ] Tenant B admin logged in
- [ ] Quota endpoint returns Tenant B's data
- [ ] Cannot access Tenant A's quota
- [ ] Cannot retry Tenant A's failed slide
- [ ] Returns 404 "Slide not found"
- [ ] RLS policies enforce tenant_id filtering
- [ ] No cross-tenant data leakage in logs

**Notes**:
```
Tenant A ID: _______________
Tenant B ID: _______________
Access Attempt Result: _______________
```

---

### ✅ Scenario 10: Unsupported File Types
- [ ] Word document (.docx) rejected
- [ ] Excel spreadsheet (.xlsx) rejected
- [ ] Plain text file (.txt) rejected
- [ ] Error: "Only supports PPT, PPTX, PDF"
- [ ] No quota consumed
- [ ] Status remains 'none'
- [ ] PPT file accepted and processed

**Notes**:
```
Unsupported Files Tested: _______________
Error Messages: _______________
Quota Impact: None
```

---

## Validation Summary

**Date Completed**: _______________
**Validated By**: _______________
**Environment**: _______________

### Results

- Scenarios Passed: _____ / 10
- Critical Issues Found: _____
- Non-Critical Issues Found: _____
- Performance Issues: _____

### Critical Issues

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Non-Critical Issues

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Overall Status

- [ ] **PASS** - All scenarios passed, ready for production
- [ ] **CONDITIONAL PASS** - Minor issues, can deploy with monitoring
- [ ] **FAIL** - Critical issues found, requires fixes before deployment

### Sign-Off

**Developer**: _______________
**Date**: _______________

**QA/Reviewer**: _______________
**Date**: _______________

---

## Next Steps After Validation

1. **If PASS**:
   - Deploy to production
   - Monitor CloudConvert API usage
   - Monitor email notification delivery
   - Set up alerts for quota exhaustion
   - Schedule Netlify function: `0 2 * * *` (daily at 2 AM UTC)

2. **If CONDITIONAL PASS**:
   - Document known issues in JIRA/Linear
   - Set up monitoring for specific scenarios
   - Plan bug fix sprint

3. **If FAIL**:
   - Log issues in bug tracker
   - Assign to developer for fixes
   - Re-validate after fixes applied
