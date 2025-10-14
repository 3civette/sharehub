# Quickstart Validation: Event Advertisement Banner System

**Feature**: 010-ok-now-i | **Date**: 2025-10-13
**Purpose**: Manual validation scenarios to verify banner system implementation

## Prerequisites

Before running these scenarios, ensure:
- [ ] Database migrations applied (`20250113_create_banners_table.sql`, `20250113_rls_banners.sql`)
- [ ] Supabase Storage bucket `banners` created with public read access
- [ ] At least one test tenant with admin user exists
- [ ] At least one test event created (both public and private)
- [ ] Test banner files prepared (JPEG/PNG/WebP, various sizes from 100KB to 5MB)

**Test Data Setup**:
```sql
-- Verify test tenant and admin exist
SELECT id, name FROM tenants WHERE name = 'Test Hotel';
SELECT id, email FROM admins WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Test Hotel');

-- Verify test event exists
SELECT id, title, slug, visibility FROM events WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Test Hotel');
```

---

## Scenario 1: View Banner Management Section

**User Story**: As an event organizer, I want to access the banner management interface from my admin dashboard.

**Steps**:
1. Navigate to `http://localhost:3000/admin/login`
2. Log in with test admin credentials
3. Navigate to admin dashboard (`/admin/events`)
4. Click on a test event to view details
5. Click "Manage Banners" or navigate to `/admin/events/[eventId]/banners`

**Expected Results**:
- [ ] Banner management page loads successfully
- [ ] Page displays 5 banner slots (numbered 1-5)
- [ ] Each slot shows:
  - Slot number (1-5)
  - Slot label (e.g., "Header Banner", "Sidebar Top")
  - Recommended dimensions (e.g., "1200x300px")
  - "Upload Banner" button or drag-drop zone
  - Empty state message (if no banner uploaded)
- [ ] Page layout is responsive (test desktop and mobile views)

**Contract Test Equivalent**: `GET /api/events/[eventId]/banners` returns `{ banners: [], total: 0, available_slots: [1,2,3,4,5] }`

---

## Scenario 2: Upload Banner to Slot

**User Story**: As an event organizer, I want to upload a banner graphic to a specific slot.

**Steps**:
1. From banner management page, select **Slot 3** (Content Mid - 970x250px)
2. Click "Upload Banner" or drag file to drop zone
3. Select test file: `test-banner-970x250.jpg` (2MB, JPEG)
4. Configure banner:
   - Click URL: `https://example-sponsor.com` (optional)
   - Active status: Checked (default)
5. Click "Upload" or "Save"

**Expected Results**:
- [ ] File upload progress indicator appears
- [ ] Upload completes within 10 seconds
- [ ] Success message: "Banner uploaded successfully"
- [ ] Slot 3 now shows:
  - Thumbnail preview of uploaded banner
  - Filename: `test-banner-970x250.jpg`
  - File size: ~2MB
  - Click URL: `https://example-sponsor.com`
  - Status: Active (green indicator)
  - Actions: Edit, Deactivate, Delete buttons
- [ ] Available slots update to `[1, 2, 4, 5]`

**Contract Test Equivalent**:
```bash
POST /api/events/[eventId]/banners
Content-Type: multipart/form-data
{
  file: File,
  slot_number: 3,
  click_url: "https://example-sponsor.com",
  is_active: true
}
→ 201 Created with banner object
```

**Validation**:
```sql
-- Verify database record
SELECT id, slot_number, storage_path, filename, click_url, is_active
FROM banners
WHERE event_id = '[test-event-id]' AND slot_number = 3 AND deleted_at IS NULL;

-- Verify storage file exists
-- Check Supabase Storage UI: banners/tenant-{id}/event-{id}/banner-{id}-slot-3.jpg
```

---

## Scenario 3: View Banners on Public Event Page

**User Story**: As a visitor, I want to see advertisement banners displayed on the event page.

**Steps**:
1. Log out from admin dashboard (or use incognito browser)
2. Navigate to public event page: `http://localhost:3000/events/[event-slug]`
3. Scroll through entire page to view all banner slots

