# Feature Specification: CloudConvert Thumbnail Generation with Event-Level Toggle

**Feature Branch**: `009-voglio-implementare-la`
**Created**: 2025-01-13
**Status**: Clarified - Ready for Planning
**Input**: User description: "voglio implementare la creazione di thumbnail con cloudconvert della prima slide delle presentazioni caricate. e voglio uno switch in modifica evento per attivare/disattivare la creazione della thumb"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: CloudConvert thumbnail generation for slides + event-level toggle
2. Extract key concepts from description
   → Actors: Event admins, system
   → Actions: Upload slides, generate thumbnails, toggle thumbnail generation
   → Data: Slides, thumbnails, event settings
   → Constraints: CloudConvert API, first slide only
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: What happens to existing thumbnails when feature is disabled?]
   → [NEEDS CLARIFICATION: Should thumbnail generation be retroactive for existing slides?]
   → [NEEDS CLARIFICATION: Cost limit or rate limiting for CloudConvert API?]
4. Fill User Scenarios & Testing section
   → Primary flow: Admin enables thumbnails, uploads slide, sees generated thumbnail
5. Generate Functional Requirements
   → Each requirement testable
6. Identify Key Entities
   → Event settings, Slide thumbnails, CloudConvert jobs
7. Run Review Checklist
   → WARN "Spec has uncertainties - 3 clarification points needed"
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-01-13

- Q: When an admin enables thumbnails for an existing event that already has uploaded slides, what should happen? → A: Retroactive generation only for slides without existing thumbnails (incremental approach)
- Q: What is the maximum acceptable time for thumbnail generation to complete before timing out? → A: 5 minutes
- Q: Should the thumbnail generation toggle be available during event creation, or only in edit mode after the event exists? → A: Available during event creation
- Q: How should the system handle CloudConvert API costs and usage limits? → A: Each tenant gets 5 free thumbnails with cost transparency (show remaining quota to admins), hard limit after quota exhausted, with the option to purchase more in the future (freemium model)
- Q: Should admins receive notifications if thumbnail generation repeatedly fails for an event? → A: Yes, send email notifications to admins after repeated thumbnail generation failures

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As an event administrator, I want to automatically generate thumbnail previews of uploaded presentation slides so that attendees can quickly browse and identify presentations of interest without downloading full files. I also want the ability to control whether thumbnail generation is enabled for each event, to manage API costs and processing time.

### Acceptance Scenarios

1. **Given** an event with thumbnail generation enabled, **When** an admin uploads a PowerPoint or PDF slide deck, **Then** the system automatically generates a thumbnail from the first slide and displays it in the speech card on the dashboard.

2. **Given** an event with thumbnail generation disabled, **When** an admin uploads a slide deck, **Then** no thumbnail is generated and the speech card shows a generic placeholder icon.

3. **Given** an existing event without thumbnail generation enabled, **When** an admin enables the thumbnail toggle in event settings, **Then** the system automatically queues thumbnail generation for all existing slides that don't already have thumbnails (incremental retroactive generation).

4. **Given** an event with thumbnail generation enabled, **When** a thumbnail generation fails (CloudConvert error, unsupported format, etc.), **Then** the system displays a clear error indicator and allows retry without blocking the slide upload.

5. **Given** multiple admins uploading slides concurrently, **When** thumbnails are being generated, **Then** each thumbnail generation job is processed independently without blocking other uploads.

### Edge Cases
- What happens when CloudConvert API is unavailable or rate-limited?
- How does the system handle very large presentation files (>100MB)?
- What happens if an admin toggles thumbnail generation off mid-upload?
- Should there be a batch "regenerate all thumbnails" action for an event?
- How are thumbnail storage costs managed if an event has hundreds of slides?

## Requirements *(mandatory)*

### Functional Requirements

