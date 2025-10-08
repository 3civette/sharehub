# Quickstart: Event Management Dashboard

**Feature**: Event Management Dashboard
**Date**: 2025-10-08
**Purpose**: Manual validation of dashboard functionality

## Prerequisites

### Environment Setup
- ✅ Backend server running on `http://localhost:3001`
- ✅ Frontend server running on `http://localhost:3000`
- ✅ Supabase database accessible
- ✅ Test tenant configured with admin user
- ✅ Sample event created (with sessions, speeches, photos)

### Test Data Required
Before starting, ensure test database has:
1. **Test tenant**: `test-hotel` (or your tenant subdomain)
2. **Admin user**: Authenticated with valid JWT
3. **Private event**: With 2 access tokens (1 organizer, 1 participant)
4. **Public event**: For comparison (no tokens)
5. **3+ sessions**: With varying start times
6. **5+ speeches**: Distributed across sessions, with slides attached
7. **4+ photos**: Uploaded to event gallery

---

## Test Scenario 1: Dashboard Load & Navigation

### Steps
1. **Login as Admin**
   - Navigate to `http://localhost:3000/login`
   - Enter test admin credentials
   - Verify redirect to `/admin/dashboard`

2. **Navigate to Event Dashboard**
   - From main dashboard, click "Prossimi Eventi" section
   - Locate test private event
   - Click "Dashboard" or "Gestisci" button for the event
   - OR navigate directly to `/admin/events/{event-id}/dashboard`

3. **Verify Page Load**
   - ✅ Page loads within 2 seconds
   - ✅ No console errors in browser DevTools
   - ✅ All sections rendered (overview, tokens, sessions, speeches, photos, metrics)

**Expected Result**: Dashboard displays with all sections populated

---

## Test Scenario 2: Event Overview & Metrics

### Steps
1. **Verify Event Details**
   - Check event name displays correctly
   - Check event date formatted properly (readable format)
   - Check event status badge (upcoming/ongoing/past)
   - Check visibility indicator (public/private icon or badge)
   - Check description text (if provided)

2. **Verify Metrics Summary**
   - Check "Page Views" count displays (numeric)
   - Check "Slide Downloads" count displays (numeric)
   - Check "Participant Count" displays (numeric)
   - Verify metrics section shows "Last updated" timestamp

3. **Verify Navigation Links**
   - Click "Modifica Evento" (Edit Event) link
   - Verify redirect to `/admin/events/{id}/edit`
   - Navigate back to dashboard
   - Click "Vedi Pagina Pubblica" (View Public Page) link
   - Verify opens `/events/{slug}` in new tab

**Expected Result**: All event info and metrics display accurately

---

## Test Scenario 3: Token Management (Private Event)

### Steps
1. **Verify Token Section Visibility**
   - For private event: Token section displays
   - For public event: Token section hidden (test separately)

2. **Test Organizer Token Copy**
   - Locate "Organizer Token" card
   - Verify token string displayed (masked or full - check design)
   - Verify metadata: expiration date, use count, last used
   - Click "Copy" button next to organizer token
   - Check visual confirmation (toast/checkmark/feedback)
   - Open text editor and paste (Ctrl+V / Cmd+V)
   - ✅ Token string pasted correctly (21 characters)

3. **Test Participant Token Copy**
   - Locate "Participant Token" card
   - Click "Copy" button next to participant token
   - Check visual confirmation
   - Paste into text editor
   - ✅ Token string pasted correctly (21 characters, different from organizer)

4. **Test QR Code Download**
   - Locate "Download QR" button next to participant token
   - Click "Download QR" button
   - ✅ Browser initiates file download
   - Check downloaded file: `participant-token-{slug}.png`
   - Open PNG file
   - ✅ QR code image renders (300x300px)
   - Scan QR code with phone camera or QR reader app
   - ✅ QR contains URL: `http://localhost:3000/events/{slug}?token={token}`