**Expected Results**:
- [ ] Banner in Slot 3 is visible in content area
- [ ] Banner displays correctly:
  - Image loads without errors
  - Aspect ratio preserved (970:250)
  - Responsive sizing on mobile (scales down proportionally)
- [ ] Clicking banner opens `https://example-sponsor.com` in new tab
- [ ] `target="_blank"` and `rel="noopener noreferrer"` attributes present
- [ ] Empty slots (1, 2, 4, 5) do not show placeholder or broken images
- [ ] Page performance: Banner loads within 2 seconds

**Contract Test Equivalent**:
```bash
GET /api/public/events/[slug]/banners
→ 200 OK
{
  "banners": [
    {
      "slot_number": 3,
      "storage_url": "https://...supabase.co/storage/.../banner-xxx-slot-3.jpg",
      "click_url": "https://example-sponsor.com",
      "dimensions": { "width": 970, "height": 250 }
    }
  ]
}
```

**Browser DevTools Check**:
```javascript
// In console, verify banner element
document.querySelectorAll('[data-banner-slot="3"]').length === 1;
document.querySelector('a[href="https://example-sponsor.com"]').getAttribute('target') === '_blank';
```

---

## Scenario 4: Upload Banners to Multiple Slots

**User Story**: As an event organizer, I want to manage multiple banners across different slots.

**Steps**:
1. Return to banner management page (`/admin/events/[eventId]/banners`)
2. Upload banner to **Slot 1** (Header Main - 1200x300px):
   - File: `header-banner.png` (1.5MB)
   - Click URL: Leave empty (no redirect)
   - Active: Checked
3. Upload banner to **Slot 5** (Footer - 728x90px):
   - File: `footer-banner.webp` (500KB)
   - Click URL: `https://partner.com`
   - Active: Checked
4. Refresh page to verify state

**Expected Results**:
- [ ] Both uploads succeed
- [ ] Banner management page shows:
  - Slot 1: Active (header-banner.png)
  - Slot 2: Empty
  - Slot 3: Active (test-banner-970x250.jpg) - from Scenario 2
  - Slot 4: Empty
  - Slot 5: Active (footer-banner.webp)
- [ ] Available slots: `[2, 4]`
- [ ] Total banner count: 3

**Validation**:
```sql
-- Verify all banners in database
SELECT slot_number, filename, click_url, is_active
FROM banners
WHERE event_id = '[test-event-id]' AND deleted_at IS NULL
ORDER BY slot_number;

-- Expected result:
-- slot_number | filename                  | click_url                     | is_active
-- 1           | header-banner.png         | NULL                          | true
-- 3           | test-banner-970x250.jpg   | https://example-sponsor.com   | true
-- 5           | footer-banner.webp        | https://partner.com           | true
```

**Public Page Check**:
- Navigate to public event page
- Verify 3 banners visible in correct slots
- Verify Slot 1 banner is NOT clickable (no click URL)
- Verify Slot 3 and 5 banners are clickable

---

## Scenario 5: Delete Banner

**User Story**: As an event organizer, I want to remove a banner from a slot.

**Steps**:
1. From banner management page, locate **Slot 3** (test-banner-970x250.jpg)
2. Click "Delete" button
3. Confirm deletion in modal/dialog

**Expected Results**:
- [ ] Confirmation prompt appears: "Are you sure you want to delete this banner?"
- [ ] After confirmation:
  - Success message: "Banner deleted successfully"
  - Slot 3 returns to empty state
  - "Upload Banner" button reappears
  - Available slots update to `[2, 3, 4]`
- [ ] Deletion completes within 500ms

**Contract Test Equivalent**:
```bash
DELETE /api/banners/[bannerId]
→ 204 No Content
```

**Validation**:
```sql
-- Verify soft delete (deleted_at populated)
SELECT id, slot_number, filename, deleted_at
FROM banners
WHERE event_id = '[test-event-id]' AND slot_number = 3;

-- Expected: deleted_at IS NOT NULL (soft-deleted, not physically removed)
```

