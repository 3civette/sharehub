# Feature Specification: Event Management Dashboard

**Feature Branch**: `005-ora-facciamo-la`
**Created**: 2025-10-08
**Status**: Draft
**Input**: User description: "ora facciamo la dashboard dell'evento (dove si possono copiare i token tra le altre cose)"

## Clarifications

### Session 2025-10-08
- Q: What is the scope of the event dashboard? → A: Comprehensive hub - Event info, tokens, plus embedded lists/management of sessions, speeches, and photos all on one page
- Q: Should the dashboard display QR codes for access tokens? → A: No inline QR display. Text copy for both tokens. Participant token gets "download" button to generate QR code file/image
- Q: Should the dashboard show event metrics, and if so, which ones? → A: Cached summary metrics - Static counts refreshed periodically (page views, slide downloads, total participants)
- Q: Should the dashboard provide bulk actions for event content? → A: No - Only individual item management, no bulk operations
- Q: Can admins regenerate or manage token expiration from the dashboard? → A: no
- Q: Should there be visual warnings when tokens are about to expire? → A: No - Just display expiration date, no special warnings

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Event-specific dashboard for managing individual events
2. Extract key concepts from description
   → Actors: Admin users managing events
   → Actions: View event details, copy tokens, manage event resources
   → Data: Event information, access tokens, event metrics
   → Constraints: Admin must own the event (tenant-based access)
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: What other management actions besides copying tokens?]
   → [NEEDS CLARIFICATION: Should dashboard show real-time metrics or static data?]
   → [NEEDS CLARIFICATION: What happens when tokens are copied - just clipboard or other actions?]
4. Fill User Scenarios & Testing section
   → Primary flow: Admin navigates to event dashboard, views details, copies tokens
5. Generate Functional Requirements
   → Token management, event overview, navigation, security
6. Identify Key Entities
   → Event, AccessToken, Session, Speech, EventPhoto, Slide
7. Run Review Checklist
   → WARN "Spec has uncertainties - marked for clarification"
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As an event organizer, I need a comprehensive dashboard for each event where I can view all event details at a glance, copy access tokens to share with participants, and manage all event-specific resources (sessions, speeches, photos) in one centralized location. This eliminates the need to navigate between multiple pages and provides a single "mission control" view for the entire event.

