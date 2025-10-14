# Data Model: Meeting Hub Portal

**Feature**: 012-dobbiamo-lavorare-al
**Date**: 2025-10-14
**Phase**: 1 (Design & Contracts)

## Overview

This document defines the database schema for transforming ShareHub into "Meeting Hub by 3Civette". The model introduces 3 new entities (Agency/Tenant alias, Subscription, EventBranding) and extends 1 existing entity (AccessToken). All tables enforce multi-tenant isolation via RLS policies.

---

## Entity Relationship Diagram

```
┌─────────────────┐         ┌──────────────────┐
│  agencies       │1────────1│  subscriptions   │
│  (alias:tenants)│         │                  │
└────────┬────────┘         └──────────────────┘
         │ 1
         │
         │ N
┌────────┴────────┐
│  events         │
│  (existing)     │
└────────┬────────┘
         │ 1
         ├────────────┐
         │ 1          │ 1
┌────────┴────────┐  │  ┌──────────────────┐
│  event_branding │  │  │  access_tokens   │
│  (NEW)          │  │  │  (EXTENDED)      │
└─────────────────┘  │  └──────────────────┘
                     │ N
              ┌──────┴──────┐
              │  banners    │
              │  (existing) │
              └─────────────┘
```

---

## Entities

### 1. Agency (Tenant Alias)

**Purpose**: Represents a MICE agency customer (B2B SaaS tenant)

**Table**: `agencies` (VIEW aliasing `tenants` table for backward compatibility)

```sql
-- Phase 1: Create VIEW (backward compatible)
CREATE OR REPLACE VIEW agencies AS SELECT * FROM tenants;

-- Phase 2: Gradual migration (add agency_id columns to related tables)
-- Phase 3: Eventual rename (future feature)
```

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique agency identifier |
| `company_name` | TEXT | NOT NULL, CHECK (length >= 2 AND length <= 100) | Agency legal/trading name |
| `contact_email` | TEXT | NOT NULL, UNIQUE, CHECK (valid email format) | Primary contact & login email |
| `password_hash` | TEXT | NOT NULL | Bcrypt hashed password |
| `phone` | TEXT | NULL | Optional phone number |
| `vat_number` | TEXT | NULL | Optional tax/VAT ID |
| `address` | TEXT | NULL | Optional business address |
| `logo_url` | TEXT | NULL | Supabase Storage URL for agency logo |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last profile update timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_agencies_contact_email ON tenants(contact_email);
CREATE INDEX idx_agencies_created_at ON tenants(created_at DESC);
```

**Validation Rules**:
- `company_name`: 2-100 characters, alphanumeric + spaces + punctuation
- `contact_email`: Valid email format (regex: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
- `password`: Min 8 characters, at least 1 uppercase, 1 lowercase, 1 number (enforced at API level)
- `phone`: Optional, E.164 format if provided (e.g., +39123456789)

**RLS Policies**:
```sql
-- Agencies can only access their own record
CREATE POLICY "agencies_select_own" ON tenants FOR SELECT
  USING (id = app.current_agency_id());

CREATE POLICY "agencies_update_own" ON tenants FOR UPDATE
  USING (id = app.current_agency_id());

-- Public signup (INSERT)
CREATE POLICY "agencies_public_signup" ON tenants FOR INSERT
  WITH CHECK (true); -- Validation handled at API level

-- Helper function
CREATE OR REPLACE FUNCTION app.current_agency_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('app.agency_id', true)::UUID,
    auth.uid() -- Fallback to Supabase auth user ID
  );
$$ LANGUAGE SQL STABLE;
```

**Business Rules**:
1. Cannot be deleted if active events exist (FK constraint with ON DELETE RESTRICT)
2. `contact_email` must be unique across all agencies
3. `updated_at` auto-updated on every PATCH (via trigger)

**Relationships**:
- `has_one` Subscription (1:1, required)
- `has_many` Events (1:N)

---

### 2. Subscription

**Purpose**: Tracks billing tier, usage limits, and tier enforcement for each agency

**Table**: `subscriptions` (NEW)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'professional', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled')) DEFAULT 'active',
  event_limit INTEGER NOT NULL CHECK (event_limit >= -1), -- -1 = unlimited (Enterprise)
  current_event_count INTEGER NOT NULL DEFAULT 0 CHECK (current_event_count >= 0),
  billing_cycle DATE NULL, -- NULL for free tier
  price_monthly DECIMAL(10,2) NULL CHECK (price_monthly >= 0), -- NULL for free tier
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id) -- One subscription per agency
);
```

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique subscription identifier |
| `agency_id` | UUID | FK → tenants(id), UNIQUE | Owning agency (1:1) |
| `tier` | TEXT | ENUM, NOT NULL | Subscription tier |
| `status` | TEXT | ENUM, NOT NULL, DEFAULT 'active' | Billing status |
| `event_limit` | INTEGER | NOT NULL, CHECK >= -1 | Max events (-1 = unlimited) |
| `current_event_count` | INTEGER | NOT NULL, DEFAULT 0 | Current event count |
| `billing_cycle` | DATE | NULL | Next billing date (NULL for free) |
| `price_monthly` | DECIMAL(10,2) | NULL, CHECK >= 0 | Monthly price (NULL for free) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Subscription start date |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last tier change timestamp |

