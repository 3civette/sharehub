# Research: Meeting Hub Portal - B2B SaaS Transformation

**Feature**: 012-dobbiamo-lavorare-al
**Date**: 2025-10-14
**Phase**: 0 (Outline & Research)

## Overview

This document consolidates research findings for transforming ShareHub into "Meeting Hub by 3Civette" - a B2B SaaS platform for MICE agencies. Research focused on resolving technical unknowns around subscription models, agency onboarding, branding customization, token lifecycle, and multi-tenant data migration.

---

## 1. Subscription Model Patterns

### Research Question
How should we enforce freemium tier limits (FREE: 3, Basic: 5, Professional: 20, Enterprise: unlimited) - soft limits with warnings or hard limits that block creation?

### Research Findings

**Soft Limit Approach** (Stripe overage model):
- Allow exceeding limit with per-overage billing
- Pros: Flexibility for agencies, additional revenue
- Cons: Complex billing logic, confusing UX, harder to predict costs
- Example: Stripe allows overages at $X per extra unit

**Hard Limit Approach** (Notion, Airtable model):
- Block action when limit reached, show upgrade CTA
- Pros: Simple logic, clear upgrade path, predictable pricing
- Cons: May frustrate users at critical moments
- Example: Notion blocks new pages at limit with "Upgrade to create more pages" modal

### Decision
**Hard limit with immediate upgrade CTA**

### Rationale
1. **Better Conversion**: Clear call-to-action when user needs the feature most (high intent moment)
2. **Simpler Implementation**: No overage billing logic, no prorated calculations
3. **Predictable Pricing**: Agencies know exactly what they're paying for
4. **Constitutional Alignment**: Simplicity principle (avoid premature complexity)

### Alternatives Considered
- **Soft limits with overage billing**: Rejected due to complexity (billing integration, prorated charges, refund logic)
- **Grace period (allow +1 over limit)**: Rejected due to abuse potential and unclear boundaries

### Implementation Notes
- Block event creation at API level (`POST /api/events`) with 403 Forbidden
- Return `{ error: "EVENT_LIMIT_REACHED", current_tier, event_limit, upgrade_url }`
- Frontend shows modal with tier comparison table + "Upgrade Now" button
- Track limit enforcement in `subscriptions.current_event_count` (incremented on create, decremented on delete)

---

## 2. Agency Onboarding UX

### Research Question
Should agency signup require email verification before activation, or allow immediate access?

### Research Findings

