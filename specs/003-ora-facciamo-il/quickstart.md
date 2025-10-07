# Quickstart: Event Flow Management

**Feature**: 003-ora-facciamo-il
**Purpose**: End-to-end validation of event lifecycle from creation to public access
**Time**: ~15 minutes
**Prerequisites**: Feature 002 (Admin Panel) fully implemented and functional

---

## Overview

This quickstart walks through the complete event management flow:
1. Admin creates private event with tokens
2. Organizer accesses dashboard and builds content hierarchy
3. Organizer uploads slides to speeches
4. Participant accesses public event page
5. Participant downloads slides (individual + ZIP)
6. Organizer views metrics and activity log

---

## Setup

### 1. Start Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: PostgreSQL (Supabase local)
# Ensure Supabase is running with migrations applied
```

### 2. Verify Prerequisites

```bash
# Check admin authentication works (from feature 002)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test-hotel.com","password":"password123"}'

# Save the returned token
export ADMIN_TOKEN="<token-from-response>"
```

---

## Part 1: Create Private Event (Admin Flow)

### Step 1.1: Create Private Event

**Action**: Admin creates a private event for an executive summit

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -d '{
    "name": "Executive Summit 2025",
    "date": "2025-12-15",
    "description": "Annual leadership conference",
    "visibility": "private",
    "token_expiration_date": "2025-12-31T23:59:59Z"
  }'
```

**Expected Response** (201 Created):
```json
{
  "event": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "slug": "executive-summit-2025",
    "name": "Executive Summit 2025",
    "date": "2025-12-15",
    "visibility": "private",
    "status": "upcoming",
    "token_expiration_date": "2025-12-31T23:59:59.000Z",
    "created_at": "2025-10-07T10:00:00.000Z"
  },
  "tokens": {
    "organizer": "Abc123xyz789Def456ghi",
    "participant": "Xyz789abc123Ghi456def"
  }
}
```

**Validation**:
- ✅ Event created with unique ID and slug
- ✅ Status is 'upcoming'
- ✅ Two tokens generated (21 characters each)
- ✅ Token expiration is in the future

Save these values:
```bash
export EVENT_ID="f47ac10b-58cc-4372-a567-0e02b2c3d479"
export ORGANIZER_TOKEN="Abc123xyz789Def456ghi"
export PARTICIPANT_TOKEN="Xyz789abc123Ghi456def"
```

### Step 1.2: Download Tokens as PDF

**Action**: Admin downloads PDF with QR codes for distribution

```bash
curl -X GET "http://localhost:3001/api/events/$EVENT_ID/tokens/pdf" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -o tokens.pdf
```

**Expected Response**: PDF file downloaded

**Validation**:
- ✅ PDF contains event name "Executive Summit 2025"
- ✅ PDF contains creation date and expiration date
- ✅ PDF has 2 pages (organizer token + participant token)
- ✅ Each page has QR code encoding full event URL with token
- ✅ QR codes are scannable with mobile device

**Manual Verification**:
1. Open `tokens.pdf` in PDF viewer
2. Scan QR code with phone camera
3. Verify URL format: `http://localhost:3000/events/f47ac10b.../public?token=Abc123...`

---

## Part 2: Build Content Hierarchy (Organizer Flow)

### Step 2.1: Access Event Dashboard

**Action**: Organizer accesses dashboard using token

**Browser**: Navigate to `http://localhost:3000/events/executive-summit-2025/dashboard?token=Abc123xyz789Def456ghi`

**Expected UI**:
- Event header: "Executive Summit 2025" | Dec 15, 2025 | Private | Upcoming
- Empty state: "No sessions yet. Create your first session."
- "Add Session" button visible
- Metrics panel: Page views: 0 | Total downloads: 0
- Activity log: Empty

**Validation**:
- ✅ Dashboard loads without errors
- ✅ Token authenticated successfully
- ✅ Metrics display (free tier = basic only)
- ✅ Empty state messages appear

### Step 2.2: Create First Session

**Action**: Organizer creates "Morning Keynotes" session

**UI Steps**:
1. Click "Add Session" button
2. Fill form:
   - Title: "Morning Keynotes"
   - Description: "Opening session with leadership talks"
   - Start Time: 2025-12-15 09:00 AM
3. Click "Create Session"

**API Call** (automated by frontend):
```bash
curl -X POST "http://localhost:3001/api/events/$EVENT_ID/sessions?token=$ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Morning Keynotes",
    "description": "Opening session with leadership talks",
    "start_time": "2025-12-15T09:00:00Z",
    "display_order": 0
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "event_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "Morning Keynotes",
  "description": "Opening session with leadership talks",
  "start_time": "2025-12-15T09:00:00.000Z",
  "display_order": 0,
  "created_at": "2025-10-07T10:05:00.000Z"
}
```

