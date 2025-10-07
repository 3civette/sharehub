# Feature Specification: Event Flow Management

**Feature Branch**: `003-ora-facciamo-il`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "ora facciamo il flow dell'evento: creazione, generazione token organizzatore e token partecipante, dashboard evento e pagina pubblica evento"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature focuses on: event creation, token generation, event dashboard, public event page
2. Extract key concepts from description
   → Actors: admin, organizers, participants
   → Actions: create event, generate tokens, view dashboard, access public page
   → Data: events, tokens, dashboard metrics
   → Constraints: token-based access control
3. Ambiguities marked where needed
4. User Scenarios defined
5. Functional Requirements generated
6. Key Entities identified
7. Review Checklist evaluated
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-07
- Q: Token expiration policy for private event access tokens? → A: Custom expiration set per-event by admin at creation
- Q: Dashboard event metrics to display for organizers? → A: Comprehensive metrics with tiered access (free plan=basic stats, premium plan=detailed stats)
- Q: Activity log tracking scope for event dashboard? → A: Uploads + downloads (track all file operations)
- Q: Can past events be edited or have new slides added? → A: Organizers can edit everything (details + slides), but event detail edits require double confirmation
- Q: Slide download mode for event pages? → A: Both options available (individual file download + bulk ZIP download)
- Q: Should tokens be downloadable as a file? → A: Yes - download as secure PDF with QR codes
- Q: What metadata should be displayed for uploaded slides? → A: Filename, upload date, file size, and associated speech/session title
- Q: Should slide deletion require confirmation? → A: Deferred - replaced by hierarchical structure decision
- Q: Event content organization structure? → A: Three-level hierarchy: Event contains Sessions, Sessions contain Speeches, Speeches contain Slides
- Q: Activity log retention period for access/download logs? → A: Customizable per-event from organizer dashboard
- Q: Rate limiting policy for downloads or page access? → A: Per-IP rate limiting: 100 requests/hour (basic abuse prevention)
- Q: Data retention policy for past events? → A: Configurable by admin per tenant (flexible retention policy)

---

## User Scenarios & Testing

### Primary User Story
An admin creates a new event (either public or private). For private events, the system generates unique tokens for organizers and participants. Organizers can manage the event through a dedicated dashboard showing event metrics, attendee activity, and slide uploads. Both organizers and participants can access the public event page to view event details and download slides.

### Acceptance Scenarios

1. **Given** an admin is logged in, **When** they create a new public event with name and date, **Then** the event is created and accessible via public URL

2. **Given** an admin is logged in, **When** they create a new private event with custom token expiration date, **Then** the system generates unique organizer and participant tokens valid until the specified expiration date and displays them for saving

3. **Given** an organizer has a valid token, **When** they access the event dashboard, **Then** they see event metrics, attendee list, and can manage slides

4. **Given** a participant has a valid token, **When** they access the event page, **Then** they can view event details and download available slides

5. **Given** an event is public, **When** anyone accesses the event URL, **Then** they can view event details without authentication

6. **Given** an event has slides uploaded, **When** a user with appropriate access visits the event page, **Then** they can download the slides

7. **Given** a private event token has expired, **When** someone tries to access the event with that token, **Then** they receive an error message indicating the token is no longer valid

8. **Given** an event date has passed and organizer wants to edit event details, **When** they attempt to change name/date/description, **Then** they must complete double confirmation process (checkbox + button) before changes are saved

9. **Given** an event date has passed and organizer wants to add slides, **When** they upload new slides, **Then** slides are added immediately without additional confirmation

10. **Given** an event has multiple slides, **When** a user visits the event page, **Then** they can download slides individually or click "Download All as ZIP" to get all slides in one archive

11. **Given** an organizer is managing an event, **When** they create a Session with title "Morning Keynotes", **Then** the session appears in the event dashboard and they can add Speeches to it

12. **Given** a Session exists, **When** organizer creates a Speech with title "Opening Remarks" and speaker "John Doe", **Then** the speech appears under the session and they can upload slides to it

13. **Given** a Speech has 5 slides uploaded, **When** a participant views the public event page, **Then** they see the hierarchical structure (Session > Speech) with all 5 slides listed under that speech