### Acceptance Scenarios
1. **Given** an admin is logged in and viewing their events list, **When** they click on a specific event, **Then** they should see a comprehensive dashboard showing event overview, metrics summary, tokens (if private), sessions list, speeches list, and photos gallery
2. **Given** an admin is on an event dashboard for a private event, **When** they click the "copy" button next to an organizer token, **Then** the token should be copied to their clipboard with visual confirmation
3. **Given** an admin is on an event dashboard for a private event, **When** they click the "copy" button next to a participant token, **Then** the token should be copied to their clipboard with visual confirmation
4. **Given** an admin is on an event dashboard for a private event, **When** they click the "download" button next to a participant token, **Then** a QR code image file should be generated and downloaded containing the token for easy sharing
5. **Given** an admin is on an event dashboard, **When** they view the event overview section, **Then** they should see key event details (name, date, visibility, status, description)
6. **Given** an admin is on an event dashboard for a public event, **When** they look for tokens, **Then** no token section should be displayed (public events don't use tokens)
7. **Given** an admin is on an event dashboard, **When** they view the sessions section, **Then** they should see a list of all sessions with ability to add, edit, or delete sessions inline
8. **Given** an admin is on an event dashboard, **When** they view the speeches section, **Then** they should see speeches organized by session with ability to manage them inline
9. **Given** an admin is on an event dashboard, **When** they view the photos section, **Then** they should see a gallery of event photos with ability to upload or delete photos inline
10. **Given** an admin is on an event dashboard, **When** they view the metrics section, **Then** they should see cached summary statistics including total page views, slide downloads, and participant count

### Edge Cases
- What happens when an admin tries to access an event dashboard for an event they don't own (different tenant)?
- What happens when tokens expire while viewing the dashboard?
- How does the system handle copying tokens on mobile devices vs desktop?
- What happens if the event has no tokens generated yet (for private events)?
- What happens when there are no sessions, speeches, or photos yet (empty state handling)?
- How does the dashboard handle events with many sessions/speeches (pagination or scrolling)?
- What happens when metrics are still being calculated (first load, no data yet)?

## Requirements

### Functional Requirements
- **FR-001**: System MUST display an event-specific dashboard accessible via a unique URL pattern (e.g., /admin/events/{id}/dashboard)
- **FR-002**: System MUST show event overview information including name, date, visibility, status, and description
- **FR-002a**: System MUST display cached metrics summary including total page views, slide downloads, and participant count
- **FR-003**: System MUST display access tokens (organizer and participant) for private events with copy-to-clipboard functionality
- **FR-004**: System MUST provide a download button for participant tokens that generates and downloads a QR code image file
- **FR-005**: System MUST NOT display QR codes inline on the dashboard
- **FR-006**: System MUST NOT display access tokens for public events
- **FR-007**: System MUST provide visual confirmation when tokens are successfully copied to clipboard
- **FR-008**: System MUST restrict access to event dashboards based on tenant ownership (RLS policies)
- **FR-009**: System MUST show token metadata including expiration date, usage count, and last used timestamp (read-only display)
- **FR-009a**: System MUST NOT allow token regeneration or expiration modification from the dashboard
- **FR-009b**: System MUST NOT display special warnings or badges for expiring tokens (plain date display only)
- **FR-010**: System MUST provide navigation link to edit event details and view public event page
- **FR-011**: System MUST display a list of all sessions for the event with inline management capabilities (add, edit, delete)
- **FR-012**: System MUST display a list of all speeches organized by session with inline management capabilities
- **FR-013**: System MUST display an event photos gallery with inline upload and delete capabilities
- **FR-014**: System MUST show session metadata (title, start time, end time, room/location)
- **FR-015**: System MUST show speech metadata (title, speaker, session assignment, slide count)
- **FR-016**: System MUST handle empty states gracefully (no sessions, no speeches, no photos) with prompts to add content
- **FR-017**: System MUST refresh cached metrics periodically (not real-time) to minimize performance impact
- **FR-018**: System MUST NOT provide bulk actions (download all slides, export data) - individual management only

### Key Entities
- **Event**: The main entity being managed - includes basic info (name, date, status, visibility) and relationships to all event resources
- **AccessToken**: Security tokens for private events - includes token string, type (organizer/participant), expiration, usage tracking (read-only on dashboard, managed elsewhere)
- **Session**: Time blocks within an event - displayed and manageable from dashboard with inline add/edit/delete
- **Speech**: Presentations within sessions - listed on dashboard organized by session with inline management
- **EventPhoto**: Gallery photos for the event - displayed in gallery view on dashboard with inline upload/delete
- **Slide**: Presentation files attached to speeches - accessible via speech metadata (slide count shown)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (token copied = success feedback shown)
- [x] Scope is clearly bounded (comprehensive hub with embedded management)
- [x] Dependencies and assumptions identified (depends on existing event/token system from Feature 005)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved (5 clarifications completed)
- [x] User scenarios defined and expanded
- [x] Requirements generated (20 functional requirements)
- [x] Entities identified (6 key entities)
- [x] Review checklist passed

---

## Notes for Planning Phase

This feature builds on Feature 005 (Event Flow Management) and requires:
- Existing event, token, session, speech, photo, and slide data structures
- Tenant-based RLS policies already in place
- Authentication system for admin access

**Scope Confirmed**: Comprehensive "mission control" dashboard showing all event resources with inline management capabilities. This centralizes event management in one page rather than requiring navigation between multiple dedicated pages.