**Validation**:
- ✅ Session card appears in dashboard
- ✅ Expandable tree view shows session
- ✅ "Add Speech" button available within session
- ✅ Display order is 0

Save session ID:
```bash
export SESSION_ID="a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
```

### Step 2.3: Create Speech Within Session

**Action**: Organizer creates "CEO Welcome" speech

**UI Steps**:
1. Click "Add Speech" within "Morning Keynotes" session
2. Fill form:
   - Title: "CEO Welcome Address"
   - Speaker: "Jane Smith"
   - Duration: 30 minutes
   - Description: "Opening remarks from our CEO"
3. Click "Create Speech"

**API Call**:
```bash
curl -X POST "http://localhost:3001/api/sessions/$SESSION_ID/speeches?token=$ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CEO Welcome Address",
    "speaker_name": "Jane Smith",
    "duration": 30,
    "description": "Opening remarks from our CEO",
    "display_order": 0
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
  "session_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "title": "CEO Welcome Address",
  "speaker_name": "Jane Smith",
  "duration": 30,
  "description": "Opening remarks from our CEO",
  "display_order": 0,
  "created_at": "2025-10-07T10:10:00.000Z"
}
```

**Validation**:
- ✅ Speech appears nested under session in tree view
- ✅ Breadcrumb navigation: Event > Morning Keynotes > CEO Welcome Address
- ✅ "Upload Slides" button available
- ✅ Speech shows speaker name and duration

Save speech ID:
```bash
export SPEECH_ID="b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e"
```

### Step 2.4: Upload Slide to Speech

**Action**: Organizer uploads presentation slides

**UI Steps**:
1. Click "Upload Slides" within "CEO Welcome Address" speech
2. Select file: `ceo-welcome.pdf` (must be < 100MB)
3. Drag to reorder (optional)
4. Click "Upload"

**API Call**:
```bash
curl -X POST "http://localhost:3001/api/speeches/$SPEECH_ID/slides?token=$ORGANIZER_TOKEN" \
  -F "file=@ceo-welcome.pdf" \
  -F "display_order=0"
```

**Expected Response** (201 Created):
```json
{
  "id": "c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f",
  "speech_id": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
  "filename": "ceo-welcome.pdf",
  "storage_path": "slides/f47ac10b.../ceo-welcome-uuid.pdf",
  "file_size": 2457600,
  "mime_type": "application/pdf",
  "display_order": 0,
  "uploaded_by": "organizer:Abc123xyz789Def456ghi",
  "uploaded_at": "2025-10-07T10:15:00.000Z"
}
```

**Validation**:
- ✅ Slide appears in speech card
- ✅ Metadata shown: filename, upload date, file size (2.4 MB)
- ✅ Activity log records upload event
- ✅ File uploaded to Supabase Storage

Save slide ID:
```bash
export SLIDE_ID="c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f"
```

### Step 2.5: Verify Activity Log

**Action**: Check activity log in dashboard

**Expected UI**:
- Activity log table with 1 entry:
  - Timestamp: 2025-10-07 10:15 AM
  - Actor: Organizer
  - Action: Upload
  - File: ceo-welcome.pdf (2.4 MB)
  - Context: Morning Keynotes > CEO Welcome Address

**Validation**:
- ✅ Log entries in reverse chronological order
- ✅ Session and speech titles displayed
- ✅ Organizer identity tracked

---

## Part 3: Participant Access (Public Event Page)

### Step 3.1: Access Event Page with Token

**Action**: Participant scans QR code or enters URL manually

**Browser**: Navigate to `http://localhost:3000/events/executive-summit-2025?token=Xyz789abc123Ghi456def`

**Expected UI**:
- Event header: "Executive Summit 2025" | December 15, 2025
- Description: "Annual leadership conference"
- Status badge: "Upcoming" (green)
- Visibility badge: "Private" (lock icon)
- Agenda section:
  - Session: "Morning Keynotes" | 9:00 AM
    - Speech: "CEO Welcome Address" | Jane Smith | 30 min
      - Slide: ceo-welcome.pdf (2.4 MB) | [Download] button

**Validation**:
- ✅ Page loads without authentication prompt (token valid)
- ✅ Hierarchical agenda displays correctly
- ✅ Slide download button visible
- ✅ "Download All as ZIP" button at bottom

### Step 3.2: Test Invalid Token

**Action**: Try accessing without token or with expired token

