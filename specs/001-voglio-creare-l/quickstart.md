# Quickstart: Hotel Admin Dashboard

**Feature**: Hotel Admin Dashboard
**Purpose**: Validation script for testing the complete hotel admin dashboard user journey
**Date**: 2025-10-06

## Prerequisites

- Backend running on `http://localhost:3001`
- Frontend running on `http://localhost:3000`
- Test tenant with admin user created
- Database migrations applied

## Test Credentials

**Admin User**:
- Email: `admin@sharehub.test`
- Password: `ShareHub2025!`
- Tenant: Test Hotel (ID: `523c2648-f980-4c9e-8e53-93d812cfa79f`)

---

## User Journey Validation

### Step 1: Login and Dashboard Redirect

**Action**:
1. Navigate to `http://localhost:3000/login`
2. Enter test credentials
3. Click "Accedi" (Login)

**Expected Result**:
- ✅ Redirect to `http://localhost:3000/admin/dashboard`
- ✅ Dashboard page loads successfully
- ✅ Hotel name "Test Hotel" displayed in header
- ✅ Logout button visible in top-right corner

**Verification**:
```bash
# Check browser console for errors (should be clean)
# Check network tab: POST /auth/v1/token should return 200
```

---

### Step 2: Dashboard Metrics Display

**Action**:
1. Observe dashboard content

**Expected Result**:
- ✅ "Active Events" metric card displays count (e.g., "2 Active Events")
- ✅ "Last Activity" timestamp displayed (e.g., "5 minutes ago")
- ✅ Metric cards show trend indicators (up/down arrows or sparklines)

**Verification**:
```bash
# Check API call in Network tab:
GET /api/dashboard/metrics/523c2648-f980-4c9e-8e53-93d812cfa79f
# Response should match:
{
  "active_events_count": 2,
  "last_activity_at": "2025-10-06T14:30:00Z"
}
```

---

### Step 3: Recent Activity Log

**Action**:
1. Scroll to "Recent Activity" section on dashboard

**Expected Result**:
- ✅ List shows 3-5 most recent activities
- ✅ Each activity shows: icon, action description, timestamp
- ✅ Example: "Admin created event 'Tech Conference 2025'" - "2 hours ago"

**Verification**:
```bash
# Check API call:
GET /api/dashboard/activity/523c2648-f980-4c9e-8e53-93d812cfa79f?limit=5
# Response should contain activities array with 3-5 items
```

---

### Step 4: Quick Actions - Create Event

**Action**:
1. Click "Create New Event" button on dashboard

**Expected Result**:
- ✅ Navigate to `/admin/events/create`
- ✅ Event creation form loads
- ✅ Form includes fields: title, description, date, type (public/private)

**Verification**:
```bash
# Check URL changed to /admin/events/create
# Form should be visible with all required fields
```

---

### Step 5: Event Creation and Token Generation

**Action**:
1. Fill in event form:
   - Title: "Test Event from Quickstart"
   - Description: "Testing token generation"
   - Date: Tomorrow's date
   - Type: Public
2. Click "Save Event"

**Expected Result**:
- ✅ Event saved successfully
- ✅ Success message displayed
- ✅ Redirect to event details page `/admin/events/[eventId]`
- ✅ Two tokens visible:
  - Organizer Token (with copy button)
  - Participant Token (with copy button)

**Verification**:
```bash
# Check API call:
POST /api/events
# Response should include:
{
  "id": "uuid",
  "organizer_token": "V1StGXR8...",
  "participant_token": "A2BcDeFg..."
}

# Verify tokens on detail page
GET /api/events/{eventId}/tokens
```

---

### Step 6: Token Copy Functionality

**Action**:
1. On event details page, click "Copy" button next to Organizer Token

**Expected Result**:
- ✅ Button text changes to "Copiato!" (Copied!)
- ✅ Token copied to clipboard
- ✅ After 2 seconds, button text reverts to "Copia" (Copy)

**Verification**:
```bash
# Paste clipboard content into text editor
# Should match the displayed organizer token exactly
```

---

### Step 7: Navigation to Branding Page

**Action**:
1. Click "Branding" in dashboard navigation menu