**Tier Configuration**:
| Tier | event_limit | price_monthly | Perks |
|------|-------------|---------------|-------|
| FREE | 3 | €0 | 3 events, basic analytics |
| BASIC | 5 | €29 | 5 events, email support |
| PROFESSIONAL | 20 | €79 | 20 events, custom branding |
| ENTERPRISE | -1 (unlimited) | €199 | Unlimited events, priority support, dedicated account manager |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_subscriptions_agency_id ON subscriptions(agency_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

**Validation Rules**:
- `tier`: Must be one of ['free', 'basic', 'professional', 'enterprise']
- `status`: Must be one of ['active', 'suspended', 'cancelled']
- `current_event_count <= event_limit` (enforced via trigger)
- Cannot downgrade if `current_event_count > new_tier.event_limit`

**RLS Policies**:
```sql
-- Agencies can only access their own subscription
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT
  USING (agency_id = app.current_agency_id());

CREATE POLICY "subscriptions_update_own" ON subscriptions FOR UPDATE
  USING (agency_id = app.current_agency_id());

-- Auto-created on agency signup
CREATE POLICY "subscriptions_auto_create" ON subscriptions FOR INSERT
  WITH CHECK (agency_id = app.current_agency_id());
```

**Business Rules**:
1. Auto-created on agency signup with tier='free', event_limit=3
2. `current_event_count` incremented on event creation, decremented on deletion (via triggers)
3. Event creation blocked if `current_event_count >= event_limit` (enforced at API level)
4. Tier upgrade: Immediate effect, no prorated billing (MVP)
5. Tier downgrade: Requires `current_event_count <= new_tier.event_limit`

**Triggers**:
```sql
-- Auto-create subscription on agency signup
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (agency_id, tier, event_limit, price_monthly)
  VALUES (NEW.id, 'free', 3, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_agency_insert
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- Increment event count on event creation
CREATE OR REPLACE FUNCTION increment_event_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE subscriptions
  SET current_event_count = current_event_count + 1,
      updated_at = NOW()
  WHERE agency_id = NEW.tenant_id; -- Note: Using tenant_id (backward compatible)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_insert
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION increment_event_count();

-- Decrement event count on event deletion
CREATE OR REPLACE FUNCTION decrement_event_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE subscriptions
  SET current_event_count = current_event_count - 1,
      updated_at = NOW()
  WHERE agency_id = OLD.tenant_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_delete
AFTER DELETE ON events
FOR EACH ROW EXECUTE FUNCTION decrement_event_count();
```

**Relationships**:
- `belongs_to` Agency (1:1, required)

---

### 3. EventBranding

**Purpose**: Stores custom visual identity (logo, colors, font) for each event

**Table**: `event_branding` (NEW)

```sql
CREATE TABLE event_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url TEXT NULL, -- Supabase Storage path
  primary_color TEXT NOT NULL DEFAULT '#2563EB' CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color TEXT NOT NULL DEFAULT '#7C3AED' CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color TEXT NOT NULL DEFAULT '#F59E0B' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color TEXT NOT NULL DEFAULT '#F8FAFC' CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_family TEXT NOT NULL DEFAULT 'inter' CHECK (font_family IN ('inter', 'merriweather', 'poppins', 'roboto', 'playfair')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id) -- One branding per event (1:1)
);
```

**Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique branding config ID |
| `event_id` | UUID | FK → events(id), UNIQUE | Event this branding applies to (1:1) |
| `agency_id` | UUID | FK → tenants(id) | Owning agency (for RLS) |
| `logo_url` | TEXT | NULL | Supabase Storage URL (NULL = use 3Civette logo) |
| `primary_color` | TEXT | CHECK hex format, DEFAULT 3Civette | Main brand color |
| `secondary_color` | TEXT | CHECK hex format, DEFAULT 3Civette | Complementary color |
| `accent_color` | TEXT | CHECK hex format, DEFAULT 3Civette | Highlight/CTA color |
| `background_color` | TEXT | CHECK hex format, DEFAULT 3Civette | Page background color |
| `font_family` | TEXT | ENUM, DEFAULT 'inter' | Font preset |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Branding config creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last branding update timestamp |

**Font Presets**:
| font_family | Description | Use Case |
|-------------|-------------|----------|
| `inter` | Sans-serif, modern, readable | Default, corporate events |
| `merriweather` | Serif, elegant, classic | Formal conferences |
| `poppins` | Geometric, friendly, modern | Creative/tech events |
| `roboto` | Neutral, versatile, clean | Multi-purpose |
| `playfair` | Display serif, luxurious | High-end events |

**Default Colors (3Civette Palette)**:
- `primary_color`: #2563EB (Blue)
- `secondary_color`: #7C3AED (Purple)
- `accent_color`: #F59E0B (Amber)
- `background_color`: #F8FAFC (Light Gray)

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_event_branding_event_id ON event_branding(event_id);
CREATE INDEX idx_event_branding_agency_id ON event_branding(agency_id);
```

**Validation Rules**:
- All color fields: Must match hex format `^#[0-9A-Fa-f]{6}$`
- `font_family`: Must be one of 5 preset values
- `logo_url`: If provided, must be Supabase Storage URL pattern `^storage/.*\.(jpg|png|svg)$`
- Logo file: Max 2MB, JPEG/PNG/SVG only (enforced at upload API)

**RLS Policies**:
```sql
-- Agencies can access branding for their own events
CREATE POLICY "event_branding_select_own" ON event_branding FOR SELECT
  USING (agency_id = app.current_agency_id());

CREATE POLICY "event_branding_insert_own" ON event_branding FOR INSERT
  WITH CHECK (agency_id = app.current_agency_id());

CREATE POLICY "event_branding_update_own" ON event_branding FOR UPDATE
  USING (agency_id = app.current_agency_id());

CREATE POLICY "event_branding_delete_own" ON event_branding FOR DELETE
  USING (agency_id = app.current_agency_id());
```

**Business Rules**:
1. If no branding exists for an event, frontend uses 3Civette defaults
2. Branding applies ONLY to public event pages, not admin interfaces
3. Logo upload creates Supabase Storage object in `logos/` bucket
4. Color changes take effect immediately (no caching)
5. Font changes require page refresh (fonts loaded via `<link>` tags)

**Relationships**:
- `belongs_to` Event (1:1, required)
- `belongs_to` Agency (for RLS enforcement)

---

### 4. AccessToken (Extended)

**Purpose**: Extends existing token system with auto-expiration 7 days post-event

**Table**: `access_tokens` (EXISTING, extend with new fields)

```sql
-- Migration: Add new fields to existing table
ALTER TABLE access_tokens
  ADD COLUMN token_type TEXT CHECK (token_type IN ('slide_upload', 'participant_access')),
  ADD COLUMN auto_expire_date TIMESTAMPTZ NOT NULL CHECK (auto_expire_date > created_at);

-- Backfill existing tokens
UPDATE access_tokens t
SET
  token_type = 'participant_access', -- Default for existing tokens
  auto_expire_date = (SELECT event_date + INTERVAL '7 days' FROM events WHERE id = t.event_id)
WHERE auto_expire_date IS NULL;
```

**New Fields**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `token_type` | TEXT | ENUM, NOT NULL | 'slide_upload' or 'participant_access' |
| `auto_expire_date` | TIMESTAMPTZ | NOT NULL, CHECK > created_at | Computed as event_date + 7 days |

**Existing Fields** (retained):
- `id` (UUID PK)
- `event_id` (UUID FK → events)
- `token` (TEXT UNIQUE) - 21-char nanoid
- `created_at` (TIMESTAMPTZ)
- `last_used_at` (TIMESTAMPTZ NULL)
- `use_count` (INTEGER DEFAULT 0)

**Validation Rules**:
- `token_type`: Must be 'slide_upload' or 'participant_access'
- `auto_expire_date`: Must be exactly `event_date + 7 days` (enforced via trigger)
- Token cannot be regenerated once created (no UPDATE policy)

**RLS Policies** (extend existing):
```sql
-- Agencies can only access tokens for their events
CREATE POLICY "access_tokens_select_own" ON access_tokens FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE tenant_id = app.current_agency_id()
  ));

-- Public can validate tokens (for upload/download)
CREATE POLICY "access_tokens_public_validate" ON access_tokens FOR SELECT
  USING (NOW() < auto_expire_date); -- Only non-expired tokens visible

-- Tokens auto-created on event creation (2 per event)
CREATE POLICY "access_tokens_auto_create" ON access_tokens FOR INSERT
  WITH CHECK (event_id IN (
    SELECT id FROM events WHERE tenant_id = app.current_agency_id()
  ));
```

**Business Rules**:
1. Exactly 2 tokens created per event: 1 slide_upload, 1 participant_access
2. Tokens auto-expire 7 days after `events.event_date`
3. Expired tokens cannot be used for uploads/downloads (enforced at API level)
4. Tokens are non-regenerable (no UPDATE/DELETE policies)
5. `use_count` incremented on each upload/download (for analytics)

**Triggers**:
```sql
-- Auto-create 2 tokens on event creation
CREATE OR REPLACE FUNCTION create_event_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Slide upload token
  INSERT INTO access_tokens (event_id, token_type, token, auto_expire_date)
  VALUES (
    NEW.id,
    'slide_upload',
    generate_nanoid(21),
    NEW.event_date + INTERVAL '7 days'
  );

  -- Participant access token
  INSERT INTO access_tokens (event_id, token_type, token, auto_expire_date)
  VALUES (
    NEW.id,
    'participant_access',
    generate_nanoid(21),
    NEW.event_date + INTERVAL '7 days'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_insert_tokens
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION create_event_tokens();

-- Update auto_expire_date if event date changes
CREATE OR REPLACE FUNCTION update_token_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_date <> OLD.event_date THEN
    UPDATE access_tokens
    SET auto_expire_date = NEW.event_date + INTERVAL '7 days',
        updated_at = NOW()
    WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_date_change
AFTER UPDATE OF event_date ON events
FOR EACH ROW EXECUTE FUNCTION update_token_expiration();
```

**Relationships**:
- `belongs_to` Event (N:1, 2 per event)

---

## Migration Strategy

### Phase 1: Backward Compatible Changes
1. Create `agencies` VIEW aliasing `tenants`
2. Create `subscriptions` table
3. Create `event_branding` table
4. Extend `access_tokens` with `token_type` and `auto_expire_date`
5. Create all RLS policies
6. Create all triggers

### Phase 2: Data Backfill
1. Backfill `subscriptions` for existing tenants (tier='free')
2. Backfill `access_tokens.auto_expire_date` from event dates
3. Validate data integrity (no NULL constraints violated)

### Phase 3: Code Migration
1. Update new API routes to use `agencies` VIEW
2. Update frontend contexts (`AgencyContext` replacing `TenantContext`)
3. Update existing branding system to store in `event_branding` table
4. Update token validation logic to check `auto_expire_date`

### Phase 4: Cleanup (Future)
1. Deprecate `tenant_id` references in favor of `agency_id`
2. Rename `tenants` → `agencies` (breaking change, major version)

---

## Testing Strategy

### Unit Tests (Database)
- Test all CHECK constraints (hex colors, tier enums, event limits)
- Test all triggers (subscription creation, event count, token generation)
- Test all RLS policies (cross-tenant isolation)

### Integration Tests (API + DB)
- **Agency Onboarding**: Signup → Auto-create subscription → Verify tier limits
- **Tier Enforcement**: Create 3 events (FREE tier) → Block 4th → Upgrade → Create 4th
- **Branding Customization**: Upload logo → Set colors → Verify public page reflects changes
- **Token Expiration**: Create event → Mock 7 days later → Verify tokens rejected

### Contract Tests
- All API endpoints match OpenAPI contracts (see `contracts/*.yaml`)
- Request/response schemas validated
- Error codes match specification

---

## Performance Considerations

**Indexes**:
- All FK columns indexed for join performance
- `agencies.contact_email` unique index for signup validation
- `subscriptions.agency_id` unique index for tier lookups
- `event_branding.event_id` unique index for branding queries

**Query Optimization**:
- Use `agencies` VIEW for reads (zero overhead vs direct table)
- Cache subscription tier in API context (avoid repeated lookups)
- Preload branding with event queries (1 JOIN vs N+1 queries)

**Scalability**:
- Partitioning: Not needed for MVP (estimate: 500 agencies × 10 events = 5K events)
- Archival: Soft delete events after 1 year (add `deleted_at` column)
- Token cleanup: Cron job to DELETE expired tokens older than 90 days

---

## Security Considerations

**RLS Policies**:
- All new tables have agency-scoped SELECT/UPDATE/DELETE policies
- Public policies only for signup (INSERT on `agencies`) and token validation (SELECT on `access_tokens`)
- No cross-tenant data leakage (verified in integration tests)

**Sensitive Data**:
- `password_hash`: Bcrypt with cost factor 12 (never exposed via API)
- `contact_email`: Indexed but not exposed in public APIs (agency dashboard only)
- Tokens: 21-char nanoid (26^21 = 2^109 bits entropy, collision-resistant)

**Rate Limiting**:
- Agency signup: 5 attempts per IP per hour (enforced at API level)
- Logo upload: 10 uploads per agency per day
- Token validation: 100 validations per token per hour (prevent brute-force)

---

**Status**: ✅ Data model complete
**Next Step**: Generate API contracts (`contracts/*.yaml`)