**Mandatory Email Verification** (GitHub, GitLab):
- Block all access until email confirmed
- Pros: Prevents spam accounts, validates contact info
- Cons: High drop-off rate (30-50% don't complete verification), poor conversion
- Example: GitHub blocks repo creation until verified

**Optional Verification** (Notion, Airtable):
- Immediate activation, email verification suggested
- Pros: Low friction, better conversion (80%+ complete signup)
- Cons: Some spam risk, invalid emails remain undetected
- Example: Notion lets you create workspaces immediately, sends verification email in background

**Delayed Verification** (Stripe):
- Immediate activation, verification required at payment
- Pros: Balances conversion with quality, natural gate at billing
- Cons: Delays enforcement, requires payment integration first

### Decision
**Immediate activation + optional email verification**

### Rationale
1. **Conversion Optimization**: Reduce drop-off at critical moment (30-50% → <10%)
2. **Product-Led Growth**: Let agencies experience value before barriers
3. **Natural Gate**: Freemium tier has 3-event limit, gives trial period
4. **Phased Rollout**: Can add mandatory verification later if spam becomes issue

### Alternatives Considered
- **Mandatory verification**: Rejected due to high drop-off risk in MVP phase
- **Phone verification**: Rejected as too high friction for target audience (MICE agencies expect B2B, not B2C flow)

### Implementation Notes
- `POST /api/agencies/signup` creates account + subscription (tier=free) immediately
- Send welcome email with verification link (non-blocking)
- Add `email_verified_at` (TIMESTAMPTZ NULL) to `agencies` table
- Show banner in dashboard: "Verify your email to receive important notifications"
- Future: Require verification before upgrading to paid tiers

---

## 3. Branding Customization Patterns

### Research Question
How much flexibility should agencies have in customizing event branding? Full Google Fonts library vs preset fonts? 2-color vs 4-color palette?

### Research Findings

**Full Flexibility** (Webflow, Figma):
- Unlimited fonts (Google Fonts API), unlimited colors, custom CSS
- Pros: Maximum creative freedom
- Cons: Overwhelming UX, inconsistent brand quality, performance issues (loading many fonts)
- Example: Webflow's font picker has 1000+ fonts

**Moderate Flexibility** (Mailchimp, Canva):
- 5-10 preset fonts, 3-5 color palette, no custom CSS
- Pros: Balanced creativity + consistency, faster load times
- Cons: May not match brand guidelines exactly
- Example: Canva's brand kit has 3-color palette + 2 font choices

**Minimal Flexibility** (Stripe checkout):
- 1 brand color, logo only, no font control
- Pros: Simple, fast, consistent quality
- Cons: Too restrictive for agencies needing full brand matching
- Example: Stripe's checkout customization

### Decision
**5 preset fonts + 4-color palette with hex input**

### Rationale
1. **Design Consistency**: Curated fonts ensure readability, prevent poor choices
2. **Performance**: Only load 5 font files (vs 1000+ with Google Fonts API)
3. **Sufficient Flexibility**: 4 colors (primary, secondary, accent, background) cover most brand palettes
4. **Constitutional Alignment**: Simplicity (avoid unlimited options) + UX-first (focus on common needs)

### Alternatives Considered
- **Full Google Fonts**: Rejected due to performance cost (each font = 50-200KB) and decision paralysis (1000+ choices)
- **2-color palette**: Rejected as insufficient for complex brand guidelines (many brands have 3-4 core colors)
- **Custom CSS upload**: Rejected due to XSS risk and maintenance complexity

### Implementation Notes
- **Font Presets**: Inter (sans-serif), Merriweather (serif), Poppins (modern), Roboto (neutral), Playfair Display (elegant)
- **Color Storage**: `event_branding` table stores hex values (`TEXT CHECK (value ~ '^#[0-9A-Fa-f]{6}$')`)
- **Validation**: Frontend shows color picker with hex input, backend validates format
- **Fallback**: If no branding set, default to 3Civette palette (primary=#2563EB, secondary=#7C3AED, accent=#F59E0B, background=#F8FAFC)
- **Preview**: Show live preview of event page with custom colors before saving

---

## 4. Token Lifecycle Management

### Research Question
Should tokens be regenerable if leaked? How should expiration work - manual deletion or auto-expiration?

### Research Findings

**Regenerable Tokens** (Stripe API keys):
- Tokens can be revoked and regenerated anytime
- Pros: Security recovery if leaked, flexible for agencies
- Cons: Opens abuse vector (unlimited regeneration), tracking complexity
- Example: Stripe lets you rotate API keys immediately

**Non-Regenerable Tokens** (Single-use invitation codes):
- Tokens expire automatically, cannot be renewed
- Pros: Forces intentional token distribution, prevents abuse
- Cons: Agencies stuck if token leaked before event
- Example: Zoom meeting links expire after scheduled time

**Manual Expiration** (JWT without TTL):
- Tokens valid until manually deleted
- Pros: No time pressure on agencies
- Cons: Abandoned events leave tokens valid indefinitely
- Example: GitHub personal access tokens (manually revoked)

**Auto-Expiration** (JWT with TTL):
- Tokens expire automatically after fixed period or event date
- Pros: Self-cleaning, enforces lifecycle discipline
- Cons: Requires careful timing, can't extend if needed
- Example: AWS STS tokens expire after 1-12 hours

### Decision
**DB-enforced 7-day post-event auto-expiration, non-regenerable**

### Rationale
1. **Security-First**: Tokens auto-expire, reducing abandoned token risk (constitutional principle II)
2. **Intentional Distribution**: Non-regenerable forces agencies to plan token distribution carefully
3. **Lifecycle Discipline**: 7-day window provides reasonable buffer (event day + 1 week for late attendees)
4. **Data Hygiene**: Auto-expiration prevents token proliferation over time

### Alternatives Considered
- **Regenerable tokens**: Rejected due to abuse vector (agencies could regenerate indefinitely, circumventing tier limits)
- **Manual expiration**: Rejected due to abandoned token risk (agencies forget to clean up after events)
- **Longer expiration (30 days)**: Rejected as too long for security best practices
- **Event-date-only expiration**: Rejected as too short (attendees may need materials post-event)

### Implementation Notes
- **DB Constraint**: `access_tokens.auto_expire_date TIMESTAMPTZ NOT NULL CHECK (auto_expire_date = event_date + INTERVAL '7 days')`
- **Expiration Enforcement**: API validates `NOW() < auto_expire_date` before allowing uploads/downloads
- **Token Generation**: `POST /api/events` creates 2 tokens (slide_upload, participant_access) with computed expire dates
- **Dashboard Display**: Show expiration countdown prominently ("Token expires in 5 days" with red badge if <2 days)
- **Backfill Migration**: Existing tokens get `auto_expire_date` backfilled from `events.event_date + 7 days`
- **Edge Case**: If agency wants to extend access, they must create a new event (enforces proper event management)

---

## 5. Multi-Tenant Data Migration

### Research Question
Should we rename `tenants` table to `agencies` (breaking change) or create an alias (backward compatible)?

### Research Findings

**Immediate Rename** (Hard migration):
- Rename `tenants` → `agencies` in single migration
- Update all FK references (`tenant_id` → `agency_id`)
- Update all code references
- Pros: Clean naming, no confusion
- Cons: Breaking change, downtime risk, requires full codebase update
- Example: Major version migration (v1 → v2)

**Table Alias** (Soft migration):
- Create database VIEW `agencies AS SELECT * FROM tenants`
- Keep `tenant_id` FK references
- Update code incrementally to use `agencies` view
- Pros: Zero downtime, backward compatible, gradual rollout
- Cons: Dual naming (confusion), requires eventual cleanup migration
- Example: PostgreSQL views for legacy compatibility

**Parallel Tables** (Dual-write):
- Create new `agencies` table
- Dual-write to both `tenants` and `agencies`
- Migrate code to read from `agencies`
- Drop `tenants` after validation
- Pros: Safe rollback, gradual validation
- Cons: Complex dual-write logic, data sync issues, storage duplication
- Example: Zero-downtime database migrations

### Decision
**Table alias with incremental migration**

### Rationale
1. **Zero Downtime**: Existing code continues to work with `tenants` table
2. **Gradual Rollout**: New code uses `agencies` view, old code unchanged
3. **Constitutional Alignment**: No easy fixes (proper incremental refactor, not big-bang rename)
4. **Risk Mitigation**: Can roll back by dropping view (vs reverting breaking changes)
5. **Pragmatic**: Acknowledges existing codebase references `tenant_id` extensively

### Alternatives Considered
- **Immediate rename**: Rejected due to breaking change risk (100+ files reference `tenant_id`)
- **Parallel tables with dual-write**: Rejected due to complexity (data sync issues, FK constraints duplication)
- **Keep `tenants` naming**: Rejected as misaligned with B2B SaaS terminology (agencies != hotels)

### Implementation Notes
- **Phase 1 (Migration)**: Create `agencies` VIEW that aliases `tenants`
  ```sql
  CREATE OR REPLACE VIEW agencies AS SELECT * FROM tenants;
  ```
- **Phase 2 (Code Update)**: Update new code to query `agencies` view
  - Context: `AgencyContext` (replaces `TenantContext`)
  - API routes: `/api/agencies/*` (new), `/api/tenants/*` (deprecated)
  - RLS policies: Create `agency_id` versions alongside `tenant_id`
- **Phase 3 (FK Migration)**: Add `agency_id` columns to related tables
  ```sql
  ALTER TABLE events ADD COLUMN agency_id UUID REFERENCES tenants(id);
  UPDATE events SET agency_id = tenant_id;
  ```
- **Phase 4 (Deprecation)**: Mark `tenant_id` columns as deprecated, plan cleanup in future release
- **Phase 5 (Cleanup)**: Eventually drop `tenant_id` columns and rename `tenants` → `agencies` (future feature)

### Backward Compatibility
- Existing `tenant_id` FK references continue to work
- RLS policies support both `tenant_id` and `agency_id` during transition
- API routes aliased: `/api/tenants/X` → `/api/agencies/X` (via middleware)
- Frontend context: `TenantContext` re-exported as `AgencyContext` (deprecated)

---

## Summary of Decisions

| Area | Decision | Rationale | Constitutional Principle |
|------|----------|-----------|--------------------------|
| Subscription Limits | Hard block + upgrade CTA | Better conversion, simpler logic | VI. Simplicity (avoid billing complexity) |
| Agency Onboarding | Immediate activation | Low friction, high conversion | V. UX-First (reduce barriers) |
| Branding Flexibility | 5 fonts + 4 colors | Balance creativity + performance | VI. Simplicity (avoid unlimited options) |
| Token Lifecycle | Auto-expire 7-day, non-regenerable | Security-first, lifecycle discipline | II. Security First (prevent token proliferation) |
| Data Migration | Alias + incremental | Zero downtime, backward compatible | I. No Easy Fixes (proper incremental refactor) |

---

## Remaining Unknowns

**Deferred to Implementation**:
1. **Multi-User Access**: Can multiple users from same agency access account? (Spec notes: optional, defer to future)
2. **Data Retention**: How long to keep event data post-expiration? (Spec notes: optional, default to indefinite retention for MVP)
3. **Payment Integration**: Which payment gateway (Stripe, Paddle, Chargebee)? (Spec notes: external to this feature, tier enforcement only)

**Why Deferred**:
- Not blocking for MVP implementation
- Can be defaulted to sensible behaviors (single-user, indefinite retention, manual billing)
- Clarified in spec as "optional but recommended" (lines 277-279)

---

## References

**Similar SaaS Products**:
- [Notion Pricing & Limits](https://notion.so/pricing) - Freemium tier limits
- [Airtable Plans](https://airtable.com/pricing) - Tier comparison UX
- [Mailchimp Brand Kit](https://mailchimp.com/features/brand-kit/) - Branding customization
- [Stripe API Keys](https://stripe.com/docs/keys) - Token management patterns

**Technical Resources**:
- [PostgreSQL Views](https://postgresql.org/docs/current/sql-createview.html) - Table aliasing for migration
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security) - Multi-tenant isolation
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) - Backend implementation
- [Tailwind CSS Variables](https://tailwindcss.com/docs/customizing-colors#using-css-variables) - Dynamic branding

---

**Status**: ✅ All Phase 0 research complete
**Next Phase**: Phase 1 - Design & Contracts (data-model.md, API contracts, tests)
