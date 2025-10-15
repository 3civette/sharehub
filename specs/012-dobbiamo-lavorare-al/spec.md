# Feature Specification: Meeting Hub Portal - Design & Content Strategy

**Feature Branch**: `012-dobbiamo-lavorare-al`
**Created**: 2025-10-14
**Status**: Draft
**Input**: User description: "dobbiamo lavorare al design e ai testi: l'idea del portale è quella di vendere account alle agenzie MICE (che organizzano eventi) , il portale è 'Meeting Hub' di 3Civette, ogni agenzia si farà un account e dalla propria dashboard potra gestire (creare, modificare, cancellare) gli eventi. le agenzie potranno modificare il branding dell'evento per matchare con l'organizzazione dell'evento e caricare fino a 5 banner pubblicitari da esporre nella pagina dell'evento. Tutta la grafica admin è basata sulla palette 3civette, quella dell'evento  anche, ma è personalizzabile. alla generazione dell'evento, nella dashboard vengono messi a disposizione il token per il caricamento delle slide e quello per i partecipanti per poter scaricare il materiale."

## Execution Flow (main)
```
1. Parse user description from Input
   → Identified: Portal rebrand, B2B SaaS model, agency account management
2. Extract key concepts from description
   → Actors: 3Civette (owner), MICE agencies (customers), event participants
   → Actions: Sell accounts, manage events, customize branding, display banners, generate tokens
   → Data: Agencies, events, branding, banners, tokens
   → Constraints: Max 5 banners per event, 3Civette palette for admin, customizable for public pages
3. For each unclear aspect:
   → [CLARIFIED: Account pricing model - Freemium + 4 tiers (FREE/Basic/Professional/Enterprise)]
   → [CLARIFIED: Token expiration - 7 days after event date, non-regenerable]
   → [CLARIFIED: Banner system already implemented in feature 010]
   → [CLARIFIED: Brand customization - Logo + 4 colors + 5 font presets]
4. Fill User Scenarios & Testing section
   → SUCCESS: Clear user flows for agency signup, event management, and branding
5. Generate Functional Requirements
   → SUCCESS: All requirements testable
6. Identify Key Entities
   → SUCCESS: Agencies, subscriptions, branding configurations, banners
7. Run Review Checklist
   → WARN: Spec has uncertainties marked as [NEEDS CLARIFICATION]
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-14
- Q: Come devono registrarsi le agenzie MICE sul portale? → A: Self-service signup con form online (email, password, dati azienda) - attivazione immediata
- Q: Come devono funzionare i token per quanto riguarda scadenza e sicurezza? → A: Scadenza automatica 7 giorni dopo la data dell'evento, non rigenerabili
- Q: Quali sono le specifiche per i banner? → A: Sistema già implementato (feature 010) - JPEG/PNG/WebP max 5MB, 5 slot per evento, click URL opzionale, caricamento immediato senza approvazione
- Q: Quanto è personalizzabile il branding degli eventi? → A: Branding completo - Logo custom, palette completa (primary, secondary, accent, background colors), scelta tra 3-5 font preimpostati
- Q: Modello di pricing e tier? → A: Freemium + Tier multipli - FREE (max 3 eventi), Basic €29/mese (5 eventi), Professional €79/mese (20 eventi), Enterprise €199/mese (illimitati + support prioritario)

---

## User Scenarios & Testing

### Primary User Story

**As a MICE agency**, I want to purchase a Meeting Hub account so that I can manage my event portfolio with branded event pages and control access to presentation materials through secure tokens.

**User Journey**:
1. Agency discovers Meeting Hub through 3Civette's marketing
2. Signs up via self-service signup form (email, password, company details) with immediate account activation
3. Completes agency profile setup (company name, logo, contact info)
4. Creates their first event through the admin dashboard
5. Customizes event branding (colors, logo) to match client's brand
6. Uploads up to 5 promotional banners for the event page
7. Receives two tokens: one for speakers to upload slides, one for participants to access materials
8. Shares event page URL with participants
9. Monitors event metrics from dashboard
10. [NEEDS CLARIFICATION: Post-event data retention?] Archives or deletes event after completion

### Acceptance Scenarios

**Scenario 1: Agency Account Creation**
- **Given** a MICE agency wants to use Meeting Hub
- **When** they complete the self-service signup form with email, password, and company details
- **Then** their account is created and immediately activated
- **And** they receive access to an admin dashboard with 3Civette branding
- **And** they can create their first event immediately

**Scenario 2: Event Branding Customization**
- **Given** an agency has created an event
- **When** they navigate to the event's branding settings
- **Then** they can upload a custom logo for the event
- **And** they can configure a complete color palette (primary, secondary, accent, background colors)
- **And** they can select a font family from 3-5 preimpostato options (e.g., sans-serif, serif, modern)
- **And** the public event page reflects all these customizations
- **But** the admin interface retains 3Civette branding (not customizable)

**Scenario 3: Banner Management**
- **Given** an agency is editing an event
- **When** they access the banner management section
- **Then** they can upload up to 5 banner images (JPEG/PNG/WebP, max 5MB each)
- **And** each banner is assigned to a specific slot (1-5) with unique dimensions and positions
- **And** each banner can optionally include a click URL to redirect visitors
- **And** banners are displayed on the public event page in their assigned slot positions
- **But** they cannot upload more than 5 banners per event (one per slot)

**Scenario 4: Token Generation and Distribution**
- **Given** an event has been created
- **When** the agency views the event dashboard
- **Then** two tokens are automatically generated and displayed
- **And** the "slide upload token" allows speakers to upload their presentations
- **And** the "participant access token" allows attendees to view/download materials
- **And** tokens automatically expire 7 days after the event date
- **But** tokens cannot be regenerated once created

**Scenario 5: Multi-Event Management**
- **Given** an agency manages multiple events
- **When** they view their dashboard
- **Then** they see a list of all their events (upcoming, ongoing, past)
- **And** they can filter/sort events by date, status, or name
- **And** each event shows key metrics (views, downloads, participants)

### Edge Cases

**Account & Subscription**
- What happens when an agency's [NEEDS CLARIFICATION: subscription expires or payment fails]?
- Can agencies cancel their account? What happens to their event data?
- Can multiple users from the same agency access the same account?
- What happens if signup email already exists?
- What email validation and password strength requirements apply?

**Branding & Design**
- What if uploaded logos don't meet requirements (max 2MB, JPEG/PNG/SVG, recommended 400x100px)?
- Should the system validate color contrast ratios for accessibility (WCAG AA compliance)?
- Can branding (colors, fonts, logo) be changed after an event has started or been published?
- What happens if an agency selects colors that make text unreadable (e.g., white text on white background)?
- Should there be a preview mode to test branding before applying it to the public page?

**Token Security**
- What happens if tokens are shared publicly or leaked? (Cannot be regenerated, so agency must wait for expiration)
- Tokens expire automatically 7 days after the event date
- What if speakers need to upload slides after the token has expired?
- What if participants need access to materials after the 7-day expiration period?

**Banner Management** (Already implemented - feature 010)
- Accepts JPEG, PNG, WebP (max 5MB per banner)
- 5 slots per event, each with unique dimensions and positions
- No scheduling - banners visible for entire event duration
- Immediate publication without approval process
- Click URLs optional (open in new tabs)

**Data & Privacy**
- How long is event data retained after an event ends?
- Can agencies export their event data?
- What happens to participant data (email addresses, download logs)?

---

## Requirements

### Functional Requirements

**Portal Branding & Identity**
- **FR-001**: Portal MUST be branded as "Meeting Hub by 3Civette" across all public-facing pages
- **FR-002**: Admin dashboard MUST use 3Civette's brand palette (colors, typography, logo)
- **FR-003**: Public event pages MUST support custom branding per event while defaulting to 3Civette palette

**Agency Account Management**
- **FR-004**: System MUST provide self-service signup form for MICE agencies with immediate account activation
- **FR-004a**: Signup form MUST collect: company name, contact email, password, phone (optional), VAT number (optional)
- **FR-004b**: System MUST validate email uniqueness and prevent duplicate registrations
- **FR-004c**: System MUST enforce password strength requirements (min 8 characters, mixed case, number)
- **FR-004d**: System MUST send confirmation email with login link after successful signup
- **FR-004e**: New signups MUST be automatically assigned to the FREE tier with 3-event limit
- **FR-005**: Each agency MUST have a unique account with their own admin dashboard
- **FR-006**: Agencies MUST be able to manage their profile (company name, logo, contact information)
- **FR-007**: System MUST track subscription tier, billing status, event usage, and enforce tier limits per agency
- **FR-007a**: System MUST support 4 subscription tiers: FREE (€0, max 3 eventi), Basic (€29/mese, max 5 eventi), Professional (€79/mese, max 20 eventi), Enterprise (€199/mese, eventi illimitati + support prioritario)
- **FR-007b**: System MUST prevent event creation when agency reaches their tier's event limit
- **FR-007c**: System MUST allow agencies to upgrade/downgrade their subscription tier from the dashboard
- **FR-007d**: System MUST display current tier, event usage (X/Y eventi usati), and upgrade options prominently in the dashboard

**Event Management**
- **FR-008**: Agencies MUST be able to create events up to their subscription tier limit (FREE: 3, Basic: 5, Professional: 20, Enterprise: unlimited)
- **FR-008a**: System MUST display a clear error message with upgrade CTA when limit is reached
- **FR-009**: Agencies MUST be able to edit event details (name, date, description, location)
- **FR-010**: Agencies MUST be able to delete events with confirmation dialog; deleted events free up quota for tier limit
- **FR-011**: Each event MUST have a unique public URL (e.g., meetinghub.3civette.it/events/event-slug)

**Event Branding Customization**
- **FR-012**: Agencies MUST be able to upload a custom logo for each event (JPEG/PNG/SVG, max 2MB, recommended size 400x100px)
- **FR-013**: Agencies MUST be able to configure a complete color palette for each event including:
  - **FR-013a**: Primary color (hex value for main brand color)
  - **FR-013b**: Secondary color (hex value for complementary color)
  - **FR-013c**: Accent color (hex value for highlights and CTAs)
  - **FR-013d**: Background color (hex value for page background)
- **FR-014**: System MUST apply custom branding only to public event pages, not admin interfaces
- **FR-015**: Agencies MUST be able to select a font family from 3-5 preimpostato options (e.g., Inter/sans-serif, Merriweather/serif, Poppins/modern, Roboto/neutral, Playfair Display/elegant)
- **FR-015a**: System MUST apply the selected font to all text elements on the public event page (headings, body text, buttons)
- **FR-016**: System MUST validate uploaded logos for format (JPEG/PNG/SVG), size (max 2MB), and provide cropping/resizing tools if needed

**Banner Management** (Already implemented in feature 010)
- **FR-017**: Agencies MUST be able to upload up to 5 promotional banners per event (one per slot)
- **FR-018**: System MUST enforce the 5-banner limit (one banner per slot, 5 slots total)
- **FR-019**: Banners MUST be displayed on the public event page in their assigned slot positions (each slot has unique dimensions and page placement)
- **FR-020**: System MUST validate banner uploads for format (JPEG/PNG/WebP only), size (max 5MB), and assign to specific slots (1-5)
- **FR-021**: Agencies MUST be able to replace or delete banners in any slot
- **FR-022**: Banners MAY include optional click URLs that redirect visitors to external pages in new tabs

**Token Generation & Access Control**
- **FR-023**: System MUST automatically generate two unique tokens per event:
  - Slide Upload Token (for speakers)
  - Participant Access Token (for attendees)
- **FR-024**: Tokens MUST be displayed in the agency's event dashboard immediately after event creation
- **FR-025**: Slide Upload Token MUST allow speakers to upload presentation files
- **FR-026**: Participant Access Token MUST allow attendees to view and download event materials
- **FR-027**: Tokens MUST automatically expire 7 days after the event date
- **FR-027a**: System MUST calculate expiration date as event_date + 7 days at token creation time
- **FR-027b**: System MUST reject all token-based operations (uploads, downloads) after expiration date
- **FR-027c**: Tokens MUST NOT be regenerable or renewable once created
- **FR-028**: System MUST track token usage (number of uploads, downloads per token)
- **FR-029**: Dashboard MUST display token expiration date prominently to agency administrators

**Content & Messaging**
- **FR-030**: Portal homepage MUST clearly communicate the value proposition for MICE agencies
- **FR-031**: Marketing copy MUST emphasize key benefits: branded event pages, secure content sharing with tokens, customizable branding, banner advertising, analytics dashboard
- **FR-032**: Pricing information MUST be publicly displayed on a dedicated pricing page with clear feature comparison across all 4 tiers
- **FR-032a**: Pricing page MUST include: tier name, monthly price, event limit, all features, CTA button for signup/upgrade
- **FR-033**: Help documentation MUST guide agencies through event creation, branding, token management, and subscription upgrades

**Dashboard & Analytics**
- **FR-034**: Agency dashboard MUST display a list of all their events with status indicators (draft, upcoming, ongoing, past)
- **FR-035**: Each event MUST show basic metrics (page views, slide downloads, participant count)
- **FR-036**: Dashboard MUST provide quick actions: Create Event, View Event, Edit Branding, Manage Banners

### Key Entities

**Agency (Tenant)**
- Represents a MICE agency customer
- Attributes: Company name, logo, contact email, password hash, phone, VAT number, address, created date
- Relationships: Has many Events, has one Subscription
- Business rules: Cannot be deleted if active events exist [NEEDS CLARIFICATION: or data is archived?]

**Subscription**
- Represents the billing and access level for an agency
- Attributes: [NEEDS CLARIFICATION: Plan tier, status (active/suspended/cancelled), billing cycle, price]
- Relationships: Belongs to one Agency
- Business rules: [NEEDS CLARIFICATION: Defines event limits, storage limits, feature access]

**Event Branding Configuration**
- Represents custom visual identity for a specific event
- Attributes: Custom logo URL, primary color (hex), secondary color (hex), accent color (hex), background color (hex), font_family (enum: 'inter'|'merriweather'|'poppins'|'roboto'|'playfair')
- Relationships: Belongs to one Event
- Business rules: Defaults to 3Civette branding if not customized, applies only to public event pages (admin stays 3Civette branded)

**Event Banner** (Already implemented in feature 010)
- Represents promotional images displayed on public event pages
- Attributes: Image URL (storage_path), slot number (1-5), filename, file_size, mime_type (JPEG/PNG/WebP), optional click_url, is_active flag, created_at
- Relationships: Belongs to one Event (max 5 per event, one per slot)
- Business rules: Max 5MB file size, JPEG/PNG/WebP formats only, unique slot per event, click URLs open in new tabs

**Access Token**
- Represents secure keys for controlled access to event features
- Attributes: Token value (unique), type (slide_upload or participant_access), created date, expiration date (event_date + 7 days), usage count
- Relationships: Belongs to one Event
- Business rules: Automatically expires 7 days after event date, cannot be regenerated or renewed

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous (except where marked)
- [ ] Success criteria are measurable (pending clarification on metrics)
- [x] Scope is clearly bounded (portal design, agency accounts, event branding, banners, tokens)
- [ ] Dependencies and assumptions identified (pending business decisions)

**Outstanding Clarifications Required**:
1. Multi-user access per agency account
2. Data retention and export policies
3. Post-event data handling (archival, deletion)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (3 major areas remaining - 5 clarified: signup, tokens, banners, branding, pricing)
- [x] User scenarios defined
- [x] Requirements generated (51+ functional requirements including sub-requirements)
- [x] Entities identified (6 key entities)
- [ ] Review checklist passed (blocked by remaining clarifications)

---

## Next Steps

Before proceeding to planning phase (`/plan`), the following business decisions should be finalized (optional but recommended):

1. **Data Governance**: Define retention, export, and deletion policies
2. **Agency Collaboration**: Determine if multiple users can access the same agency account

The spec is now sufficiently detailed to proceed with `/plan` if these remaining items can be decided during implementation or defaulted to sensible behaviors.

**Clarifications completed so far** (5 major areas):
- ✅ Agency onboarding: Self-service signup with immediate activation
- ✅ Token security: 7-day expiration post-event, non-regenerable
- ✅ Banner system: Already implemented in feature 010
- ✅ Branding customization: Logo + 4 colors + 5 font presets
- ✅ Monetization strategy: Freemium + 4 tiers (FREE/Basic/Professional/Enterprise)
