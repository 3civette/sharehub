# Quickstart: Admin Panel Secondary Screens

**Feature**: Admin Panel Secondary Screens
**Date**: 2025-10-07
**Purpose**: Integration test scenarios and manual testing guide

## Prerequisites

1. **Database**: ShareHub database with migrations applied (including migration 002)
2. **Backend**: Express.js server running on `http://localhost:3001`
3. **Frontend**: Next.js app running on `http://localhost:3000`
4. **Test Tenant**: Test tenant with subdomain `test-hotel` (ID: `523c2648-f980-4c9e-8e53-93d812cfa79f`)
5. **Test Admin**: Admin user `admin@sharehub.test` with password `ShareHub2025!`

## Integration Test Scenario 1: Create Event Flow

**Objective**: Verify admin can create a new event and tokens are generated correctly for private events.

### Steps

1. **Login as admin**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@sharehub.test","password":"ShareHub2025!"}'
   # Save token from response
   ```

2. **Create public event**
   ```bash
   curl -X POST http://localhost:3001/events \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "event_name": "Summer Conference 2025",
       "event_date": "2025-08-15",
       "description": "Annual summer conference for all staff",
       "visibility": "public"
     }'
   ```

3. **Verify response**
   - Status: 201 Created
   - Response contains: `id`, `tenant_id` (matches test tenant), `event_name`, `event_date`, `visibility: "public"`
   - No tokens for public event

4. **Create private event**
   ```bash
   curl -X POST http://localhost:3001/events \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "event_name": "Executive Board Meeting",
       "event_date": "2025-09-10",
       "description": "Q3 strategic planning session",
       "visibility": "private"
     }'
   ```

5. **Verify tokens generated**
   - Query `private_event_tokens` table for new event ID
   - Verify both organizer and participant tokens exist
   - Verify tokens are unique and associated with correct `tenant_id`

6. **Test tenant isolation**
   - Create event with another admin (different tenant)
   - Verify first admin cannot see second tenant's event

### Expected Results
- ✅ Public event created without tokens
- ✅ Private event created with organizer and participant tokens
- ✅ Multi-tenant isolation enforced (no cross-tenant access)

---

## Integration Test Scenario 2: Edit Event Flow

**Objective**: Verify admin can edit future events but cannot edit past events (read-only).

### Steps

1. **Create future event**
   ```bash
   curl -X POST http://localhost:3001/events \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "event_name": "Workshop 2026",
       "event_date": "2026-03-20",
       "description": "Annual workshop",
       "visibility": "public"
     }'
   # Save event ID from response
   ```

2. **Edit future event (should succeed)**
   ```bash
   curl -X PUT http://localhost:3001/events/$EVENT_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "event_name": "Advanced Workshop 2026",
       "description": "Updated workshop with advanced topics"
     }'
   ```

3. **Verify update succeeded**
   - Status: 200 OK
   - Response shows updated `event_name` and `description`
   - `created_at` unchanged, `updated_at` updated
   - Tokens unchanged (for private events)

4. **Create past event (manually set date in database)**
   ```sql
   INSERT INTO events (id, tenant_id, event_name, event_date, visibility, status, created_by)
   VALUES (
     gen_random_uuid(),
     '523c2648-f980-4c9e-8e53-93d812cfa79f',
     'Old Conference',
     '2024-01-15',  -- Past date
     'public',
     'past',
     '621f3aa6-d32b-4496-9c92-acc53c3827c0'
   );
   ```

5. **Attempt to edit past event (should fail)**
   ```bash
   curl -X PUT http://localhost:3001/events/$PAST_EVENT_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "event_name": "Updated Old Conference"
     }'
   ```

6. **Verify edit rejected**
   - Status: 400 Bad Request
   - Error message: "Cannot edit past events"

### Expected Results
- ✅ Future events can be edited
- ✅ Past events cannot be edited (read-only enforcement)
- ✅ Original creation metadata preserved on edit

---

## Integration Test Scenario 3: Branding Flow

**Objective**: Verify admin can customize tenant branding and changes apply to all pages.

### Steps

1. **Get current branding**
   ```bash
   curl -X GET http://localhost:3001/branding/$TENANT_ID \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Verify default branding**
   - `primary_color`: "#3B82F6" (Tailwind blue-500)
   - `secondary_color`: "#10B981" (Tailwind green-500)
   - `logo_url`: null

3. **Update colors**
   ```bash
   curl -X PUT http://localhost:3001/branding/$TENANT_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "primary_color": "#EF4444",
       "secondary_color": "#F59E0B"
     }'
   ```

