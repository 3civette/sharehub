# Quickstart: Event Details Management

**Feature**: 005-ora-bisogna-implementare
**Created**: 2025-10-08
**Purpose**: End-to-end test scenario walkthrough for manual validation

## Overview

This quickstart guide walks through the **Primary User Story - Admin Workflow** from the feature specification (lines 66-77), demonstrating all major functionality of the Event Details Management feature.

## Prerequisites

- Backend running on `http://localhost:3001`
- Frontend running on `http://localhost:3000`
- Supabase instance configured
- Admin user authenticated
- At least one event created

## Test Scenario: Tech Summit 2025 Event

**Goal**: Create a fully enriched event with photos, sessions, speeches, slides, and access tokens.

**Event Details**:
- Name: "Tech Summit 2025"
- Date: 2025-10-15
- Visibility: Private
- Tenant: ACME Corp

---

## Step 1: Navigate to Event Edit Page

**Action**: Admin navigates to the event edit page

**URL**: `http://localhost:3000/admin/events/{eventId}/edit`

**Expected UI**:
- Event basic details (name, date, description)
- New tabs/sections for:
  - Photos
  - Sessions & Speeches
  - Slides
  - Access Tokens

---

## Step 2: Add Event Cover Image & Photos

### 2.1 Upload Cover Image

**Action**: Click "Upload Cover Image" button in Photos section

**API Call**:
```http
POST /api/events/{eventId}/photos
Content-Type: multipart/form-data

photo: tech-summit-cover.jpg (3.2 MB)
is_cover: true
```

**Expected Response** (201):
```json
{
  "id": "photo-1",
  "filename": "tech-summit-cover.jpg",
  "file_size": 3355443,
  "is_cover": true,
  "url": "https://.../event-photos/.../tech-summit-cover.jpg"
}
```

**Expected UI**:
- Cover image displayed prominently at top of Photos section
- "Set as Cover" button disabled for this photo
- "Delete" button available

**Validation**:
- [ ] Cover image displays correctly
- [ ] File size shown as "3.2 MB"
- [ ] Upload timestamp visible

---

### 2.2 Upload Gallery Images

**Action**: Click "Add Gallery Photo" button, upload 2 additional images

**API Calls**:
```http
POST /api/events/{eventId}/photos
photo: venue-exterior.jpg (2.1 MB)

POST /api/events/{eventId}/photos
photo: conference-hall.jpg (2.8 MB)
```

**Expected Responses** (201 each):
```json
{ "id": "photo-2", "filename": "venue-exterior.jpg", "display_order": 1, ... }
{ "id": "photo-3", "filename": "conference-hall.jpg", "display_order": 2, ... }
```

**Expected UI**:
- Gallery section shows 2 photos in order
- Drag-and-drop reordering UI available
- Each photo has "Set as Cover" and "Delete" buttons

**Validation**:
- [ ] Gallery photos display in correct order
- [ ] Can reorder photos via drag-and-drop
- [ ] Cover image remains separate from gallery

---

### 2.3 Change Cover Image

**Action**: Click "Set as Cover" on venue-exterior.jpg

**API Call**:
```http
PUT /api/events/{eventId}/photos/photo-2/set-cover
```

**Expected Response** (200):
```json
{
  "message": "Cover image updated",
  "photo": { "id": "photo-2", "is_cover": true },
  "previous_cover": { "id": "photo-1", "is_cover": false }
}
```

**Expected UI**:
- venue-exterior.jpg now displayed as cover
- tech-summit-cover.jpg moved to gallery as first item
- Gallery order: tech-summit-cover.jpg, conference-hall.jpg

**Validation**:
- [ ] Cover image changed correctly
- [ ] Previous cover moved to gallery
- [ ] Display order maintained

---

## Step 3: Create Sessions with Schedule

### 3.1 Create Morning Keynote Session

**Action**: Click "Add Session" button

**Form Data**:
- Title: "Morning Keynote Session"
- Description: "Opening keynotes with industry leaders"
- Scheduled Time: 2025-10-15 09:00 AM

**API Call**:
```http
POST /api/events/{eventId}/sessions
Content-Type: application/json

{
  "title": "Morning Keynote Session",
  "description": "Opening keynotes with industry leaders",
  "scheduled_time": "2025-10-15T09:00:00Z"
}
```