### Edge Cases
- What happens when someone tries to access a private event without a valid token?
- How does the system handle expired tokens?
- What happens if an organizer token is used multiple times from different locations?
- How does the dashboard behave when an event has no slides uploaded yet?
- What happens when an event date has passed?
- How are deleted events handled if someone has bookmarked the URL?
- What happens if admin sets token expiration date before event date?

## Requirements

### Functional Requirements

**Event Creation**
- **FR-001**: System MUST allow admins to create events with name, date, and description
- **FR-002**: System MUST support two event visibility modes: public and private
- **FR-003**: System MUST generate unique shareable URLs for each created event
- **FR-004**: For private events, system MUST generate two types of access tokens: organizer token and participant token
- **FR-005**: System MUST display generated tokens immediately after private event creation with clear warning that they cannot be retrieved later
- **FR-005a**: System MUST allow admins to set custom token expiration date during private event creation
- **FR-005b**: System MUST validate that token expiration date is not in the past
- **FR-006**: System MUST provide two methods for saving tokens: clipboard copy and PDF download
- **FR-006a**: Each token MUST have a "Copy" button for clipboard functionality
- **FR-006b**: System MUST provide "Download Tokens as PDF" button to generate secure document
- **FR-006c**: PDF MUST include event name, creation date, expiration date, and both tokens (organizer + participant)
- **FR-006d**: PDF MUST include QR codes for each token to enable easy mobile scanning
- **FR-006e**: QR codes MUST encode the full event URL with token parameter (e.g., `https://app.com/events/{id}?token={token}`)

**Token-Based Access**
- **FR-007**: System MUST validate tokens before granting access to private events
- **FR-007a**: System MUST check token expiration date and reject access if current date exceeds expiration
- **FR-008**: Organizer tokens MUST grant full event management permissions (view dashboard, upload slides, view metrics)
- **FR-009**: Participant tokens MUST grant read-only access (view event details, download slides)
- **FR-010**: Public events MUST be accessible without any token or authentication
- **FR-011**: System MUST display clear error messages when invalid or expired tokens are used
- **FR-012**: System MUST respect custom token expiration dates set by admin at event creation

**Content Hierarchy Management**
- **FR-012a**: System MUST support three-level content hierarchy: Event → Sessions → Speeches → Slides
- **FR-012b**: Each Event MUST allow creating multiple Sessions (e.g., "Morning Session", "Afternoon Workshop")
- **FR-012c**: Each Session MUST allow creating multiple Speeches (e.g., "Opening Keynote", "Technical Deep Dive")
- **FR-012d**: Each Speech MUST allow uploading multiple Slides (presentation files)
- **FR-012e**: Sessions and Speeches MUST be created/managed only by organizers (via organizer token)
- **FR-012f**: System MUST allow organizers to reorder Sessions within an Event
- **FR-012g**: System MUST allow organizers to reorder Speeches within a Session
- **FR-012h**: Each Session MUST have: title (required), description (optional), start time (optional)
- **FR-012i**: Each Speech MUST have: title (required), speaker name (optional), duration (optional), description (optional)
- **FR-012j**: Deletion of Session MUST require confirmation and cascade delete all contained Speeches and Slides
- **FR-012k**: Deletion of Speech MUST require confirmation showing slide count and cascade delete all contained Slides
- **FR-012l**: Deletion of individual Slide MUST require simple confirmation dialog