4. **Verify colors updated**
   - Status: 200 OK
   - Response shows new colors
   - Frontend: CSS variables `--color-primary` and `--color-secondary` updated

5. **Upload logo**
   ```bash
   curl -X POST http://localhost:3001/branding/$TENANT_ID/logo \
     -H "Authorization: Bearer $TOKEN" \
     -F "logo=@test-logo.png"
   ```

6. **Verify logo uploaded**
   - Status: 200 OK
   - Response contains `logo_url` (Supabase Storage public URL)
   - File exists in Supabase Storage: `logos/$TENANT_ID/...`

7. **Check branding applied across pages**
   - Navigate to `/admin/dashboard` → verify new colors
   - Navigate to `/events/public-event-id` (attendee view) → verify new colors and logo
   - Navigate to `/admin/events` → verify new colors

8. **Reset branding**
   ```bash
   curl -X POST http://localhost:3001/branding/$TENANT_ID/reset \
     -H "Authorization: Bearer $TOKEN"
   ```

9. **Verify reset to defaults**
   - Colors back to `#3B82F6` and `#10B981`
   - Logo removed (`logo_url` = null)
   - Old logo file deleted from Supabase Storage

### Expected Results
- ✅ Colors update successfully with live preview
- ✅ Logo uploads to Supabase Storage with correct path
- ✅ Branding applies to all tenant pages (admin + attendee)
- ✅ Reset restores default values and removes logo file

---

## Integration Test Scenario 4: Event List Flow

**Objective**: Verify admin can view, sort, and filter events correctly.

### Steps

1. **Create test events**
   ```bash
   # Create 3 future events with different dates
   curl -X POST http://localhost:3001/events -H "Authorization: Bearer $TOKEN" -d '{...}'  # 2025-06-01
   curl -X POST http://localhost:3001/events -H "Authorization: Bearer $TOKEN" -d '{...}'  # 2025-12-15
   curl -X POST http://localhost:3001/events -H "Authorization: Bearer $TOKEN" -d '{...}'  # 2026-03-20

   # Manually create 1 past event in database (date < today)
   ```

2. **List events with default sort (date ascending, soonest first)**
   ```bash
   curl -X GET http://localhost:3001/events \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Verify default sort**
   - Events ordered by `event_date` ASC (2025-06-01, 2025-12-15, 2026-03-20)
   - Past event included in results

4. **List events sorted by date descending**
   ```bash
   curl -X GET "http://localhost:3001/events?sort=date-desc" \
     -H "Authorization: Bearer $TOKEN"
   ```

5. **Verify sort order changed**
   - Events ordered by `event_date` DESC (2026-03-20, 2025-12-15, 2025-06-01)

6. **Filter active events only**
   ```bash
   curl -X GET "http://localhost:3001/events?filter=active" \
     -H "Authorization: Bearer $TOKEN"
   ```

7. **Verify filter applied**
   - Only future events returned (event_date >= today)
   - Past event excluded

8. **Filter past events only**
   ```bash
   curl -X GET "http://localhost:3001/events?filter=past" \
     -H "Authorization: Bearer $TOKEN"
   ```

9. **Verify past filter**
   - Only past event returned (event_date < today)

10. **Frontend: Test UI controls**
    - Navigate to `/admin/events`
    - Click sort dropdown → select "Newest First" → verify UI reorders
    - Click filter dropdown → select "Active Only" → verify past events hidden
    - Verify URL updates: `?sort=date-desc&filter=active`
    - Refresh page → verify sort/filter persisted from URL

### Expected Results
- ✅ Default sort: soonest first (date ASC)
- ✅ Sort toggle works (date ASC/DESC, created DESC)
- ✅ Filters work (all, active, past)
- ✅ URL params sync with UI state
- ✅ Multi-tenant isolation (only own tenant's events shown)

---

## Integration Test Scenario 5: Settings Flow

**Objective**: Verify admin can update hotel name and contact info, and view billing information (read-only).

### Steps

1. **Get current settings**
   ```bash
   curl -X GET http://localhost:3001/settings/$TENANT_ID \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Verify current settings**
   - `hotel_name`: "Unnamed Hotel" (or previously set value)
   - `contact_email`: null (or previously set)
   - `contact_phone`: null (or previously set)
   - `billing_info`: Contains `plan_name`, `renewal_date`, `payment_method` (read-only data)

3. **Update hotel name**
   ```bash
   curl -X PUT http://localhost:3001/settings/$TENANT_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "hotel_name": "Grand Plaza Hotel"
     }'
   ```

4. **Verify hotel name updated**
   - Status: 200 OK
   - Response shows `hotel_name: "Grand Plaza Hotel"`
   - Database record updated

