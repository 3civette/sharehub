# Feature Specification: Event Details Management

**Feature Branch**: `005-ora-bisogna-implementare`
**Created**: 2025-10-08
**Status**: Ready for Planning
**Input**: User description: "ora bisogna implementare i dettagli dell'evento: alla pagina di modifica evento vanno aggiunti gli strumenti per aggiungere i dettagli ( foto, descrizione, sessioni, speach, caricamento sliiiiiiide , copppppppia e invio dei token ...) e implementare gli stessi dettagli nella pagina pubblica dell'evento"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Enhance event editing page with detailed content management
   → Feature: Display rich event details on public event page
2. Extract key concepts from description
   → Actors: Admin users (event editors), Public users (event viewers)
   → Actions: Add/edit event photos, manage sessions, manage speeches, upload slides, copy/send tokens
   → Data: Event images, sessions, speeches, slides, access tokens
   → Constraints: Admin-only editing, public viewing based on visibility
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: What types of event photos? Cover image, gallery, or both?]
   → [NEEDS CLARIFICATION: Can sessions be reordered? How is order determined?]
   → [NEEDS CLARIFICATION: What slide file types are supported?]
   → [NEEDS CLARIFICATION: What is the maximum file size for slides?]
   → [NEEDS CLARIFICATION: How many slides per speech? Any limit?]
   → [NEEDS CLARIFICATION: What does "copy and send tokens" mean exactly? Email? Copy to clipboard? Bulk generation?]
   → [NEEDS CLARIFICATION: Can speeches belong to multiple sessions?]
   → [NEEDS CLARIFICATION: Should session/speech order be editable?]
4. Fill User Scenarios & Testing section
   → Admin scenario: Create event, add sessions, add speeches, upload slides, generate tokens
   → Public scenario: View event details with photos, browse sessions/speeches, download slides
5. Generate Functional Requirements
   → Event image management, session/speech CRUD, slide uploads, token management
6. Identify Key Entities
   → Event (with images), Session, Speech, Slide, AccessToken
7. Run Review Checklist
   → WARN "Spec has multiple [NEEDS CLARIFICATION] items - requires user input"