**Public Page Check**:
- Navigate to public event page
- Verify Slot 3 banner no longer visible
- Only Slot 1 and Slot 5 banners remain

---

## Scenario 6: Update Banner Properties

**User Story**: As an event organizer, I want to change a banner's slot or click URL without re-uploading the file.

**Steps**:
1. From banner management page, locate **Slot 5** (footer-banner.webp)
2. Click "Edit" button
3. Update properties:
   - Move to Slot: **2** (Sidebar Top - 300x600px)
   - Click URL: Change to `https://new-partner.com`
   - Active: Keep checked
4. Click "Save Changes"

**Expected Results**:
- [ ] Update succeeds with message: "Banner updated successfully"
- [ ] Banner moves from Slot 5 to Slot 2
- [ ] Slot 5 now empty (available)
- [ ] Slot 2 shows updated banner with new click URL
- [ ] Available slots update to `[3, 4, 5]`

**Contract Test Equivalent**:
```bash
PATCH /api/banners/[bannerId]
Content-Type: application/json
{
  "slot_number": 2,
  "click_url": "https://new-partner.com"
}
→ 200 OK with updated banner object
```

**Public Page Check**:
- Verify banner now appears in Slot 2 position
- Click banner → Opens `https://new-partner.com`

---

## Scenario 7: Deactivate Banner (Without Deletion)

**User Story**: As an event organizer, I want to temporarily hide a banner without deleting it.

**Steps**:
1. From banner management page, locate **Slot 1** (header-banner.png)
2. Click "Deactivate" toggle or button
3. Confirm action

**Expected Results**:
- [ ] Banner status changes to "Inactive" (gray indicator)
- [ ] Slot 1 still shows banner in admin view (grayed out)
- [ ] Banner metadata remains (filename, size, click URL)
- [ ] Available slots remain `[3, 4, 5]` (inactive slot not counted as available)

**Contract Test Equivalent**:
```bash
PATCH /api/banners/[bannerId]
Content-Type: application/json
{ "is_active": false }
→ 200 OK
```

**Public Page Check**:
- Navigate to public event page
- Verify Slot 1 banner NO LONGER VISIBLE
- Only Slot 2 banner visible (Slot 5 moved to Slot 2 in Scenario 6)

**Reactivate Test**:
- Click "Activate" button on Slot 1 banner
- Verify banner becomes visible again on public page

---

## Edge Case Testing

### Edge Case 1: Invalid File Upload

**Steps**:
1. Attempt to upload `invalid-banner.pdf` (PDF file) to Slot 4

**Expected Results**:
- [ ] Client-side validation error: "Only JPEG, PNG, and WebP files are allowed"
- [ ] Upload prevented before API call
- [ ] No network request sent

**Contract Error**: `400 Bad Request` with error code `INVALID_FILE_TYPE`

---

### Edge Case 2: File Too Large

**Steps**:
1. Attempt to upload `huge-banner.jpg` (8MB file) to Slot 4

**Expected Results**:
- [ ] Client-side validation error: "File size exceeds 5MB limit"
- [ ] Upload prevented
- [ ] If client validation bypassed: Server returns `413 Payload Too Large`

---

### Edge Case 3: Duplicate Slot Assignment

**Steps**:
1. Try to upload banner to Slot 2 (already occupied from Scenario 6)

**Expected Results**:
- [ ] Error message: "Slot 2 is already occupied. Please choose a different slot or delete the existing banner first."
- [ ] Upload prevented

**Contract Error**: `400 Bad Request` with error code `SLOT_OCCUPIED`

---

### Edge Case 4: Move Banner to Occupied Slot

**Steps**:
1. Edit Slot 1 banner (inactive from Scenario 7)
2. Try to move it to Slot 2 (occupied)

**Expected Results**:
- [ ] Error message: "Target slot 2 is already occupied"
- [ ] Update prevented

**Contract Error**: `409 Conflict` with error code `SLOT_CONFLICT`

---

### Edge Case 5: Invalid Click URL

**Steps**:
1. Upload banner with click URL: `javascript:alert('xss')`

**Expected Results**:
- [ ] Validation error: "Click URL must start with http:// or https://"
- [ ] Upload prevented