5. **Update contact information**
   ```bash
   curl -X PUT http://localhost:3001/settings/$TENANT_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "contact_email": "info@grandplaza.com",
       "contact_phone": "+1-555-987-6543"
     }'
   ```

6. **Verify contact info updated**
   - Status: 200 OK
   - Response shows updated email and phone

7. **Test validation: Invalid email**
   ```bash
   curl -X PUT http://localhost:3001/settings/$TENANT_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "contact_email": "invalid-email"
     }'
   ```

8. **Verify validation error**
   - Status: 400 Bad Request
   - Error message: "Invalid email format"

9. **Test validation: Hotel name too short**
   ```bash
   curl -X PUT http://localhost:3001/settings/$TENANT_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "hotel_name": "H"
     }'
   ```

10. **Verify validation error**
    - Status: 400 Bad Request
    - Error message: "Hotel name must be 2-100 characters"

11. **Verify billing info is read-only**
    - Attempt to update `billing_info` via API (should be ignored or rejected)
    - Verify billing info displayed in UI but form fields are disabled
    - Note: Billing updates happen through external system (Stripe, etc.)

### Expected Results
- ✅ Hotel name and contact info update successfully
- ✅ Validation enforced (email format, name length)
- ✅ Billing info displayed but read-only (not editable)
- ✅ Changes persist and reload correctly

---

## Performance Validation

### Performance Targets
- Page load: < 1s
- Event list render: < 2s (with 100+ events)
- API response: < 500ms

### Performance Tests

1. **Event list with 100 events**
   ```bash
   # Seed 100 events in database
   # Measure: time curl -X GET http://localhost:3001/events
   ```
   - Target: < 500ms API response
   - Frontend: < 2s initial render

2. **Branding update with logo upload**
   ```bash
   # Upload 1.5MB PNG file
   # Measure: time from upload start to completion
   ```
   - Target: < 10s for upload + save

3. **Admin dashboard load**
   - Navigate to `/admin/dashboard`
   - Measure: Time to First Contentful Paint
   - Target: < 1s

---

## Manual Testing Checklist

- [ ] Create public event → verify no tokens generated
- [ ] Create private event → verify tokens generated
- [ ] Edit future event → succeeds
- [ ] Attempt to edit past event → rejected
- [ ] Upload PNG logo (1MB) → succeeds
- [ ] Upload JPG logo (2MB) → succeeds
- [ ] Upload SVG logo (500KB) → succeeds
- [ ] Upload 3MB logo → rejected with error
- [ ] Upload PDF file → rejected (invalid type)
- [ ] Change primary color → live preview updates
- [ ] Change secondary color → live preview updates
- [ ] Save branding → all pages reflect new colors
- [ ] Reset branding → defaults restored
- [ ] Sort events by date ascending → correct order
- [ ] Sort events by date descending → correct order
- [ ] Filter active events → only future events shown
- [ ] Filter past events → only past events shown
- [ ] Update hotel name (valid) → succeeds
- [ ] Update hotel name (1 char) → validation error
- [ ] Update email (valid) → succeeds
- [ ] Update email (invalid) → validation error
- [ ] View billing info → displayed correctly (read-only)
- [ ] Test as non-admin user → all endpoints return 403

---

## Automated Test Execution

Run integration tests:
```bash
cd backend
npm test -- tests/integration/admin-screens.test.ts
```

Expected output:
```
✓ Create Event Flow (5 tests)
✓ Edit Event Flow (3 tests)
✓ Branding Flow (6 tests)
✓ Event List Flow (5 tests)
✓ Settings Flow (4 tests)

Total: 23 tests passed
```

---

## Troubleshooting

### Issue: Logo upload fails with 413 Payload Too Large
**Solution**: Check Multer `limits.fileSize` is set to 2MB, nginx/server has correct `client_max_body_size`

### Issue: Branding colors don't apply to pages
**Solution**: Verify CSS custom properties injected in layout, check `TenantContext` provides branding

### Issue: Past events appear editable in UI
**Solution**: Frontend must compute `status` from `event_date` and disable edit button for past events

### Issue: RLS policy blocks event update
**Solution**: Verify admin is authenticated, belongs to correct tenant, and event date is >= today

---

## Summary

All 5 integration test scenarios validate core feature functionality:
1. ✅ Event creation with token generation
2. ✅ Event editing with past/future constraints
3. ✅ Branding customization with live preview
4. ✅ Event list with sorting and filtering
5. ✅ Settings management with validation

Feature ready for implementation following TDD approach (write tests first, then implementation).