**Expected Response** (201):
```json
{
  "id": "session-1",
  "title": "Morning Keynote Session",
  "scheduled_time": "2025-10-15T09:00:00Z",
  "display_order": null,
  "speech_count": 0
}
```

**Expected UI**:
- Session card appears in Sessions list
- Shows scheduled time "9:00 AM"
- Shows "0 speeches" indicator
- "Add Speech" button available

**Validation**:
- [ ] Session created successfully
- [ ] Scheduled time displays correctly
- [ ] Can expand/collapse session details

---

### 3.2 Create Afternoon Workshop Session

**Action**: Click "Add Session" button again

**Form Data**:
- Title: "Afternoon Technical Workshops"
- Description: "Hands-on technical deep dives"
- Scheduled Time: 2025-10-15 02:00 PM

**API Call**:
```http
POST /api/events/{eventId}/sessions

{
  "title": "Afternoon Technical Workshops",
  "description": "Hands-on technical deep dives",
  "scheduled_time": "2025-10-15T14:00:00Z"
}
```

**Expected Response** (201):
```json
{
  "id": "session-2",
  "title": "Afternoon Technical Workshops",
  "scheduled_time": "2025-10-15T14:00:00Z",
  "display_order": null
}
```

**Expected UI**:
- Both sessions displayed in chronological order
- Morning session listed first (9:00 AM)
- Afternoon session listed second (2:00 PM)

**Validation**:
- [ ] Sessions ordered chronologically
- [ ] Both sessions visible
- [ ] Time display format consistent

---

## Step 4: Add Speeches to Sessions

### 4.1 Add First Speech to Morning Session

**Action**: Click "Add Speech" in Morning Keynote Session

**Form Data**:
- Title: "The Future of Artificial Intelligence"
- Speaker Name: "Dr. Jane Smith"
- Duration: 45 minutes
- Description: "Exploring emerging AI trends and their societal impact"
- Scheduled Time: 2025-10-15 09:15 AM

**API Call**:
```http
POST /api/sessions/session-1/speeches

{
  "title": "The Future of Artificial Intelligence",
  "speaker_name": "Dr. Jane Smith",
  "duration": 45,
  "description": "Exploring emerging AI trends and their societal impact",
  "scheduled_time": "2025-10-15T09:15:00Z"
}
```

**Expected Response** (201):
```json
{
  "id": "speech-1",
  "session_id": "session-1",
  "title": "The Future of Artificial Intelligence",
  "speaker_name": "Dr. Jane Smith",
  "duration": 45,
  "scheduled_time": "2025-10-15T09:15:00Z",
  "slide_count": 0
}
```

**Expected UI**:
- Speech card appears under Morning Keynote Session
- Shows speaker name, duration, scheduled time
- "Upload Slides" button available
- Session shows "1 speech" indicator

**Validation**:
- [ ] Speech created successfully
- [ ] Speaker name and duration displayed
- [ ] Scheduled time shows "9:15 AM"

---

### 4.2 Add Second Speech to Morning Session

**Action**: Click "Add Speech" in Morning Keynote Session again

**Form Data**:
- Title: "Cloud Computing: State of the Industry"
- Speaker Name: "John Doe"
- Duration: 30 minutes
- Scheduled Time: 2025-10-15 10:00 AM

**API Call**:
```http
POST /api/sessions/session-1/speeches

{
  "title": "Cloud Computing: State of the Industry",
  "speaker_name": "John Doe",
  "duration": 30,
  "scheduled_time": "2025-10-15T10:00:00Z"
}
```

**Expected UI**:
- Both speeches displayed in chronological order
- AI speech first (9:15 AM)
- Cloud speech second (10:00 AM)
- Session shows "2 speeches"

**Validation**:
- [ ] Speeches ordered chronologically
- [ ] Session count updated to "2 speeches"

---

### 4.3 Add Speech to Afternoon Session

**Action**: Add speech to Afternoon Technical Workshops

**Form Data**:
- Title: "Kubernetes Best Practices"
- Speaker Name: "Sarah Johnson"
- Duration: 60 minutes
- Scheduled Time: 2025-10-15 02:15 PM