#### Thumbnail Generation
- **FR-001**: System MUST generate thumbnail images from the first slide of uploaded presentations (PPT, PPTX, PDF) when thumbnail generation is enabled for the event
- **FR-002**: System MUST use CloudConvert API to convert the first slide to a preview image
- **FR-003**: Thumbnail generation MUST be asynchronous and not block the slide upload process
- **FR-004**: System MUST display a loading indicator while thumbnail is being generated
- **FR-005**: System MUST store generated thumbnails in cloud storage (R2) with appropriate naming convention
- **FR-006**: System MUST handle thumbnail generation failures gracefully and allow manual retry
- **FR-007**: Thumbnail generation MUST complete within 5 minutes (300 seconds)

#### Event-Level Toggle
- **FR-008**: Event admins MUST be able to enable/disable thumbnail generation for each event independently via a toggle switch in event edit form
- **FR-009**: Thumbnail generation setting MUST be saved as part of event configuration
- **FR-010**: System MUST respect the thumbnail generation setting when processing new slide uploads
- **FR-011**: System MUST display the current thumbnail generation status clearly in the event edit interface
- **FR-012**: Thumbnail generation toggle MUST be accessible during event creation, allowing admins to enable the feature from the start

#### Display & User Interface
- **FR-013**: Dashboard MUST display generated thumbnails in speech cards when available
- **FR-014**: System MUST show appropriate status badges: "Generating thumbnail...", "Thumbnail ready", "Thumbnail failed", or generic icon when disabled
- **FR-015**: Thumbnails MUST be visually distinguishable from placeholder icons
- **FR-016**: System MUST provide a fallback placeholder for events/speeches without thumbnails enabled

#### Error Handling & Monitoring
- **FR-017**: System MUST log all CloudConvert API errors with sufficient context for debugging
- **FR-018**: System MUST track thumbnail generation success/failure rates per event
- **FR-019**: System MUST provide clear error messages to admins when thumbnail generation fails
- **FR-020**: System MUST send email notifications to event admins after repeated thumbnail generation failures (e.g., 3+ consecutive failures)

#### Cost Management
- **FR-021**: System MUST enforce a hard limit of 5 free thumbnails per tenant, blocking thumbnail generation after quota is exhausted
- **FR-022**: System MUST display remaining thumbnail quota to admins in a visible location (e.g., event settings, dashboard)
- **FR-023**: System MUST provide clear messaging when thumbnail quota is exhausted with information about purchasing additional thumbnails (future feature)

### Key Entities

- **Event Settings**: Configuration for each event including thumbnail generation enabled/disabled flag. Each event independently controls whether slides uploaded to its sessions should have thumbnails generated.

- **Slide Metadata**: Stored information about each uploaded presentation including thumbnail status ("pending", "processing", "completed", "failed", "none"), thumbnail storage path (R2 key), and generation timestamp.

- **CloudConvert Job**: External API job tracking including job ID, status, conversion parameters, and result. Used for monitoring asynchronous thumbnail generation progress and handling errors.

- **Thumbnail Image**: Generated preview image (JPEG/PNG) stored in R2 with dimensions optimized for display in speech cards (e.g., 300x300px). Linked to parent slide via R2 key reference.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - ⚠️ CloudConvert mentioned but as external service, not implementation detail
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - **All 5 clarification questions answered**
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable - **5 minute timeout specified**
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified - **CloudConvert API with 5 free thumbnails per tenant**

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (5 clarification questions identified)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Clarifications completed (5/5 questions answered)
- [x] Review checklist passed - **READY FOR PLANNING**

---

## Clarified Decisions Summary

All clarification questions have been answered. Key decisions:

1. **Retroactive thumbnail generation**: Incremental approach - generate thumbnails only for slides that don't already have them when feature is enabled
2. **Timeout**: 5 minutes (300 seconds) for CloudConvert thumbnail generation
3. **Cost management**: 5 free thumbnails per tenant with hard limit, cost transparency via quota display, future option to purchase more
4. **Toggle availability**: Available during event creation (not edit-only)
5. **Failure notifications**: Email notifications to admins after repeated failures (3+ consecutive)

**Status**: ✅ Specification complete and ready for planning phase. Run `/plan` to generate implementation plan.

