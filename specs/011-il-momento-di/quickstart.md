# Quickstart: Public Event Page Verification

**Feature**: 011-il-momento-di
**Purpose**: Manual verification steps to confirm the public event page works correctly after implementation

## Prerequisites

- Frontend running on `http://localhost:3000`
- Supabase project configured with valid credentials
- Test data seeded (events, sessions, speeches, slides)
- R2 storage configured with presigned URL generation

## Test Data Setup

Before testing, ensure you have test data in the database:

```sql
-- Verify test event exists
SELECT id, slug, name, visibility FROM events WHERE slug = 'test-conference' LIMIT 1;

-- Verify sessions and speeches exist
SELECT
  s.id as session_id,
  s.name as session_name,
  sp.id as speech_id,
  sp.title as speech_title
FROM sessions s
JOIN speeches sp ON sp.session_id = s.id
WHERE s.event_id = (SELECT id FROM events WHERE slug = 'test-conference')
LIMIT 5;

-- Verify slides with R2 paths
SELECT id, filename, storage_path, file_type, file_size
FROM slides
WHERE speech_id IN (
  SELECT sp.id FROM speeches sp
  JOIN sessions s ON s.id = sp.session_id
  WHERE s.event_id = (SELECT id FROM events WHERE slug = 'test-conference')
)
LIMIT 5;
```

**If test data is missing**, seed it using the admin dashboard or SQL scripts.

---

## Verification Steps

### 1. Public Event Page Load

**Test**: Verify the event page loads without errors

**Steps**:
1. Open browser to `http://localhost:3000/events/test-conference`
2. Wait for page to fully load

**Expected Results**:
- ✅ Page loads successfully (no 404, no 500 errors)
- ✅ Event header displays with event name, date, description
- ✅ Sessions are listed chronologically
- ✅ Each session shows speeches and downloadable slides
- ✅ No console errors in browser DevTools

**Current Broken State**:
- ❌ 404 or 500 error
- ❌ "Failed to fetch event" error message
- ❌ Console shows: `GET /api/public/events/test-conference 404`

---

### 2. Session Organization

**Test**: Verify sessions are displayed in chronological order with filter buttons

**Steps**:
1. Load event page
2. Observe session order
3. If event has multiple tracks/topics, check for filter buttons

**Expected Results**:
- ✅ Sessions appear in chronological order (earliest first)
- ✅ Session cards show: name, time, speaker, description
- ✅ Filter buttons appear if tracks exist (optional)

---

### 3. Slide Download

**Test**: Verify individual slide downloads work

**Steps**:
1. Find a speech with slides
2. Click on a slide download link
3. Monitor browser downloads and network tab

**Expected Results**:
- ✅ Download starts immediately
- ✅ File saves with correct filename
- ✅ File opens correctly (PDF/PPT/PPTX viewer)
- ✅ Download count increments (check metrics section)

**Current Broken State**:
- ❌ Download link returns 404
- ❌ No presigned URL generated

---

### 4. Bulk Download (Session ZIP)

**Test**: Verify "Download all slides" button generates ZIP

**Steps**:
1. Find a session with multiple speeches/slides
2. Click "Download all slides" button
3. Wait for ZIP generation

**Expected Results**:
- ✅ Loading indicator appears during generation
- ✅ ZIP file downloads with format: `{event-name}-{session-name}.zip`
- ✅ ZIP contains all slides from that session
- ✅ Filenames preserved inside ZIP
- ✅ All files open correctly

**Current Broken State**:
- ❌ Button exists but does nothing (no backend route)
- ❌ 404 error on click

---

### 5. Event Metrics Display

**Test**: Verify metrics show accurate counts

**Steps**:
1. Load event page
2. Locate metrics section (usually near header)
3. Note download count
4. Download a slide
5. Refresh page

**Expected Results**:
- ✅ Total downloads count displays
- ✅ Page views shows 0 (placeholder for now)
- ✅ Download count increments after download

---

### 6. Private Event Access

**Test**: Verify token validation for private events