**API Call**:
```http
POST /api/sessions/session-2/speeches

{
  "title": "Kubernetes Best Practices",
  "speaker_name": "Sarah Johnson",
  "duration": 60,
  "scheduled_time": "2025-10-15T14:15:00Z"
}
```

**Validation**:
- [ ] Speech created in correct session
- [ ] Session shows "1 speech"

---

## Step 5: Upload Slide Files for Each Speech

### 5.1 Upload Slides for AI Speech

**Action**: Click "Upload Slides" in "The Future of AI" speech

**Files to Upload**:
1. ai-trends-2025.pdf (2.3 MB)
2. ai-case-studies.pptx (4.1 MB)

**API Calls**:
```http
POST /api/speeches/speech-1/slides
Content-Type: multipart/form-data

file: ai-trends-2025.pdf

POST /api/speeches/speech-1/slides
file: ai-case-studies.pptx
```

**Expected Responses** (201 each):
```json
{
  "id": "slide-1",
  "speech_id": "speech-1",
  "filename": "ai-trends-2025.pdf",
  "file_size": 2411724,
  "mime_type": "application/pdf",
  "display_order": 0,
  "metadata": {
    "speaker_name": "Dr. Jane Smith",
    "speech_title": "The Future of Artificial Intelligence",
    "formatted_size": "2.3 MB"
  }
}
```

**Expected UI**:
- Slide list appears under speech
- Each slide shows:
  - Filename
  - File size
  - Speaker name
  - Speech title
  - Download button
- Speech shows "2 slides" indicator

**Validation**:
- [ ] Slides uploaded successfully
- [ ] Metadata displayed correctly
- [ ] Download buttons functional

---

### 5.2 Upload Slides for Cloud Speech

**Action**: Upload slides for "Cloud Computing" speech

**Files**:
- cloud-architecture.pdf (3.5 MB)

**API Call**:
```http
POST /api/speeches/speech-2/slides
file: cloud-architecture.pdf
```

**Validation**:
- [ ] Slide uploaded successfully
- [ ] Speech shows "1 slide"
- [ ] Metadata includes "John Doe" as speaker

---

### 5.3 Test File Validation

**Action**: Attempt to upload invalid files

**Test Cases**:

1. **File too large**:
```http
POST /api/speeches/speech-1/slides
file: huge-presentation.pdf (55 MB)
```

**Expected Response** (413):
```json
{
  "error": "File too large",
  "max_size": 52428800
}
```

2. **Invalid format**:
```http
POST /api/speeches/speech-1/slides
file: presentation.exe
```

**Expected Response** (415):
```json
{
  "error": "Invalid file type",
  "allowed_types": ["application/pdf", "application/vnd.ms-powerpoint", ...]
}
```

**Validation**:
- [ ] File size validation working
- [ ] Format validation working
- [ ] Error messages clear and helpful

---

## Step 6: Generate and Manage Access Tokens

### 6.1 Generate Participant Token

**Action**: Navigate to "Access Tokens" tab, click "Generate Token"

**Form Data**:
- Type: Participant
- Expires: 2025-10-20 11:59 PM

**API Call**:
```http
POST /api/events/{eventId}/tokens

{
  "type": "participant",
  "expires_at": "2025-10-20T23:59:59Z"
}
```

**Expected Response** (201):
```json
{
  "id": "token-1",
  "token": "abc123xyz789def456ghi",
  "type": "participant",
  "expires_at": "2025-10-20T23:59:59Z",
  "use_count": 0,
  "is_active": true,
  "url": "https://acme-corp.sharehub.com/events/tech-summit-2025?token=abc123xyz789def456ghi"
}
```

**Expected UI**:
- Token card appears in token list
- Shows token value (partially masked: `abc123...456ghi`)
- Shows expiration date
- Shows "Active" status badge
- "Copy URL" button available
- "Generate QR Code" button available
- "Revoke" button available

**Validation**:
- [ ] Token created successfully
- [ ] Expiration date displayed correctly
- [ ] Status badge shows "Active"

---

### 6.2 Generate QR Code for Token

**Action**: Click "Generate QR Code" for the participant token

**API Call**:
```http
GET /api/events/{eventId}/tokens/token-1/qr?size=400
```