**Contract Error**: `400 Bad Request` with error code `INVALID_URL_FORMAT`

---

### Edge Case 6: Mobile Responsive Display

**Steps**:
1. Open public event page on mobile device (or Chrome DevTools mobile emulation)
2. View banners in different slots

**Expected Results**:
- [ ] All banners scale proportionally to screen width
- [ ] Aspect ratios preserved
- [ ] No horizontal scrolling
- [ ] Banner images use `loading="lazy"` attribute
- [ ] Tap on banner opens click URL in new tab

---

### Edge Case 7: Missing Permissions (Non-Admin User)

**Steps**:
1. Log in as non-admin user (regular attendee account)
2. Try to access `/admin/events/[eventId]/banners`

**Expected Results**:
- [ ] Redirect to login page or 403 Forbidden error
- [ ] No banner management UI accessible

**Contract Error**: `403 Forbidden` with error message "Not a tenant admin"

---

### Edge Case 8: Cross-Tenant Access Attempt

**Steps**:
1. Log in as admin for Tenant A
2. Try to upload banner to event belonging to Tenant B

**Expected Results**:
- [ ] API request fails with `403 Forbidden`
- [ ] RLS policy blocks database insert

**RLS Validation**:
```sql
-- Verify RLS blocks cross-tenant access
-- (This query should return 0 rows when run by Tenant A admin)
SELECT * FROM banners WHERE tenant_id = '[tenant-b-id]';
```

---

## Performance Validation

### Load Time Benchmarks

**Page Load (Public Event Page with 5 Banners)**:
- [ ] First Contentful Paint (FCP): < 1.5s
- [ ] Largest Contentful Paint (LCP): < 2s
- [ ] All banner images loaded: < 3s
- [ ] Use Chrome DevTools Lighthouse to verify

**Upload Performance**:
- [ ] 500KB file: < 3s
- [ ] 2MB file: < 7s
- [ ] 5MB file: < 10s

**API Response Times**:
- [ ] `GET /api/events/[id]/banners`: < 200ms
- [ ] `POST /api/events/[id]/banners`: < 500ms (excluding file upload time)
- [ ] `PATCH /api/banners/[id]`: < 300ms
- [ ] `DELETE /api/banners/[id]`: < 300ms

---

## Security Validation

### RLS Policy Tests

**Test 1: Public Read Access**
```sql
-- Run as unauthenticated user (auth.uid() = NULL)
SELECT * FROM banners WHERE event_id = '[public-event-id]' AND is_active = true;
-- Expected: Returns only active banners for public events
```

**Test 2: Admin Write Access**
```sql
-- Run as authenticated admin
INSERT INTO banners (tenant_id, event_id, slot_number, storage_path, filename, file_size, mime_type)
VALUES ('[admin-tenant-id]', '[event-id]', 4, 'test-path.jpg', 'test.jpg', 1024, 'image/jpeg');
-- Expected: Success for own tenant, failure for other tenants
```

**Test 3: Private Event Banner Access**
```sql
-- Run as unauthenticated user
SELECT * FROM banners WHERE event_id = '[private-event-id]';
-- Expected: No rows returned (RLS blocks access)
```

---

## Cleanup

After completing all scenarios:

```sql
-- Soft-delete all test banners
UPDATE banners SET deleted_at = NOW()
WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Test Event%');

-- Verify cleanup
SELECT COUNT(*) FROM banners WHERE deleted_at IS NULL AND event_id = '[test-event-id]';
-- Expected: 0
```

---

## Success Criteria

All scenarios PASS if:
- [ ] All 7 main scenarios complete without errors
- [ ] All 8 edge cases handle errors gracefully
- [ ] Performance benchmarks met
- [ ] Security validations pass
- [ ] No console errors in browser DevTools
- [ ] No unhandled promise rejections
- [ ] All database constraints enforced
- [ ] RLS policies prevent unauthorized access

**Estimated Time**: 45-60 minutes for complete manual validation

---

**Quickstart Complete**: This document validates all functional requirements (FR-001 through FR-018) from spec.md.