**Setup**:
```sql
-- Make event private
UPDATE events SET visibility = 'private' WHERE slug = 'test-conference';

-- Create test token
INSERT INTO access_tokens (event_id, token, token_type, expires_at)
VALUES (
  (SELECT id FROM events WHERE slug = 'test-conference'),
  'TESTTOKEN12345678901', -- 21 characters
  'multi_use',
  NOW() + INTERVAL '7 days'
);
```

**Steps**:
1. Open `http://localhost:3000/events/test-conference` (without token)
2. Observe access denied message
3. Enter token: `TESTTOKEN12345678901`
4. Click "Access Event"

**Expected Results**:
- ✅ Initial load shows token input form
- ✅ Form explains: "This is a private event"
- ✅ Valid token grants access to event page
- ✅ Invalid token shows error: "Invalid or expired token"

**Current Broken State**:
- ❌ Token validation endpoint missing (404)

---

### 7. Event Gallery

**Test**: Verify photos display correctly (Feature 005 integration)

**Steps**:
1. Scroll to photo gallery section
2. Click on a photo thumbnail

**Expected Results**:
- ✅ Photos display in grid layout
- ✅ Click opens lightbox with full-size image
- ✅ Lightbox has navigation (prev/next)
- ✅ Alt text and captions visible

---

### 8. Advertisement Banners

**Test**: Verify banners appear without disrupting layout (Feature 010 integration)

**Steps**:
1. Load event page
2. Observe banner placements

**Expected Results**:
- ✅ Banners appear at configured positions (header, content, footer)
- ✅ Layout remains stable (no layout shift)
- ✅ Clicking banner opens click URL in new tab

---

### 9. Mobile Responsiveness

**Test**: Verify responsive design on mobile viewport

**Steps**:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone SE" or similar (375px width)
4. Interact with page

**Expected Results**:
- ✅ All text readable without zooming (16px minimum)
- ✅ Touch targets are 44x44px minimum
- ✅ Session cards stack vertically
- ✅ "Back to top" button appears after scrolling
- ✅ Images scale appropriately
- ✅ No horizontal scrolling required

---

### 10. Performance Check

**Test**: Verify page loads within 2 seconds

**Steps**:
1. Open DevTools Network tab
2. Hard refresh page (Ctrl+Shift+R)
3. Check "Load" time at bottom of Network tab

**Expected Results**:
- ✅ Page load < 2000ms
- ✅ Images lazy-load progressively
- ✅ Critical content appears immediately

---

## Common Issues & Fixes

### Issue 1: "Failed to fetch event" Error
**Cause**: API route not implemented or returning error
**Fix**: Check `/api/public/events/[slug]/route.ts` exists and Supabase query works

### Issue 2: Slide Download Returns 404
**Cause**: R2 presigned URL not generated or expired
**Fix**: Verify `getPresignedUrl()` function in slide download route

### Issue 3: ZIP Download Fails
**Cause**: ZIP generation route missing or archiver not installed
**Fix**: Implement `/api/public/sessions/[id]/download-all` route

### Issue 4: Private Event Token Always Invalid
**Cause**: Token validation query not matching `access_tokens` table
**Fix**: Check token format (21 chars) and RLS policies on `access_tokens`

### Issue 5: Metrics Show Zero Downloads After Download
**Cause**: Download count not incrementing in database
**Fix**: Verify `UPDATE slides SET download_count = download_count + 1` in download route

---

## Success Criteria

All 10 verification steps pass ✅

**Definition of Done**:
- Public event page loads without errors
- Sessions display chronologically
- Slide downloads work (individual + bulk ZIP)
- Metrics update correctly
- Private events require valid tokens
- Gallery and banners integrate properly
- Mobile responsiveness verified
- Performance target met (<2s load)

---

## Next Steps After Verification

1. Run contract tests: `npm test tests/contract/publicEvents.test.ts`
2. Run E2E tests with Playwright (if configured)
3. Deploy to staging environment
4. Conduct user acceptance testing
5. Update documentation with production URLs