8. Return: SUCCESS (spec ready for clarification and planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-08
- Q: When a session has speeches and an admin attempts to delete the session, what should happen? → A: Prevent deletion - show error message requiring speeches to be moved/deleted first
- Q: Can a speech belong to multiple sessions, or is it strictly one speech per session? → A: One session only - each speech belongs to exactly one session
- Q: What file formats should be supported for slide uploads? → A: PDF + PowerPoint (PPTX, PPT), customizable per event in dashboard
- Q: What does "copy and send tokens" mean for token distribution? → A: Copy to clipboard + QR code generation for participant tokens
- Q: How should sessions/speeches be ordered within an event? → A: Chronological by scheduled time (default), with manual reordering. When manually reordered, prompt to update scheduled time. When time changes, auto-reorder.
- Q: What is the maximum file size limit for slide uploads? → A: 50 MB per file
- Q: When a speech is deleted, what should happen to its associated slides? → A: Cascade delete all associated slides, but show confirmation dialog with count of slides to be deleted
- Q: Should the system support a single event cover image or multiple gallery images? → A: Both - one primary cover image (required) + optional gallery images
- Q: What is the maximum number of slides allowed per speech? → A: No hard limit - rely on storage capacity and practical usage
- Q: What metadata should be displayed for each slide? → A: Filename + file size + associated speech data (speaker name, title)

---

## User Scenarios & Testing

### Primary User Story - Admin Workflow
**As an admin**, I want to enrich my event with detailed content (images, sessions, speeches, slides, and access tokens) so that attendees can access comprehensive event materials through a public page.

**Admin Journey:**
1. Navigate to event edit page
2. Add event cover image/photos
3. Create sessions with titles, descriptions, and schedule
4. Add speeches to sessions with speaker details and descriptions
5. Upload slide files for each speech
6. Generate and manage access tokens for private events
7. Preview how the event appears on the public page

### Primary User Story - Public Viewer Workflow
**As a public user**, I want to view event details including photos, sessions, speeches, and downloadable slides so that I can access event content organized by structure.

**Viewer Journey:**
1. Access public event page via URL
2. View event images and description
3. Browse sessions with scheduled times
4. Explore speeches within each session
5. Download individual slides or batch download
6. (If private) Enter access token to unlock content

### Acceptance Scenarios

#### Admin - Event Photo Management
1. **Given** I am editing an event, **When** I upload a cover image, **Then** it becomes the primary event image displayed on both edit page and public page
2. **Given** I have a cover image, **When** I upload additional gallery images, **Then** they are displayed as a photo gallery on the public page
3. **Given** I have uploaded photos, **When** I delete a photo, **Then** it is removed from storage and no longer displayed
4. **Given** I upload an invalid file (exceeds 50 MB or unsupported format), **When** the validation fails, **Then** I see a clear error message specifying the reason

#### Admin - Session Management
1. **Given** I am editing an event, **When** I create a new session with title, description, and scheduled time, **Then** the session appears in the event structure
2. **Given** I have existing sessions, **When** I edit a session's details, **Then** changes are reflected on the public page
3. **Given** I have multiple sessions, **When** I manually reorder them, **Then** the system prompts me to update the scheduled time to match the new order
4. **Given** I have multiple sessions, **When** I change a session's scheduled time, **Then** sessions automatically reorder chronologically
5. **Given** a session has speeches, **When** I attempt to delete it, **Then** the system prevents deletion and displays an error message requiring all speeches to be moved or deleted first

#### Admin - Speech Management
1. **Given** I have a session, **When** I add a speech with speaker name, title, duration, and description, **Then** it appears within that session
2. **Given** I have a speech, **When** I upload slide files (PDF, PPTX, PPT), **Then** slides are associated with the speech and format is validated against event settings
3. **Given** I have a speech with slides, **When** I attempt to delete it, **Then** the system shows a confirmation dialog stating "This will delete X slides. Are you sure?" and deletes all slides if confirmed

#### Admin - Slide Upload
1. **Given** I am editing a speech, **When** I upload a slide file, **Then** it is stored and becomes downloadable on the public page
2. **Given** I am uploading multiple slides, **When** I upload them successfully, **Then** all slides are associated with the speech (no hard limit enforced)
3. **Given** I have uploaded slides, **When** I delete a slide, **Then** it is removed from storage and download links
4. **Given** I have uploaded slides, **When** I view the slide list, **Then** each slide displays filename (e.g., "presentation.pdf"), file size (e.g., "2.3 MB"), speaker name, and speech title

#### Admin - Token Management
1. **Given** my event is private, **When** I generate a token, **Then** I can copy it to clipboard and/or generate a QR code for easy participant access
2. **Given** I have generated tokens, **When** I view the token list, **Then** I see token details (value, expiry, usage count)
3. **Given** I have a token, **When** I revoke it, **Then** it becomes invalid for future access

#### Public User - Viewing Event Details
1. **Given** an event has photos, **When** I visit the public page, **Then** I see the event images displayed prominently
2. **Given** an event has sessions, **When** I view the page, **Then** sessions are displayed with their scheduled times and descriptions
3. **Given** a session has speeches, **When** I expand the session, **Then** I see all speeches with speaker details
4. **Given** a speech has slides, **When** I view the speech, **Then** I see a list of downloadable slides with filename, file size, speaker name, and speech title for context
5. **Given** a private event, **When** I enter a valid token, **Then** I gain access to all event content

### Edge Cases
- What happens when an admin uploads a file exceeding 50 MB? (Validation error displayed before upload starts)
- What happens when a session has no speeches? (Display empty session with message)
- What happens when a speech has no slides? (Display speech with no downloadable content)
- What happens to tokens when an event changes from private to public? (Existing tokens remain valid but unnecessary)
- How does the system handle concurrent edits by multiple admins? (Last write wins, no conflict resolution needed for MVP)
- What happens if a user downloads slides and the files are deleted before download completes? (Download fails with error)

## Requirements

### Functional Requirements

#### Event Photo Management
- **FR-001**: System MUST allow admins to upload event photos to enhance event presentation
- **FR-002**: System MUST display uploaded photos on both the admin edit page and public event page
- **FR-003**: System MUST allow admins to delete uploaded photos
- **FR-004**: System MUST validate uploaded photos for file type (JPG, PNG, WebP) and size (maximum 50 MB)
- **FR-005**: System MUST support one required primary cover image plus optional gallery images
- **FR-005b**: System MUST designate the first uploaded image as the cover image by default, with option to change cover image later

#### Session Management
- **FR-006**: System MUST allow admins to create sessions with title, description, and scheduled time
- **FR-007**: System MUST allow admins to edit existing session details
- **FR-008**: System MUST prevent deletion of sessions that contain speeches and display an error message instructing admin to move or delete speeches first
- **FR-009**: System MUST display sessions in chronological order by scheduled time (default sorting)
- **FR-010**: System MUST allow manual session reordering and prompt admin to update scheduled time when order changes
- **FR-010b**: System MUST automatically reorder sessions chronologically when a session's scheduled time is updated
- **FR-011**: System MUST associate sessions with their parent event

#### Speech Management
- **FR-012**: System MUST allow admins to create speeches within a session
- **FR-013**: System MUST capture speech details: speaker name, title, duration, description
- **FR-014**: System MUST allow admins to edit existing speeches
- **FR-015**: System MUST show a confirmation dialog when deleting a speech that has slides, displaying the count of slides to be deleted, and cascade delete all associated slides upon confirmation
- **FR-016**: System MUST enforce that each speech belongs to exactly one session (one-to-many relationship: session has many speeches, speech has one session)
- **FR-017**: System MUST display speeches in chronological order by scheduled time within each session (same smart ordering as sessions)

#### Slide Upload and Management
- **FR-018**: System MUST allow admins to upload slide files for each speech
- **FR-019**: System MUST accept slide files in PDF, PPTX, and PPT formats
- **FR-019b**: System MUST allow admins to customize allowed file formats per event in the event dashboard settings
- **FR-020**: System MUST enforce a maximum file size of 50 MB per slide upload
- **FR-021**: System MUST NOT enforce a hard limit on number of slides per speech (rely on storage capacity)
- **FR-022**: System MUST store slide files securely and generate download links for public users
- **FR-023**: System MUST allow admins to delete individual slides
- **FR-024**: System MUST display slide filename, file size, and associated speech data (speaker name and speech title) for each slide
- **FR-024b**: System MUST show speech context when displaying slides to help users identify content source

#### Token Management
- **FR-025**: System MUST provide copy-to-clipboard functionality for access tokens
- **FR-026**: System MUST generate QR codes for access tokens to facilitate easy participant scanning
- **FR-027**: System MUST display list of existing tokens with details (value, expiry, usage count, QR code)
- **FR-028**: System MUST allow admins to revoke tokens
- **FR-029**: System MUST track token usage (last used date, use count)

#### Public Event Page Display
- **FR-031**: System MUST display event photos on the public event page
- **FR-032**: System MUST display all sessions with their scheduled times and descriptions
- **FR-033**: System MUST display speeches within their respective sessions
- **FR-034**: System MUST display speaker details and speech descriptions
- **FR-035**: System MUST provide download links for all slides within each speech
- **FR-036**: System MUST respect event visibility settings (public vs private with token)
- **FR-037**: System MUST organize content hierarchically: Event → Sessions → Speeches → Slides

#### Integration with Existing System
- **FR-038**: System MUST integrate with existing event edit page (from Feature 002)
- **FR-039**: System MUST integrate with existing public event page (from Feature 004)
- **FR-040**: System MUST use existing RLS policies and access control mechanisms
- **FR-041**: System MUST maintain existing slide download and metrics tracking functionality

### Key Entities

- **Event**: Represents an event with enhanced details
  - Has: photos/images, basic info (name, date, description, visibility)
  - Contains: multiple sessions
  - Related to: access tokens (if private)

- **Session**: Time-based grouping of speeches within an event
  - Has: title, description, scheduled time, manual order override (optional)
  - Belongs to: one event
  - Contains: multiple speeches
  - Order: Chronological by scheduled time (default), with manual reordering that prompts for time update

- **Speech**: Individual presentation within a session
  - Has: title, speaker name, duration, description, scheduled time
  - Belongs to: exactly one session (one-to-many relationship)
  - Contains: multiple slides
  - Order: Chronological by scheduled time within session (same smart ordering behavior as sessions)

- **Slide**: Downloadable file associated with a speech
  - Has: filename, file path/URL, file size, file type
  - Belongs to: one speech
  - Stored: in secure storage with download URLs
  - Formats: PDF, PPTX, PPT (customizable per event)
  - Limits: Maximum 50 MB per file

- **AccessToken**: Token for private event access
  - Has: token value (21 chars), expiry date, usage count, last used timestamp, QR code representation
  - Grants access to: one event
  - Can be: generated, copied to clipboard, displayed as QR code, revoked

- **EventPhoto**: Image associated with an event
  - Has: image file, storage path, display order, is_cover flag
  - Belongs to: one event
  - Type: One primary cover image (is_cover=true) + optional gallery images (is_cover=false)
  - Formats: JPG, PNG, WebP
  - Limits: Maximum 50 MB per file

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain *(10 clarifications completed)*
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved *(10 clarifications completed)*
- [x] User scenarios defined and updated with clarifications
- [x] Requirements generated and finalized
- [x] Entities identified with complete metadata
- [x] Review checklist passed

---

**Status**: ✅ Specification complete and ready for planning phase (`/plan`)

All 10 clarification questions have been answered and integrated into the specification. The feature is now fully specified with:
- Complete functional requirements (FR-001 through FR-041)
- Detailed acceptance scenarios for all user workflows
- Clear entity definitions with metadata requirements
- Edge cases documented with resolutions