**Expected Result**:
- ✅ Navigate to `/admin/branding`
- ✅ Page shows hotel branding configuration interface
- ✅ Current branding values displayed:
  - Primary color (color picker)
  - Secondary color (color picker)
  - Logo (upload area)
  - Advertisements (list/add interface)

**Verification**:
```bash
# Check API call:
GET /api/tenants/523c2648-f980-4c9e-8e53-93d812cfa79f/branding
# Response should contain current branding_config
```

---

### Step 8: Modify Hotel Branding

**Action**:
1. On branding page, change primary color from blue to green (#10B981)
2. Observe preview area

**Expected Result**:
- ✅ Color picker updates to green
- ✅ Preview updates IMMEDIATELY (no save needed yet)
- ✅ Preview shows buttons/headings in new green color

**Verification**:
```bash
# Check CSS custom properties in DevTools:
# --color-primary should update to #10B981 in real-time
```

---

### Step 9: Save Hotel Branding

**Action**:
1. Click "Save Changes" button

**Expected Result**:
- ✅ Success message displayed: "Branding updated successfully"
- ✅ New branding persisted

**Verification**:
```bash
# Check API call:
PUT /api/tenants/523c2648-f980-4c9e-8e53-93d812cfa79f/branding
# Request body:
{
  "branding_config": {
    "colors": {"primary": "#10B981", "secondary": "#10B981"},
    ...
  }
}
# Response: {"success": true}

# Reload page - green branding should persist
```

---

### Step 10: Event-Specific Branding Override

**Action**:
1. Navigate back to event details (`/admin/events/[eventId]`)
2. Click "Edit Branding" or similar option
3. Change logo customization flag:
   - Set "Logo Customizable" toggle to OFF
   - Upload a different logo for this event

**Expected Result**:
- ✅ Branding override interface loads
- ✅ Shows which elements inherit from hotel (grayed out) vs customized
- ✅ Logo override saved
- ✅ Customization flag for logo set to `false`

**Verification**:
```bash
# Check API call:
PUT /api/events/{eventId}/branding
# Request body includes:
{
  "branding_overrides": {
    "logo_url": {
      "value": "https://...",
      "customizable": false
    }
  }
}
```

---

### Step 11: Verify Dashboard Update After Actions

**Action**:
1. Navigate back to dashboard (`/admin/dashboard`)
2. Observe metrics and activity log

**Expected Result**:
- ✅ Active events count increased by 1 (new event created)
- ✅ Last activity timestamp updated to "just now"
- ✅ Activity log shows recent actions:
  - "Admin created event 'Test Event from Quickstart'"
  - "Admin updated branding"

**Verification**:
```bash
# Metrics should reflect new event
GET /api/dashboard/metrics/523c2648-f980-4c9e-8e53-93d812cfa79f
# active_events_count should be +1 from before

# Activity log should show new entries
GET /api/dashboard/activity/523c2648-f980-4c9e-8e53-93d812cfa79f?limit=5
```

---

### Step 12: Logout

**Action**:
1. Click "Esci" (Logout) button in header

**Expected Result**:
- ✅ Redirect to homepage `/`
- ✅ Session cleared
- ✅ Attempting to visit `/admin/dashboard` redirects to `/login`

**Verification**:
```bash
# Check auth cookies cleared in DevTools Application tab
# Direct navigation to /admin/* should redirect to /login
```

---

## Success Criteria

All steps must pass with ✅ to consider the feature complete. If any step fails:
1. Note the failing step
2. Check browser console for errors
3. Check backend logs
4. Verify database state
5. Review API responses in Network tab

---

## Cleanup

After testing, optionally delete the test event:
```sql
DELETE FROM events WHERE title = 'Test Event from Quickstart';
```

Or keep it for future testing iterations.

---

## Automated Test Conversion

This quickstart can be converted to automated E2E tests using Playwright or Cypress:

```typescript
// Example Playwright test structure
describe('Dashboard User Journey', () => {
  test('Step 1: Login redirects to dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'admin@sharehub.test');
    await page.fill('[name="password"]', 'ShareHub2025!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');
  });

  // ... more tests for each step
});
```

---

**Status**: ✅ Quickstart validation script complete