**Browser**: Navigate to `http://localhost:3000/events/executive-summit-2025` (no token)

**Expected UI**:
- Error page: "Access Denied"
- Message: "This is a private event. Please use a valid access token."
- No event details shown

**Validation**:
- ✅ Private event enforces token requirement
- ✅ Clear error message displayed

### Step 3.3: Download Individual Slide

**Action**: Participant downloads single slide

**UI Steps**:
1. Click "Download" button next to `ceo-welcome.pdf`
2. File downloads to browser

**API Call** (automated):
```bash
curl -X GET "http://localhost:3001/api/slides/$SLIDE_ID/download?token=$PARTICIPANT_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "download_url": "https://[supabase-storage]/slides/f47ac10b.../ceo-welcome-uuid.pdf?token=signed-url-token",
  "expires_at": "2025-10-07T11:15:00.000Z"
}
```

**Validation**:
- ✅ Signed URL returned (valid for 1 hour)
- ✅ File downloads successfully
- ✅ Activity log records download event with participant actor type

### Step 3.4: Download All Slides as ZIP

**Action**: Participant downloads all event slides in one archive

**UI Steps**:
1. Scroll to bottom of event page
2. Click "Download All as ZIP" button
3. Wait for ZIP generation (progress indicator)
4. File downloads: `executive-summit-2025-slides-2025-10-07.zip`

**API Call**:
```bash
curl -X GET "http://localhost:3001/api/events/$EVENT_ID/slides/download-all?token=$PARTICIPANT_TOKEN" \
  -o event-slides.zip
```

**Expected Response**: ZIP file stream (application/zip)

**ZIP Contents**:
```
executive-summit-2025-slides-2025-10-07.zip
└── Morning Keynotes/
    └── CEO Welcome Address/
        └── ceo-welcome.pdf
```

**Validation**:
- ✅ ZIP file created with hierarchical folder structure
- ✅ Folder names match session and speech titles
- ✅ All slides included
- ✅ File sizes match originals
- ✅ Activity log records bulk download

---

## Part 4: Organizer Dashboard Metrics (Post-Activity)

### Step 4.1: Refresh Dashboard

**Action**: Organizer refreshes dashboard to see updated metrics

**Browser**: Refresh `http://localhost:3000/events/executive-summit-2025/dashboard?token=Abc123xyz789Def456ghi`

**Expected UI** (Free Tier):
- **Basic Metrics**:
  - Page views: 2 (organizer dashboard + participant public page)
  - Total slide downloads: 2 (1 individual + 1 ZIP = 2 downloads)

**Expected UI** (Premium Tier):
- **Basic Metrics**: Same as above
- **Premium Metrics**:
  - Unique visitors: 2 (organizer IP + participant IP)
  - Per-slide downloads: ceo-welcome.pdf → 2
  - Geographic data: (chart showing country distribution)
  - Device types: Desktop: 2
  - Access timeline: (chart showing activity over time)

**Validation**:
- ✅ Metrics update in real-time
- ✅ Free tier shows only basic metrics
- ✅ Premium tier shows detailed analytics
- ✅ Plan tier badge displayed ("Free Plan" or "Premium Plan")

### Step 4.2: Verify Activity Log

**Expected Activity Log Entries** (newest first):
1. **10:20 AM** | Participant | Download | ceo-welcome.pdf | Morning Keynotes > CEO Welcome Address
2. **10:18 AM** | Participant | Download | Bulk ZIP (1 file) | Executive Summit 2025
3. **10:17 AM** | Participant | View | Event page | Executive Summit 2025
4. **10:15 AM** | Organizer | Upload | ceo-welcome.pdf (2.4 MB) | Morning Keynotes > CEO Welcome Address

**Validation**:
- ✅ All file operations logged
- ✅ Actor types distinguished (organizer vs participant)
- ✅ Hierarchical context shown (session > speech)
- ✅ File sizes included for uploads

### Step 4.3: Configure Activity Log Retention

**Action**: Organizer sets retention period to 90 days

**UI Steps**:
1. Scroll to "Activity Log Settings" section
2. Select dropdown: "Retention Period"
3. Choose "90 days"
4. Click "Save Settings"

**API Call**:
```bash
curl -X PUT "http://localhost:3001/api/events/$EVENT_ID/settings?token=$ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"retention_days": 90}'
```

**Validation**:
- ✅ Settings saved
- ✅ Confirmation message displayed
- ✅ Future logs will be purged after 90 days

---

## Part 5: Edge Cases & Validation

### Test 5.1: Rate Limiting

**Action**: Make 101 requests rapidly