**Expected Response** (200):
```json
{
  "token_id": "token-1",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "format": "png",
  "size": 400,
  "url": "https://acme-corp.sharehub.com/events/tech-summit-2025?token=abc123xyz789def456ghi"
}
```

**Expected UI**:
- Modal/dialog opens showing QR code
- QR code image displayed (400x400 px)
- URL displayed below QR code
- "Download QR Code" button
- "Close" button

**Validation**:
- [ ] QR code renders correctly
- [ ] Can download QR code as image
- [ ] Scanning QR code with phone opens correct URL

---

### 6.3 Copy Token URL to Clipboard

**Action**: Click "Copy URL" button for the token

**API Call**:
```http
GET /api/events/{eventId}/tokens/token-1/copy-url
```

**Expected Response** (200):
```json
{
  "token_id": "token-1",
  "url": "https://acme-corp.sharehub.com/events/tech-summit-2025?token=abc123xyz789def456ghi",
  "short_url": "https://acme-corp.sharehub.com/t/abc123xyz789def456ghi"
}
```

**Expected UI**:
- Success toast notification: "Token URL copied to clipboard!"
- Clipboard contains full URL

**Validation**:
- [ ] URL copied to clipboard
- [ ] Toast notification appears
- [ ] Pasting clipboard shows correct URL

---

### 6.4 Revoke Token

**Action**: Click "Revoke" button for the token

**API Call**:
```http
POST /api/events/{eventId}/tokens/token-1/revoke
```

**Expected Response** (200):
```json
{
  "message": "Token revoked successfully",
  "token": {
    "id": "token-1",
    "revoked_at": "2025-10-08T16:00:00Z",
    "is_active": false
  }
}
```

**Expected UI**:
- Token status badge changes to "Revoked"
- Revocation timestamp displayed
- "Revoke" button disabled
- "Generate QR Code" button disabled

**Validation**:
- [ ] Token status updated to "Revoked"
- [ ] Revocation timestamp visible
- [ ] Cannot generate QR code for revoked token

---

## Step 7: Preview Public Event Page

**Action**: Click "Preview Event" button in admin panel

**URL**: Opens `http://localhost:3000/events/tech-summit-2025` in new tab

**Expected Public Page Structure**:

### 7.1 Event Header
- Cover image displayed prominently
- Event title: "Tech Summit 2025"
- Event date: "October 15, 2025"
- Event description

### 7.2 Photo Gallery
- Cover image + 2 gallery images displayed
- Lightbox/carousel for viewing full-size images
- Navigation arrows to browse gallery

### 7.3 Sessions Section
- Both sessions listed in chronological order:
  1. **Morning Keynote Session (9:00 AM)**
     - Description visible
     - Expandable to show speeches
  2. **Afternoon Technical Workshops (2:00 PM)**
     - Description visible
     - Expandable to show speeches

### 7.4 Speeches within Sessions
When expanded, each session shows speeches:

**Morning Keynote Session**:
- **The Future of Artificial Intelligence (9:15 AM)**
  - Speaker: Dr. Jane Smith
  - Duration: 45 minutes
  - Description
  - Slides: 2 files
    - ai-trends-2025.pdf (2.3 MB) [Download button]
    - ai-case-studies.pptx (4.1 MB) [Download button]

- **Cloud Computing: State of the Industry (10:00 AM)**
  - Speaker: John Doe
  - Duration: 30 minutes
  - Slides: 1 file
    - cloud-architecture.pdf (3.5 MB) [Download button]

**Afternoon Technical Workshops**:
- **Kubernetes Best Practices (2:15 PM)**
  - Speaker: Sarah Johnson
  - Duration: 60 minutes
  - Slides: 0 files (No slides uploaded yet)

### 7.5 Token Gate (Private Event)
- Prompt: "This is a private event. Enter your access token to view content."
- Token input field
- "Access Event" button

**Validation**:
- [ ] All photos displayed correctly
- [ ] Sessions ordered chronologically
- [ ] Speeches ordered chronologically within sessions
- [ ] Slide download links functional
- [ ] Metadata displayed correctly (speaker, speech title, file size)
- [ ] Token gate appears (private event)

---

## Step 8: Test Token Access on Public Page

### 8.1 Generate New Participant Token

