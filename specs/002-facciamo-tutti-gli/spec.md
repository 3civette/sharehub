# Feature Specification: Admin Panel Secondary Screens

**Feature Branch**: `002-facciamo-tutti-gli`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "facciamo tutti gli screen per il secondo layer dell'admin: crea evento , personalizza beanding, visualizza eventi e impostazioni"

## Clarifications

### Session 2025-10-07
- Q: Can admins edit/delete existing events? → A: Edit with constraints - can edit future events, view-only for past ones
- Q: What settings should the Settings screen include? → A: Hotel name, contact information, and billing/subscription settings (subdomains are in event creation, not settings)
- Q: What branding customization options should be available? → A: Colors + logo only for now (will be improved later with typography)
- Q: Logo upload specifications? → A: 2MB max file size, PNG JPG SVG formats
- Q: Event list sorting order? → A: Default soonest first (ascending by date), but user-selectable to toggle sort options

---

## Execution Flow (main)
```
1. Parse user description from Input
   → ✅ Feature: Admin panel secondary screens (create event, branding, event list, settings)
2. Extract key concepts from description
   → Actors: Admin users (authenticated)
   → Actions: Create events, customize branding, view event list, manage settings
   → Data: Events, branding configuration, tenant settings
   → Constraints: Multi-tenant isolation, admin-only access
3. For each unclear aspect:
   → ✅ RESOLVED: What specific settings are included in "impostazioni"?
   → ✅ RESOLVED: Can admins edit existing events or only create new ones?
   → ✅ RESOLVED: What branding elements are customizable?
   → ✅ RESOLVED: Logo upload specifications?
   → ✅ RESOLVED: Event list sorting order?
4. Fill User Scenarios & Testing section
   → ✅ Primary flow: Admin creates event, customizes branding, manages tenant
5. Generate Functional Requirements
   → ✅ Create event, customize branding, list events, settings page
6. Identify Key Entities
   → ✅ Event, Branding Configuration, Tenant Settings
7. Run Review Checklist
   → ⚠️ WARN "Spec has uncertainties" - 3 minor clarifications remain
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
An admin user logs into the ShareHub admin panel and needs to:
1. Create a new event for their hotel/venue with title, date, description, and visibility settings
2. Edit future events to update details, but only view past events (read-only)
3. Customize the branding (colors and logo) for their tenant to match their brand identity
4. View a list of all events sorted by soonest date first, with ability to change sort order
5. Access settings to manage hotel information, contact details, and billing/subscription

### Acceptance Scenarios

#### Create Event Flow
1. **Given** an authenticated admin user is on the admin panel, **When** they navigate to "Create Event" screen, **Then** they see a form to input event details
2. **Given** the admin fills in event name, date, and description, **When** they select visibility (public/private), **Then** the system creates the event and shows success confirmation
3. **Given** the admin creates a private event, **When** the event is saved, **Then** the system generates access tokens for organizers and participants

#### Edit Event Flow
1. **Given** an admin views an event with a future date, **When** they click "Edit", **Then** they can modify event name, date, description, and visibility
2. **Given** an admin views an event with a past date, **When** they open event details, **Then** all fields are read-only (no edit option)
3. **Given** an admin edits a future event, **When** they save changes, **Then** the system validates and persists updates with success feedback

#### Branding Customization Flow
1. **Given** an admin is on the branding screen, **When** they select primary and secondary colors using color pickers, **Then** they see a live preview of how the branding looks
2. **Given** the admin uploads a logo image (PNG, JPG, or SVG under 2MB), **When** they save changes, **Then** the branding is applied to all tenant pages
3. **Given** the admin uploads a logo exceeding 2MB or in wrong format, **When** they attempt upload, **Then** system shows validation error with specific limit/format requirements
4. **Given** the admin wants to revert changes, **When** they click reset, **Then** colors and logo return to default values

#### Event List Flow
1. **Given** an admin has created multiple events, **When** they navigate to the events list screen, **Then** they see all events sorted by date ascending (soonest first) with status indicators
2. **Given** the admin wants to change sort order, **When** they click the sort toggle, **Then** events reorder (e.g., newest first, or by creation date)
3. **Given** the admin clicks on an event from the list, **When** event details load, **Then** they can view event information and generated tokens
4. **Given** the admin views the event list, **When** they filter by status (active/past/draft), **Then** only matching events are displayed

#### Settings Flow
1. **Given** an admin is on the settings screen, **When** they view tenant information, **Then** they see hotel name, contact information (email, phone), and billing/subscription details
2. **Given** the admin modifies hotel name or contact info, **When** they save changes, **Then** the system validates and persists the new configuration
3. **Given** the admin views billing section, **When** they check subscription status, **Then** they see current plan, renewal date, and payment method

### Edge Cases
- What happens when an admin tries to create an event with a past date?
- How does the system handle invalid image formats for logo upload?
- What happens if uploaded logo exceeds 2MB size limit?
- What happens if two admins modify branding simultaneously?
- How does the system handle very long event names or descriptions?
- What happens when an admin tries to edit an event that just became "past" (date crossed while editing)?
- What happens if billing information is incomplete or subscription expires?

## Requirements *(mandatory)*

### Functional Requirements

#### Event Creation (FR-001 to FR-009)
- **FR-001**: System MUST provide a "Create Event" form with fields for event name, date, description, and visibility setting
- **FR-002**: System MUST validate that event date is not in the past [NEEDS CLARIFICATION: Or should past dates be allowed for archival purposes?]
- **FR-003**: System MUST support both public and private event visibility settings
- **FR-004**: System MUST auto-generate unique organizer and participant tokens when a private event is created
- **FR-005**: System MUST display generated tokens immediately after event creation for the admin to copy
- **FR-006**: System MUST associate each created event with the admin's tenant (multi-tenant isolation)
- **FR-007**: System MUST validate required fields (event name and date minimum)
- **FR-008**: System MUST provide success/error feedback after event creation attempt
- **FR-009**: System MUST allow event description to support [NEEDS CLARIFICATION: plain text only or rich text formatting?]

#### Event Editing (FR-010 to FR-014)
- **FR-010**: System MUST allow admins to edit events with future dates (event_date >= today)
- **FR-011**: System MUST present past events (event_date < today) in read-only mode (no edit/delete actions)
- **FR-012**: System MUST validate editable fields on save (same rules as creation)
- **FR-013**: System MUST preserve original creation timestamp and creator when editing events
- **FR-014**: System MUST prevent editing event tokens (tokens remain unchanged after creation)

#### Branding Customization (FR-015 to FR-023)
- **FR-015**: System MUST provide a branding customization screen with color pickers for primary and secondary colors
- **FR-016**: System MUST allow admins to upload a logo image in PNG, JPG, or SVG format
- **FR-017**: System MUST validate logo file size does not exceed 2MB
- **FR-018**: System MUST reject logo uploads that are not PNG, JPG, or SVG format with clear error message
- **FR-019**: System MUST show live preview of branding changes (color and logo) before saving
- **FR-020**: System MUST persist branding settings (primary color, secondary color, logo) per tenant (multi-tenant isolation)
- **FR-021**: System MUST allow admins to reset branding to default values (removes custom colors and logo)
- **FR-022**: System MUST apply branding changes immediately to all tenant pages after save
- **FR-023**: System MUST show current branding configuration when admin opens the screen

#### Event List View (FR-024 to FR-032)
- **FR-024**: System MUST display a list of all events belonging to the admin's tenant
- **FR-025**: System MUST show event name, date, visibility status, and creation date for each event in the list
- **FR-026**: System MUST sort events by date ascending (soonest first) by default
- **FR-027**: System MUST provide user-selectable sort options (e.g., toggle between soonest first, newest first, recently created)
- **FR-028**: System MUST allow filtering events by status (active/past/draft) [NEEDS CLARIFICATION: What defines "draft" vs "active"?]
- **FR-029**: System MUST allow admins to click on an event to view full details
- **FR-030**: System MUST display event tokens when admin views event details
- **FR-031**: System MUST indicate which events are public vs private visually (icon, badge, or color)
- **FR-032**: System MUST visually distinguish editable (future) events from read-only (past) events in the list

#### Settings Management (FR-033 to FR-041)
- **FR-033**: System MUST provide a settings screen for tenant configuration
- **FR-034**: System MUST display hotel/venue name field (editable)
- **FR-035**: System MUST display contact information fields (email, phone number)
- **FR-036**: System MUST display billing/subscription section showing current plan, renewal date, and payment method
- **FR-037**: System MUST validate hotel name (required, 2-100 characters)
- **FR-038**: System MUST validate email format and phone number format
- **FR-039**: System MUST allow admins to update hotel name and contact information
- **FR-040**: System MUST show billing/subscription information as read-only (view only, not editable in this screen)
- **FR-041**: System MUST restrict settings access to admin users only (authenticated and authorized)

#### General Admin Panel (FR-042 to FR-046)
- **FR-042**: System MUST provide navigation between all admin screens (dashboard, create event, branding, events list, settings)
- **FR-043**: System MUST display the current tenant name/logo in the admin panel header
- **FR-044**: System MUST show which admin user is currently logged in
- **FR-045**: System MUST provide a logout option from any admin screen
- **FR-046**: System MUST redirect unauthenticated users to login when accessing admin screens

### Key Entities *(include if feature involves data)*

- **Event**: Represents a shareable event with name, date, description, visibility (public/private), status, organizer token, participant token, created_at timestamp, and association to a tenant. Events with past dates become read-only.
- **Branding Configuration**: Tenant-specific visual settings including primary color (hex), secondary color (hex), and logo image URL (PNG/JPG/SVG, max 2MB), stored per tenant. Typography customization deferred to future enhancement.
- **Tenant Settings**: Configuration data for a tenant including hotel/venue name, contact information (email, phone), billing/subscription details (plan, renewal date, payment method)
- **Admin User**: Authenticated user with permission to manage events, branding, and settings for their associated tenant

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain ⚠️ **2 minor clarifications (optional, low-impact)**
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (4 admin screens with edit capability, colors+logo branding, 2MB PNG/JPG/SVG logos, sortable event list)
- [x] Dependencies and assumptions identified (authentication, multi-tenancy from feature 001)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted (actors: admins, actions: create/edit/customize/view/manage, data: events/branding/settings)
- [x] Ambiguities marked (2 low-impact clarifications remain)
- [x] User scenarios defined (5 flows: create event, edit event, branding, event list, settings)
- [x] Requirements generated (46 functional requirements across 6 categories)
- [x] Entities identified (Event, Branding Configuration, Tenant Settings, Admin User)
- [x] Review checklist passed ✅ **Ready for planning** (2 minor deferred items)

---

## Clarifications Needed (2 remaining - low impact, can defer to planning)

1. ~~**Settings Scope**: What specific settings should be included in "impostazioni"?~~ ✅ RESOLVED
2. ~~**Event Editing**: Can admins edit existing events or only create new ones?~~ ✅ RESOLVED
3. ~~**Branding Elements**: What specific branding elements are customizable?~~ ✅ RESOLVED
4. ~~**Logo Upload Specs**: File size limit, supported formats?~~ ✅ RESOLVED
5. ~~**Event Sorting**: Default sort order for event list?~~ ✅ RESOLVED
6. **Event Date Validation**: Should past dates be allowed for archival/historical events? *(Low impact - can default to "no past dates" during planning)*
7. **Event Description Format**: Plain text only or rich text formatting? *(Low impact - can default to plain text with simple line breaks during planning)*
8. **Event Status**: What defines "draft" vs "active" status? *(Low impact - can simplify to just active/past based on date during planning)*