5. **Verify Organizer Token Has No QR**
   - Check organizer token card
   - ✅ "Download QR" button NOT present (only for participant tokens)

**Expected Result**: Token copy and QR download work without errors

---

## Test Scenario 4: Session Management (Inline CRUD)

### Steps
1. **View Sessions List**
   - Scroll to "Sessions" section
   - ✅ Sessions display ordered by start time
   - ✅ Each session shows: title, start time, end time, room

2. **Add New Session**
   - Click "Add Session" button
   - Fill form:
     - Title: "Quickstart Test Session"
     - Start Time: Tomorrow 10:00 AM
     - End Time: Tomorrow 11:30 AM
     - Room: "Room B"
   - Click "Save" or "Create"
   - ✅ New session appears in list
   - ✅ No page reload (inline addition)
   - ✅ Success feedback displayed

3. **Edit Existing Session**
   - Click "Edit" icon on a session
   - Change title to "Updated Session Title"
   - Click "Save"
   - ✅ Session title updates inline
   - ✅ No page reload
   - ✅ Success feedback displayed

4. **Delete Session**
   - Click "Delete" icon on test session
   - Confirm deletion in dialog/prompt
   - ✅ Session removed from list
   - ✅ No page reload

**Expected Result**: All session CRUD operations work inline

---

## Test Scenario 5: Speech Management (Inline CRUD)

### Steps
1. **View Speeches List**
   - Scroll to "Speeches" section
   - ✅ Speeches organized by session (grouped display)
   - ✅ Each speech shows: title, speaker, session name, slide count

2. **Add New Speech**
   - Click "Add Speech" button (within a session or global)
   - Fill form:
     - Title: "Quickstart Test Speech"
     - Speaker: "Test Speaker"
     - Session: Select from dropdown
     - Description: (optional)
   - Click "Save"
   - ✅ New speech appears under selected session
   - ✅ Slide count shows 0 (no slides yet)
   - ✅ Success feedback displayed

3. **Edit Existing Speech**
   - Click "Edit" icon on a speech
   - Change speaker to "Updated Speaker Name"
   - Click "Save"
   - ✅ Speech updates inline
   - ✅ Success feedback displayed

4. **Verify Slide Count Display**
   - Check speech with attached slides
   - ✅ Slide count displays correct number
   - ✅ Slide count is read-only (no direct editing from dashboard)

5. **Delete Speech**
   - Click "Delete" icon on test speech
   - Confirm deletion
   - ✅ Speech removed from list

**Expected Result**: All speech CRUD operations work inline

---

## Test Scenario 6: Photo Gallery Management

### Steps
1. **View Photo Gallery**
   - Scroll to "Event Photos" section
   - ✅ Photos display in grid layout
   - ✅ Each photo shows thumbnail with optional caption

2. **Upload New Photo**
   - Click "Upload Photo" or "Add Photo" button
   - Select image file from computer (JPG/PNG, < 5MB)
   - Add optional caption: "Quickstart Test Photo"
   - Click "Upload"
   - ✅ Photo appears in gallery immediately
   - ✅ Thumbnail renders correctly
   - ✅ Caption displays if provided
   - ✅ Success feedback displayed

3. **Delete Photo**
   - Hover over test photo
   - Click "Delete" icon (X or trash icon)
   - Confirm deletion
   - ✅ Photo removed from gallery
   - ✅ Success feedback displayed

**Expected Result**: Photo upload and delete work inline

---

## Test Scenario 7: Empty States

### Steps
1. **Create New Event**
   - Create fresh event with no sessions/speeches/photos

2. **View Dashboard**
   - Navigate to dashboard for new empty event
   - ✅ "No sessions yet" message displays
   - ✅ "No speeches yet" message displays
   - ✅ "No photos yet" message displays
   - ✅ Each empty state includes "Add" prompt/button

3. **Verify Metrics for New Event**
   - ✅ Metrics show 0 for all counts (not error state)

**Expected Result**: Empty states handled gracefully with prompts

---