**Action**: In admin panel, generate a new participant token (since previous was revoked)

**Expected**: New token created with active status

### 8.2 Access Event with Valid Token

**Action**: On public page, enter token in input field and click "Access Event"

**API Call**:
```http
GET /api/tokens/validate?token=abc123xyz789def456ghi&event_id={eventId}
```

**Expected Response** (200):
```json
{
  "valid": true,
  "token_id": "token-2",
  "event_id": "{eventId}",
  "type": "participant"
}
```

**Expected UI**:
- Token gate disappears
- Full event content displays
- All slides become downloadable
- Success message: "Access granted!"

**Validation**:
- [ ] Token validation successful
- [ ] Content unlocked
- [ ] Can download slides

---

### 8.3 Test Revoked Token

**Action**: Revoke the token in admin panel, then try to access event with same token

**API Call**:
```http
GET /api/tokens/validate?token=abc123xyz789def456ghi
```

**Expected Response** (200):
```json
{
  "valid": false,
  "reason": "Token has been revoked"
}
```

**Expected UI**:
- Error message: "Token has been revoked. Please contact the event organizer."
- Content remains locked
- Token input field cleared

**Validation**:
- [ ] Revoked token rejected
- [ ] Error message displayed
- [ ] Content remains locked

---

## Step 9: Test Smart Ordering

### 9.1 Manual Reorder Sessions

**Action**: In admin panel, drag Afternoon session above Morning session

**API Call**:
```http
POST /api/events/{eventId}/sessions/reorder

{
  "session_ids": ["session-2", "session-1"],
  "update_scheduled_times": false
}
```

**Expected Response** (200):
```json
{
  "message": "Sessions reordered successfully",
  "sessions": [
    { "id": "session-2", "display_order": 0, "scheduled_time": "14:00" },
    { "id": "session-1", "display_order": 1, "scheduled_time": "09:00" }
  ],
  "warning": "Manual order set. Consider updating scheduled times to match this order.",
  "needs_time_update": true
}
```

**Expected UI**:
- Sessions reordered visually
- Warning banner appears: "Sessions are manually ordered but scheduled times don't match. Update scheduled times?"
- "Update Times" button available
- "Keep Manual Order" button available

**Validation**:
- [ ] Sessions reordered successfully
- [ ] Warning banner displayed
- [ ] Both buttons functional

---

### 9.2 Update Scheduled Time (Auto-Reorder)

**Action**: Edit Morning session, change scheduled time to 08:00 AM

**API Call**:
```http
PUT /api/sessions/session-1

{
  "scheduled_time": "2025-10-15T08:00:00Z"
}
```

**Expected Response** (200):
```json
{
  "id": "session-1",
  "scheduled_time": "2025-10-15T08:00:00Z",
  "display_order": null,
  "reordered": true,
  "message": "Scheduled time updated - sessions automatically reordered chronologically"
}
```

**Expected UI**:
- Morning session moves back to first position (8:00 AM)
- Afternoon session moves to second position (2:00 PM)
- Warning banner disappears
- Info toast: "Sessions automatically reordered by scheduled time"

**Validation**:
- [ ] Auto-reorder triggered
- [ ] Sessions in chronological order
- [ ] Warning banner removed

---

## Step 10: Test Cascade Deletion

### 10.1 Attempt to Delete Session with Speeches

**Action**: Click "Delete" on Morning Keynote Session (which has 2 speeches)

**API Call**:
```http
DELETE /api/sessions/session-1
```

**Expected Response** (400):
```json
{
  "error": "Cannot delete session with speeches",
  "message": "This session contains 2 speech(es). Remove or move all speeches before deleting the session.",
  "speech_count": 2,
  "speeches": [
    { "id": "speech-1", "title": "The Future of AI", "speaker_name": "Dr. Jane Smith" },
    { "id": "speech-2", "title": "Cloud Computing", "speaker_name": "John Doe" }
  ]
}
```

**Expected UI**:
- Error modal displays
- Shows list of 2 speeches
- Message: "This session contains 2 speeches. Remove or move all speeches before deleting the session."
- "Cancel" button only (no delete confirmation)

**Validation**:
- [ ] Session deletion blocked
- [ ] Error message clear
- [ ] Speech list displayed