**Event Dashboard (Organizer View)**
- **FR-013**: System MUST provide a dashboard view accessible only to users with organizer tokens
- **FR-014**: Dashboard MUST display event summary information (name, date, visibility, creation date, token expiration date)
- **FR-014a**: Dashboard MUST show hierarchical content tree: expandable Sessions containing Speeches containing Slides
- **FR-014b**: Dashboard MUST display count summaries: total sessions, total speeches, total slides
- **FR-015**: Dashboard MUST show tiered event metrics based on tenant subscription plan
- **FR-015a**: For free plan tenants, dashboard MUST display basic metrics: total page view count and total slide download count
- **FR-015b**: For premium plan tenants, dashboard MUST display comprehensive metrics: page views, unique visitors, per-slide download counts, geographic distribution, device types, and access patterns timeline
- **FR-015c**: System MUST clearly indicate current plan tier and available metrics
- **FR-016**: Dashboard MUST display hierarchical structure with Sessions, Speeches, and Slides
- **FR-016a**: For each slide, system MUST display: filename, upload date/time, file size within its Speech context
- **FR-016b**: Dashboard MUST show breadcrumb navigation: Event > Session > Speech > Slides
- **FR-017**: Dashboard MUST allow organizers to create/edit/delete Sessions, Speeches, and upload Slides
- **FR-017a**: "Add Session" button MUST be available at Event level
- **FR-017b**: "Add Speech" button MUST be available within each Session
- **FR-017c**: "Upload Slides" button MUST be available within each Speech
- **FR-018**: Dashboard MUST implement cascading delete warnings for hierarchical content
- **FR-019**: Dashboard MUST show activity log tracking all file operations
- **FR-019a**: Activity log MUST record slide upload events with timestamp, uploader identity (organizer token), filename, and file size
- **FR-019b**: Activity log MUST record slide download events with timestamp, downloader type (organizer/participant token or anonymous for public), and filename
- **FR-019c**: Activity log MUST be displayed in reverse chronological order (newest first)

**Public Event Page**
- **FR-020**: System MUST provide a public event page displaying event information
- **FR-021**: Event page MUST show event name, date, description, and status (upcoming/past)
- **FR-021a**: Event page MUST display hierarchical agenda: Sessions with their Speeches
- **FR-021b**: Each Session section MUST show: session title, description (if any), start time (if any)
- **FR-021c**: Each Speech within session MUST show: speech title, speaker name (if any), duration (if any), description (if any)
- **FR-022**: Event page MUST display list of available slides organized by Speech
- **FR-023**: Event page MUST provide two download modes for slides
- **FR-023a**: System MUST allow individual slide download (one file at a time) with download button next to each slide
- **FR-023b**: System MUST provide "Download All as ZIP" button to package all event slides into a single ZIP archive
- **FR-023c**: ZIP download MUST organize slides in folders: `{SessionTitle}/{SpeechTitle}/{slides}`
- **FR-023d**: ZIP filename MUST follow pattern: `{event-name}-slides-{date}.zip`
- **FR-023e**: System MUST provide "Download Speech Slides" button at each Speech level for downloading only that speech's slides as ZIP
- **FR-024**: Event page MUST indicate whether event is public or private
- **FR-025**: For private events accessed with participant token, page MUST show limited information compared to organizer view
- **FR-026**: Event page MUST be mobile-responsive [NEEDS CLARIFICATION: specific mobile UX requirements?]

**Access Control**
- **FR-027**: System MUST prevent unauthorized access to private event dashboards
- **FR-028**: System MUST prevent unauthorized slide downloads from private events
- **FR-029**: System MUST log all access attempts with customizable retention period
- **FR-029a**: Dashboard MUST provide retention period selector with options: 30 days, 90 days, 1 year, or indefinite
- **FR-029b**: System MUST automatically purge activity logs older than the configured retention period
- **FR-029c**: Retention period setting MUST be accessible only to organizers via dashboard
- **FR-030**: System MUST implement per-IP rate limiting to prevent abuse
- **FR-030a**: System MUST limit requests to 100 per hour per IP address
- **FR-030b**: System MUST return HTTP 429 (Too Many Requests) when rate limit is exceeded
- **FR-030c**: System MUST include retry-after header indicating when requests can resume
- **FR-030d**: Rate limiting MUST apply to both public event pages and token-authenticated access

**Event Status Management**
- **FR-031**: System MUST automatically mark events as "past" after event date passes
- **FR-032**: Organizers MUST be able to continue managing past events (upload/delete slides, edit event details)
- **FR-032a**: System MUST allow organizers to add new slides to past events without additional confirmation
- **FR-032b**: System MUST allow organizers to delete slides from past events with standard confirmation dialog
- **FR-032c**: System MUST require double confirmation when organizers edit event details (name, date, description) of past events
- **FR-032d**: Double confirmation MUST display warning message: "You are editing a past event. This will affect all shared URLs and tokens. Confirm to proceed."
- **FR-032e**: First confirmation requires checking a checkbox "I understand this affects existing links", second confirmation requires clicking "Confirm Changes" button
- **FR-033**: System MUST support configurable data retention policy for past events per tenant
- **FR-033a**: Admin panel MUST provide retention policy selector with options: keep forever, archive after 1 year, delete after 2 years
- **FR-033b**: System MUST warn admins 30 days before automatic deletion of past events based on retention policy
- **FR-033c**: System MUST allow admins to manually delete individual past events at any time with confirmation
- **FR-033d**: Archived events MUST remain viewable but prevent new uploads or modifications

### Key Entities

- **Event**: Represents a created event with name, date, description, visibility (public/private), status (upcoming/past/archived), creation timestamp, token expiration date (for private events), retention policy, and associated tenant. Contains multiple Sessions.
- **Session**: Represents a time block or thematic grouping within an event with title (required), description (optional), start time (optional), display order, and associated event. Contains multiple Speeches.
- **Speech**: Represents an individual presentation within a session with title (required), speaker name (optional), duration (optional), description (optional), display order, and associated session. Contains multiple Slides.
- **Slide**: Represents uploaded presentation file with filename, upload timestamp, file size, uploader reference, display order, and associated speech.
- **Access Token**: Represents authentication token for private events with type (organizer/participant), expiration date (custom per event), associated event, and usage tracking
- **Event Metrics**: Represents analytics data for event with basic metrics (page view count, slide download count) and premium metrics (unique visitor count, per-slide downloads, per-speech downloads, geographic data, device types, access timestamps) visible based on tenant plan tier
- **Activity Log**: Represents audit trail of file operations with timestamp, actor type (organizer token/participant token/anonymous), action type (upload/download), filename, file size (for uploads), associated speech/session context, associated event, and retention period configuration (30 days / 90 days / 1 year / indefinite)
- **Subscription Plan**: Represents tenant's billing tier (free/premium) that determines available metrics and features

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all 11 clarifications resolved)
- [x] Requirements are testable and unambiguous (hierarchical structure clearly defined)
- [x] Success criteria are measurable (yes - event created with sessions/speeches/slides hierarchy, tokens generated with PDF/QR, dashboard with tree view, metrics tiered by plan, activity logged with configurable retention, rate limiting implemented, past events editable with safeguards and configurable retention policy, flexible download options)
- [x] Scope is clearly bounded (event flow with 3-level content hierarchy from creation to public access with tiered analytics, file operation tracking with configurable retention, rate limiting, lifecycle management with configurable archival/deletion, and multi-level download modes)
- [x] Dependencies and assumptions identified (assumes existing admin authentication from feature 002 and tenant subscription plan)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Major design decision: hierarchical content structure (Event→Sessions→Speeches→Slides)
- [x] All ambiguities resolved (11 clarifications completed: token expiration, metrics tiering, activity tracking, past event editing, download modes, PDF tokens, slide metadata, content hierarchy, log retention, rate limiting, data retention)
- [x] User scenarios defined (13 scenarios including hierarchy management)
- [x] Requirements generated (79 functional requirements across 6 major categories)
- [x] Entities identified (8 key entities including Session and Speech)
- [x] Review checklist passed (specification complete and ready for planning phase)

---

## Notes

This feature builds upon the admin authentication and panel from feature 002. It focuses on the complete event lifecycle from creation through token generation to both organizer and participant experiences.

**Clarification Session Complete**: All 11 ambiguities have been resolved through structured clarification process on 2025-10-07. Key decisions include:
- Three-level content hierarchy (Event→Sessions→Speeches→Slides) replacing flat structure
- Custom token expiration per event
- Tiered metrics (free vs premium plans)
- PDF token distribution with QR codes
- Configurable activity log retention per event
- Per-IP rate limiting (100 req/hour)
- Configurable tenant-level data retention policy

**Ready for Planning Phase**: Specification is complete with 79 functional requirements, 13 acceptance scenarios, and 8 key entities. No remaining ambiguities. Ready to proceed with `/plan` command.