## Test Scenario 8: Cross-Tenant Security

### Steps
1. **Get Event ID from Different Tenant**
   - Use database or API to find event ID from another tenant
   - Copy event ID

2. **Attempt Dashboard Access**
   - Manually navigate to `/admin/events/{other-tenant-event-id}/dashboard`
   - ✅ 403 Forbidden error displayed
   - ✅ User redirected or shown "Access Denied" message
   - ✅ No event data leaked

3. **Attempt Token QR Download**
   - Get token ID from different tenant's event
   - Try accessing `/api/admin/events/{event}/tokens/{token}/qr`
   - ✅ 403 Forbidden response
   - ✅ No QR code generated

**Expected Result**: Tenant isolation enforced, cross-tenant access denied

---

## Test Scenario 9: Public Event (No Tokens)

### Steps
1. **Navigate to Public Event Dashboard**
   - Select public event (visibility='public')
   - Navigate to dashboard

2. **Verify Token Section Hidden**
   - Scroll through dashboard
   - ✅ "Tokens" or "Access Tokens" section NOT displayed
   - ✅ No token-related UI elements present

3. **Verify All Other Sections Work**
   - ✅ Event overview displays
   - ✅ Metrics display
   - ✅ Sessions/speeches/photos management works

**Expected Result**: Public events function fully without token section

---

## Test Scenario 10: Performance Validation

### Steps
1. **Measure Dashboard Load Time**
   - Open browser DevTools → Network tab
   - Clear cache
   - Navigate to dashboard
   - Check "Load" time in Network tab
   - ✅ Total load time < 2 seconds

2. **Measure Token Copy Speed**
   - Click copy button
   - Check feedback appears within 100ms
   - ✅ Instant response (< 100ms)

3. **Measure QR Download Speed**
   - Click download QR button
   - Time from click to download start
   - ✅ Download initiates within 500ms

4. **Test with Large Dataset**
   - Create event with 50 sessions, 200 speeches
   - Load dashboard
   - ✅ Page still responsive
   - ✅ Scrolling smooth

**Expected Result**: All operations meet performance targets

---

## Acceptance Criteria Summary

### Must Pass:
- [x] Dashboard loads within 2 seconds
- [x] All 6 sections render correctly (overview, metrics, tokens, sessions, speeches, photos)
- [x] Token copy works with visual confirmation
- [x] QR download generates valid PNG with correct content
- [x] Inline CRUD for sessions/speeches/photos works without page reload
- [x] Empty states display with helpful prompts
- [x] Tenant isolation enforced (403 for cross-tenant access)
- [x] Public events hide token section
- [x] Metrics display (even if 0)
- [x] No console errors during normal operation

### Nice to Have (Not Blocking):
- [ ] Animations/transitions smooth
- [ ] Responsive layout works on mobile
- [ ] Keyboard navigation accessible
- [ ] Loading states/skeletons display during data fetch

---

## Troubleshooting

### Issue: Dashboard returns 403 Forbidden
- **Check**: Admin user authenticated?
- **Check**: Event belongs to admin's tenant?
- **Fix**: Verify RLS policies enabled and admin table has correct tenant_id

### Issue: Token copy doesn't work
- **Check**: Browser console for clipboard API errors
- **Check**: HTTPS enabled? (required for clipboard API in production)
- **Fix**: Test on localhost (HTTP allowed) or enable HTTPS

### Issue: QR download fails
- **Check**: Backend logs for qrcode library errors
- **Check**: Token is participant type (not organizer)?
- **Fix**: Verify qrcode npm package installed and token type validation working

### Issue: Metrics show 0 for event with traffic
- **Check**: Metrics cache expiry (wait 5 minutes)
- **Check**: Metrics calculation queries return data
- **Fix**: Manually refresh cache or check event_views/slide_downloads tables

---

## Sign-Off

**Tested By**: _______________
**Date**: _______________
**Build**: _______________
**Result**: PASS / FAIL / PARTIAL

**Notes**:
