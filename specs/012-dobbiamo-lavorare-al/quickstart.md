# Quickstart: Meeting Hub Portal - User Journey Validation

**Feature**: 012-dobbiamo-lavorare-al (B2B SaaS Transformation)
**Date**: 2025-10-14
**Purpose**: Manual test scenarios to validate agency onboarding, tier enforcement, and branding customization

---

## Prerequisites

### 1. Database Setup
- [ ] Supabase project running (local or hosted)
- [ ] All migrations applied:
  - `20251014_create_agencies_table.sql` (or `agencies` VIEW created)
  - `20251014_create_subscriptions_table.sql`
  - `20251014_create_event_branding_table.sql`
  - `20251014_extend_access_tokens.sql`
  - All RLS policies enabled
  - All triggers created (subscription auto-creation, event count, token generation)

### 2. Environment Variables
Create `.env.local` in `frontend/` with:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install Dependencies
```bash
cd frontend
npm install
```

### 4. Start Development Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

### 5. Verify Database State
Run in Supabase SQL Editor:
```sql
-- Check agencies VIEW exists
SELECT * FROM agencies LIMIT 1;

-- Check subscriptions table exists
SELECT * FROM subscriptions LIMIT 1;

-- Check event_branding table exists
SELECT * FROM event_branding LIMIT 1;

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'subscriptions', 'event_branding', 'access_tokens');
-- All should show rowsecurity = true
```

---

## Test Scenario 1: Agency Onboarding Flow

**Goal**: Verify complete signup → auto-subscription → first event creation

### 1.1 Agency Signup

**Action**: POST to `/api/agencies/signup`
```bash
curl -X POST http://localhost:3000/api/agencies/signup \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "MICE Events Test",
    "contact_email": "test@miceevents.test",
    "password": "TestPass123!",
    "phone": "+393451234567"
  }'
```

**Expected Result**:
- HTTP 201 Created
- Response body contains:
  ```json
  {
    "agency_id": "<UUID>",
    "company_name": "MICE Events Test",
    "contact_email": "test@miceevents.test",
    "subscription": {
      "tier": "free",
      "event_limit": 3,
      "current_event_count": 0,
      "status": "active"
    },
    "created_at": "<ISO timestamp>"
  }
  ```

**Verify in Database**:
```sql
-- Check agency created
SELECT id, company_name, contact_email, created_at
FROM agencies
WHERE contact_email = 'test@miceevents.test';

-- Check subscription auto-created
SELECT s.id, s.tier, s.event_limit, s.current_event_count, s.status
FROM subscriptions s
JOIN agencies a ON s.agency_id = a.id
WHERE a.contact_email = 'test@miceevents.test';
-- Should show: tier='free', event_limit=3, current_event_count=0
```

**Pass Criteria**:
- [x] Agency record exists in database
- [x] Subscription auto-created with FREE tier
- [x] `password_hash` stored (not plaintext)
- [x] `current_event_count` is 0

### 1.2 Login & Get Profile

**Action**: Authenticate and fetch profile
```bash
# Login (Supabase Auth)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@miceevents.test",
    "password": "TestPass123!"
  }'
# Save JWT token from response

# Get profile
curl -X GET http://localhost:3000/api/agencies/profile \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected Result**:
- HTTP 200 OK
- Profile matches signup data
- `logo_url` is null (not uploaded yet)

**Pass Criteria**:
- [x] JWT authentication works
- [x] Profile data correct
- [x] RLS allows agency to access own profile

### 1.3 Create First Event

**Action**: POST to `/api/events` (existing endpoint)
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Conference 2025",
    "event_date": "2025-12-15",
    "location": "Milan Convention Center",
    "description": "Annual tech conference"
  }'
```

**Expected Result**:
- HTTP 201 Created
- Event created with agency's `tenant_id`

**Verify Event Count Updated**:
```sql
-- Check event count incremented
SELECT s.current_event_count, s.event_limit
FROM subscriptions s
JOIN agencies a ON s.agency_id = a.id
WHERE a.contact_email = 'test@miceevents.test';
-- Should show: current_event_count=1, event_limit=3
```

**Pass Criteria**:
- [x] Event created successfully
- [x] Subscription `current_event_count` incremented to 1
- [x] 2 access tokens auto-generated (1 slide_upload, 1 participant_access)

### 1.4 Verify Token Auto-Creation

**Action**: Check tokens in database
```sql
SELECT
  t.id,
  t.token,
  t.token_type,
  t.auto_expire_date,
  e.event_date
FROM access_tokens t
JOIN events e ON t.event_id = e.id
WHERE e.name = 'Tech Conference 2025';
-- Should return 2 tokens
-- auto_expire_date should be event_date + 7 days
```

**Expected Result**:
- 2 tokens exist
- `token_type` values: `slide_upload`, `participant_access`
- `auto_expire_date` = `2025-12-22` (event_date + 7 days)

**Pass Criteria**:
- [x] 2 tokens created automatically
- [x] Token expiration correctly calculated
- [x] Tokens have unique 21-char nanoid values

---

## Test Scenario 2: Tier Limit Enforcement

**Goal**: Verify FREE tier blocks 4th event and upgrade enables creation

### 2.1 Create Events Until Limit

**Action**: Create 2 more events (total = 3)
```bash
# Event 2
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing Summit 2025",
    "event_date": "2025-11-20",
    "location": "Rome Hotel"
  }'

# Event 3
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Kickoff 2026",
    "event_date": "2026-01-10",
    "location": "Florence Convention Center"
  }'
```

**Expected Result**:
- Both events created (HTTP 201)
- Subscription `current_event_count` now 3

**Verify**:
```sql
SELECT s.current_event_count, s.event_limit, s.tier
FROM subscriptions s
JOIN agencies a ON s.agency_id = a.id
WHERE a.contact_email = 'test@miceevents.test';
-- Should show: current_event_count=3, event_limit=3, tier='free'
```

**Pass Criteria**:
- [x] Event count is 3
- [x] Tier is 'free'
- [x] At limit (3/3 events)

### 2.2 Attempt to Create 4th Event (Should Block)

**Action**: Try creating 4th event
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blocked Event",
    "event_date": "2026-02-15",
    "location": "Venice"
  }'
```

**Expected Result**:
- HTTP 403 Forbidden
- Error response:
  ```json
  {
    "error": "EVENT_LIMIT_REACHED",
    "message": "FREE tier allows max 3 events. Upgrade to create more.",
    "details": {
      "current_count": 3,
      "limit": 3,
      "tier": "free",
      "upgrade_url": "/admin/subscription"
    }
  }
  ```

**Pass Criteria**:
- [x] Request blocked with 403
- [x] Error message guides user to upgrade
- [x] Event NOT created in database

### 2.3 Get Subscription Status

**Action**: Check current subscription
```bash
curl -X GET http://localhost:3000/api/subscriptions/current \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected Result**:
```json
{
  "id": "<UUID>",
  "tier": "free",
  "status": "active",
  "event_limit": 3,
  "current_event_count": 3,
  "usage_percent": 100,
  "events_remaining": 0,
  "price_monthly": 0.00,
  "billing_cycle": null,
  "can_create_event": false,
  "upgrade_available": true,
  "created_at": "<timestamp>",
  "updated_at": "<timestamp>"
}
```

**Pass Criteria**:
- [x] `usage_percent` is 100
- [x] `can_create_event` is false
- [x] `upgrade_available` is true

### 2.4 Upgrade to Basic Tier

**Action**: POST to `/api/subscriptions/upgrade`
```bash
curl -X POST http://localhost:3000/api/subscriptions/upgrade \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "target_tier": "basic"
  }'
```

**Expected Result**:
- HTTP 200 OK
- Response:
  ```json
  {
    "message": "Subscription upgraded successfully",
    "previous_tier": "free",
    "new_tier": "basic",
    "new_event_limit": 5,
    "price_monthly": 29.00,
    "billing_cycle": "2025-11-14",
    "effective_date": "<timestamp>"
  }
  ```

**Verify**:
```sql
SELECT s.tier, s.event_limit, s.current_event_count, s.price_monthly
FROM subscriptions s
JOIN agencies a ON s.agency_id = a.id
WHERE a.contact_email = 'test@miceevents.test';
-- Should show: tier='basic', event_limit=5, current_event_count=3, price_monthly=29.00
```

**Pass Criteria**:
- [x] Tier upgraded to 'basic'
- [x] Event limit now 5
- [x] Current event count unchanged (3)
- [x] Price set to €29/month

### 2.5 Create 4th Event (Should Succeed)

**Action**: Retry creating 4th event
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Now Allowed Event",
    "event_date": "2026-02-15",
    "location": "Venice"
  }'
```

**Expected Result**:
- HTTP 201 Created
- Event created successfully

**Verify**:
```sql
SELECT COUNT(*) as event_count
FROM events e
JOIN agencies a ON e.tenant_id = a.id
WHERE a.contact_email = 'test@miceevents.test';
-- Should show: event_count=4

SELECT s.current_event_count, s.event_limit
FROM subscriptions s
JOIN agencies a ON s.agency_id = a.id
WHERE a.contact_email = 'test@miceevents.test';
-- Should show: current_event_count=4, event_limit=5
```

**Pass Criteria**:
- [x] Event created successfully
- [x] Event count incremented to 4
- [x] Still under new limit (4/5)

---

## Test Scenario 3: Branding Customization

**Goal**: Verify logo upload + color/font customization + preview rendering

### 3.1 Get Default Branding

**Action**: Fetch branding for first event
```bash
# Get event ID
EVENT_ID=$(curl -s -X GET http://localhost:3000/api/events \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  | jq -r '.events[0].id')

# Get branding
curl -X GET http://localhost:3000/api/events/$EVENT_ID/branding \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected Result**:
- HTTP 200 OK
- Default 3Civette branding:
  ```json
  {
    "id": null,
    "event_id": "<UUID>",
    "logo_url": null,
    "primary_color": "#2563EB",
    "secondary_color": "#7C3AED",
    "accent_color": "#F59E0B",
    "background_color": "#F8FAFC",
    "font_family": "inter",
    "is_customized": false,
    "created_at": null,
    "updated_at": null
  }
  ```

**Pass Criteria**:
- [x] Returns 200 even without custom branding
- [x] Defaults to 3Civette palette
- [x] `is_customized` is false

### 3.2 Upload Event Logo

**Action**: Upload logo image
```bash
# Create test image file (or use existing)
# For testing, use a small PNG/JPEG file

curl -X POST http://localhost:3000/api/events/$EVENT_ID/branding/logo \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@test-logo.png"
```

**Expected Result**:
- HTTP 200 OK
- Response:
  ```json
  {
    "logo_url": "https://supabase.co/storage/v1/object/public/logos/event-<UUID>-<timestamp>.png",
    "file_size": 245632,
    "mime_type": "image/png",
    "uploaded_at": "<timestamp>",
    "branding_updated": true
  }
  ```

**Verify**:
```sql
SELECT logo_url, is_customized
FROM event_branding
WHERE event_id = '<EVENT_ID>';
-- Should show: logo_url populated, no row if using default (needs PUT first)
```

**Pass Criteria**:
- [x] Logo uploaded to Supabase Storage
- [x] URL returned in response
- [x] File size within 2MB limit

### 3.3 Customize Color Palette

**Action**: Update colors
```bash
curl -X PUT http://localhost:3000/api/events/$EVENT_ID/branding \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "primary_color": "#1E40AF",
    "secondary_color": "#9333EA",
    "accent_color": "#EAB308",
    "background_color": "#FFFFFF"
  }'
```

**Expected Result**:
- HTTP 200 OK
- Updated branding returned with new colors
- `is_customized` is true

**Verify**:
```sql
SELECT primary_color, secondary_color, accent_color, background_color
FROM event_branding
WHERE event_id = '<EVENT_ID>';
-- Should show new color values
```

**Pass Criteria**:
- [x] Colors saved to database
- [x] Hex format validated
- [x] `updated_at` timestamp updated

### 3.4 Change Font Family

**Action**: Update font preset
```bash
curl -X PUT http://localhost:3000/api/events/$EVENT_ID/branding \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "font_family": "poppins"
  }'
```

**Expected Result**:
- HTTP 200 OK
- `font_family` updated to "poppins"
- Other fields unchanged (partial update)

**Pass Criteria**:
- [x] Font family updated
- [x] Enum validation enforces allowed fonts
- [x] Colors unchanged

### 3.5 Preview Branding on Public Event Page

**Action**: Navigate to public event page
```bash
# Get event slug
EVENT_SLUG=$(curl -s -X GET http://localhost:3000/api/events \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  | jq -r '.events[0].slug')

# Open in browser or fetch HTML
curl http://localhost:3000/events/$EVENT_SLUG
```

**Expected Result**:
- Page renders with custom branding:
  - Custom logo displayed in header
  - Primary color applied to headings/buttons
  - Secondary color applied to links
  - Accent color applied to CTAs
  - Background color applied to body
  - Font family loaded and applied

**Manual Verification** (open in browser):
1. Open `http://localhost:3000/events/<slug>`
2. Inspect element styles
3. Verify CSS custom properties:
   ```css
   :root {
     --color-primary: #1E40AF;
     --color-secondary: #9333EA;
     --color-accent: #EAB308;
     --color-background: #FFFFFF;
   }
   ```
4. Verify font family applied to `<body>` or root element

**Pass Criteria**:
- [x] Custom logo visible
- [x] Colors match database values
- [x] Font family applied
- [x] Branding isolated to this event (not affecting others)

---

## Test Scenario 4: Token Auto-Expiration

**Goal**: Verify tokens expire 7 days post-event and validation fails

### 4.1 Check Token Expiration Date

**Action**: Query token expiration
```sql
SELECT
  e.name as event_name,
  e.event_date,
  t.token,
  t.token_type,
  t.auto_expire_date,
  (t.auto_expire_date - e.event_date) as days_after_event
FROM access_tokens t
JOIN events e ON t.event_id = e.id
WHERE e.name = 'Tech Conference 2025';
-- Should show: days_after_event = 7 days
```

**Expected Result**:
- `auto_expire_date` = `event_date` + 7 days
- Formula: `2025-12-15` + 7 = `2025-12-22`

**Pass Criteria**:
- [x] Expiration correctly calculated on creation
- [x] Both tokens have same expiration date

### 4.2 Mock Date to Post-Expiration

**Action**: Manually update event date to simulate expiration
```sql
-- Move event to past + 8 days ago (beyond 7-day window)
UPDATE events
SET event_date = CURRENT_DATE - INTERVAL '8 days'
WHERE name = 'Tech Conference 2025';

-- Trigger should update token expiration
SELECT
  e.event_date,
  t.auto_expire_date,
  (t.auto_expire_date < NOW()) as is_expired
FROM access_tokens t
JOIN events e ON t.event_id = e.id
WHERE e.name = 'Tech Conference 2025';
-- Should show: is_expired = true
```

**Pass Criteria**:
- [x] Token expiration updated when event date changes
- [x] Tokens now expired (auto_expire_date < NOW())

### 4.3 Attempt to Use Expired Token

**Action**: Try validating expired token
```bash
# Get expired token
EXPIRED_TOKEN=$(curl -s -X GET http://localhost:3000/api/events \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  | jq -r '.events[0].tokens[0].token')

# Attempt to use token (e.g., upload slide)
curl -X POST http://localhost:3000/api/slides/upload \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "token=$EXPIRED_TOKEN" \
  -F "file=@test-slide.pdf"
```

**Expected Result**:
- HTTP 403 Forbidden
- Error response:
  ```json
  {
    "error": "TOKEN_EXPIRED",
    "message": "This token expired on 2025-12-22. Tokens cannot be regenerated.",
    "details": {
      "token": "<redacted>",
      "expired_at": "2025-12-22T23:59:59Z",
      "event_date": "2025-12-15"
    }
  }
  ```

**Pass Criteria**:
- [x] Expired token rejected
- [x] Clear error message
- [x] No upload occurred

### 4.4 Verify Tokens Cannot Be Regenerated

**Action**: Attempt to update/regenerate token
```sql
-- Try to update token (should fail due to RLS policy)
UPDATE access_tokens
SET token = 'new-token-123456789012'
WHERE token = '<EXPIRED_TOKEN>';
-- Should return: 0 rows affected (RLS blocks UPDATE)
```

**Pass Criteria**:
- [x] UPDATE policy blocks token modification
- [x] No DELETE policy exists (tokens immutable)
- [x] Expired tokens remain in DB for audit trail

---

## Troubleshooting

### Database Issues

**Problem**: RLS policies blocking queries
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('tenants', 'subscriptions', 'event_branding', 'access_tokens');

-- Verify policies exist
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('subscriptions', 'event_branding', 'access_tokens');
```

**Solution**: Re-run RLS migration files

---

**Problem**: Subscription not auto-created on signup
```sql
-- Check trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'after_agency_insert';
```

**Solution**: Re-create trigger:
```sql
CREATE TRIGGER after_agency_insert
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_default_subscription();
```

---

**Problem**: Event count not incrementing
```sql
-- Check event count trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'after_event_insert';
```

**Solution**: Re-create event count triggers (see data-model.md)

---

### API Issues

**Problem**: 401 Unauthorized on all authenticated requests
- Verify JWT token is valid (check expiration)
- Ensure `Authorization: Bearer <token>` header format
- Check Supabase project URL/keys in `.env.local`

**Problem**: 403 Forbidden when creating event (even with capacity)
- Verify subscription status is 'active' (not 'suspended' or 'cancelled')
- Check `current_event_count < event_limit` in database
- Ensure agency owns the event (tenant_id matches)

**Problem**: File upload returns 413
- Check file size <= 2MB
- Verify nginx `client_max_body_size` if using reverse proxy
- Check Supabase Storage quota (free tier limits)

---

### Branding Issues

**Problem**: Custom branding not appearing on public page
- Verify `event_branding` record exists for event
- Check CSS custom properties in browser DevTools
- Clear browser cache (branding may be cached)
- Ensure font family is loaded (check Network tab for font file requests)

**Problem**: Logo upload succeeds but image not visible
- Verify Supabase Storage bucket is public
- Check `logo_url` in database is valid HTTPS URL
- Test URL directly in browser (should download image)

---

## Performance Validation

After completing all scenarios, verify performance targets:

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Agency signup | < 2s | Time from POST to 201 response |
| Dashboard load (20 events) | < 1.5s | Time to interactive |
| Branding preview | < 500ms | Color/font change to render |
| Event creation | < 3s | POST to database insert complete |

**Measurement Tools**:
- Browser DevTools Network tab
- `curl` with `-w "%{time_total}"` flag
- PostgreSQL `EXPLAIN ANALYZE` for slow queries

---

## Cleanup

After testing, clean up test data:
```sql
-- Delete test agency (CASCADE deletes subscription, events, branding, tokens)
DELETE FROM tenants
WHERE contact_email = 'test@miceevents.test';

-- Verify cleanup
SELECT COUNT(*) FROM subscriptions WHERE agency_id NOT IN (SELECT id FROM tenants);
SELECT COUNT(*) FROM event_branding WHERE agency_id NOT IN (SELECT id FROM tenants);
-- Both should return 0 (orphaned records)
```

---

## Success Criteria Summary

**Scenario 1 (Agency Onboarding)**:
- [x] Agency signup creates account + FREE subscription
- [x] Login and profile retrieval work
- [x] First event creation increments event count
- [x] Access tokens auto-generated with correct expiration

**Scenario 2 (Tier Enforcement)**:
- [x] FREE tier blocks 4th event creation
- [x] Upgrade to Basic succeeds and increases limit
- [x] 4th event creation works after upgrade
- [x] Event count tracking accurate

**Scenario 3 (Branding)**:
- [x] Default branding returned for uncustomized events
- [x] Logo upload stores file in Supabase Storage
- [x] Color palette customization saves and validates
- [x] Font family updates correctly
- [x] Public page renders custom branding

**Scenario 4 (Token Expiration)**:
- [x] Tokens expire 7 days post-event
- [x] Expiration updates when event date changes
- [x] Expired tokens rejected by validation
- [x] Tokens cannot be regenerated (immutable)

---

**All Scenarios Passed**: ✅ Feature ready for production
**Any Scenario Failed**: ⚠️ Review implementation, check logs, verify database state