```bash
for i in {1..101}; do
  curl -X GET "http://localhost:3001/api/events/$EVENT_ID/public?token=$PARTICIPANT_TOKEN"
done
```

**Expected**: After 100 requests, receive HTTP 429:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}
```

**Validation**:
- ✅ Rate limit enforced at 100 requests/hour per IP
- ✅ Retry-After header present
- ✅ Clear error message

### Test 5.2: Token Expiration

**Action**: Wait until token expiration date passes (or manually update in DB)

```sql
-- Manually expire token for testing
UPDATE access_tokens
SET expires_at = '2020-01-01T00:00:00Z'
WHERE token = 'Xyz789abc123Ghi456def';
```

**Browser**: Try accessing event page with expired token

**Expected UI**:
- Error page: "Token Expired"
- Message: "This access token has expired. Please contact the event organizer for a new link."

**Validation**:
- ✅ Expired tokens rejected
- ✅ Clear error message
- ✅ No event details leaked

### Test 5.3: Past Event Editing (Double Confirmation)

**Action**: Change event date to past, then try to edit

```bash
# Update event date to past
curl -X PUT "http://localhost:3001/api/events/$EVENT_ID" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -d '{"date": "2020-01-01"}'

# Try to edit without confirmation (should fail)
curl -X PUT "http://localhost:3001/api/events/$EVENT_ID" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -d '{"name": "Updated Name"}'
```

**Expected Response** (403 Forbidden):
```json
{
  "error": "Past event modification requires confirmation",
  "confirmation_required": true
}
```

**Action**: Retry with confirmation header

```bash
curl -X PUT "http://localhost:3001/api/events/$EVENT_ID" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H "X-Confirm-Past-Event: true" \
  -d '{"name": "Updated Name"}'
```

**Expected Response** (200 OK)

**Validation**:
- ✅ Past event edits require confirmation
- ✅ Confirmation header accepted
- ✅ Frontend shows double confirmation UI (checkbox + button)

### Test 5.4: Cascading Delete

**Action**: Delete session and verify cascade

```bash
curl -X DELETE "http://localhost:3001/api/sessions/$SESSION_ID?token=$ORGANIZER_TOKEN"
```

**Expected**:
- Session deleted
- Speech deleted (cascade)
- Slide deleted (cascade)
- Activity log entries remain (with NULL references)

**Validation**:
- ✅ Cascade delete works
- ✅ No orphaned records
- ✅ Files deleted from Supabase Storage
- ✅ Confirmation dialog shown in UI

---

## Success Criteria

### Functional Validation ✅
- [x] Event created with public/private visibility
- [x] Tokens generated for private events
- [x] PDF with QR codes downloads successfully
- [x] Three-level hierarchy works (Event → Session → Speech → Slide)
- [x] Files upload to Supabase Storage
- [x] Organizer dashboard shows metrics and activity log
- [x] Participant can access with valid token
- [x] Individual slide download works
- [x] Bulk ZIP download with folder structure
- [x] Rate limiting enforced (100 req/hour)
- [x] Token expiration validated
- [x] Past event editing requires double confirmation
- [x] Cascade delete works correctly

### Performance Validation ✅
- [x] Event page loads < 1s
- [x] Slide upload < 10s for 50MB file
- [x] ZIP generation < 3s for 5 slides
- [x] Dashboard metrics < 500ms
- [x] API response times < 200ms p95

### Security Validation ✅
- [x] RLS policies prevent cross-tenant access
- [x] Invalid tokens rejected
- [x] Expired tokens rejected
- [x] Organizer/participant permissions enforced
- [x] File upload size limits enforced (100MB)
- [x] File type validation works

---

## Troubleshooting

### Issue: Token validation fails
**Solution**: Check `access_tokens` table in Supabase, verify token exists and `expires_at` is in future

### Issue: File upload fails
**Solution**: Check Supabase Storage bucket `slides` exists and has correct RLS policies

### Issue: ZIP download empty
**Solution**: Verify slides have correct `storage_path` and files exist in Supabase Storage

### Issue: Metrics not updating
**Solution**: Check `event_metrics` table exists and RLS policies allow updates

### Issue: Rate limiting not working
**Solution**: Ensure Redis is running (production) or memory store is enabled (development)

---

## Next Steps

After completing this quickstart:
1. Run contract tests: `npm test` in `backend/tests/contract/`
2. Run integration tests: `npm test` in `frontend/tests/integration/`
3. Load test with 1000 concurrent users
4. Deploy to staging environment
5. Conduct UAT with real users

---

**Completion Time**: 15 minutes
**Result**: Feature 003 fully validated end-to-end ✅