---

### 10.2 Delete Speech with Slides (Confirmation)

**Action**: Click "Delete" on AI speech (which has 2 slides)

**API Call** (first attempt):
```http
DELETE /api/speeches/speech-1
```

**Expected Response** (200):
```json
{
  "requires_confirmation": true,
  "message": "This will delete 2 slide(s). Are you sure?",
  "slide_count": 2,
  "slides": [
    { "filename": "ai-trends-2025.pdf", "file_size": 2411724 },
    { "filename": "ai-case-studies.pptx", "file_size": 4300000 }
  ]
}
```

**Expected UI**:
- Confirmation dialog appears
- Message: "This will delete 2 slide(s). Are you sure?"
- Shows list of slides to be deleted
- "Cancel" and "Delete Speech" buttons

**Action**: User clicks "Delete Speech"

**API Call** (second attempt):
```http
DELETE /api/speeches/speech-1?confirm=true
```

**Expected Response** (200):
```json
{
  "message": "Speech deleted successfully",
  "deleted": {
    "speech_id": "speech-1",
    "title": "The Future of Artificial Intelligence",
    "slide_count": 2
  }
}
```

**Expected UI**:
- Speech removed from UI
- Session shows "1 speech" (down from 2)
- Success toast: "Speech and 2 slides deleted successfully"

**Validation**:
- [ ] Confirmation dialog appeared
- [ ] Speech deleted after confirmation
- [ ] Slides deleted from storage
- [ ] Session count updated

---

## Acceptance Criteria Checklist

### Event Photos
- [ ] Can upload cover image
- [ ] Can upload gallery images
- [ ] Can set any photo as cover
- [ ] Cannot delete cover if gallery exists (must set new cover first)
- [ ] File size validation (50 MB max)
- [ ] Format validation (JPG, PNG, WebP)
- [ ] Photos display on public page

### Sessions
- [ ] Can create sessions with scheduled times
- [ ] Sessions ordered chronologically by default
- [ ] Can manually reorder sessions
- [ ] Warning shown when manual order doesn't match scheduled times
- [ ] Updating scheduled time auto-reorders sessions
- [ ] Cannot delete session with speeches

### Speeches
- [ ] Can create speeches within sessions
- [ ] Speeches ordered chronologically within session
- [ ] Can manually reorder speeches
- [ ] Same smart ordering logic as sessions
- [ ] Deletion requires confirmation if slides exist
- [ ] Cascade deletes all slides

### Slides
- [ ] Can upload slides for speeches
- [ ] File size validation (50 MB max)
- [ ] Format validation (configurable per event)
- [ ] Metadata displayed (speaker name, speech title, file size)
- [ ] Download links work on public page
- [ ] No hard limit on slides per speech

### Access Tokens
- [ ] Can generate participant tokens
- [ ] Can generate QR codes
- [ ] Can copy URL to clipboard
- [ ] Can revoke tokens
- [ ] Revoked tokens cannot access event
- [ ] Token list shows active/revoked status

### Public Page
- [ ] Event photos displayed
- [ ] Sessions listed chronologically
- [ ] Speeches listed within sessions
- [ ] Slide download links available
- [ ] Token gate for private events
- [ ] Valid token grants access

---

## Performance Benchmarks

Expected performance (from PERFORMANCE_VALIDATION.md patterns):

- [ ] Event page load: < 1 second
- [ ] Photo upload (3 MB): < 5 seconds
- [ ] Slide upload (5 MB): < 8 seconds
- [ ] QR code generation: < 500 ms
- [ ] Session/speech list (20 items): < 300 ms render

---

## Cleanup

After testing, optionally clean up test data:

1. Delete all test slides (cascades from speeches)
2. Delete all test speeches (cascades from sessions)
3. Delete all test sessions
4. Delete all test photos
5. Revoke all test tokens
6. (Optional) Delete test event

---

## Success Criteria

Test is successful if:

1. All checklist items pass
2. No console errors during workflow
3. All API responses match expected schemas
4. Performance benchmarks met
5. Public page displays all content correctly
6. Token validation works for both valid and invalid tokens

---

**Status**: Ready for manual testing
**Estimated Duration**: 30-45 minutes for complete walkthrough
