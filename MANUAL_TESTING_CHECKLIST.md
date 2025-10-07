# Manual Testing Checklist - T040

**Feature**: Admin Panel Secondary Screens
**Date**: 2025-10-07
**Status**: Ready for manual testing

Based on quickstart.md lines 407-432. Check each item after testing.

---

## Test Environment Setup

**Prerequisites**:
- [ ] Backend running on http://localhost:3001
- [ ] Frontend running on http://localhost:3000
- [ ] Test tenant: `test-hotel` (ID: 523c2648-f980-4c9e-8e53-93d812cfa79f)
- [ ] Test admin: admin@sharehub.test / ShareHub2025!
- [ ] Database migrations applied
- [ ] Supabase Storage `logos` bucket exists

---

## Event Creation Tests

### Public Events
- [ ] Create public event with valid data → succeeds
- [ ] Verify no tokens generated for public event
- [ ] Event appears in event list immediately
- [ ] Event is publicly accessible without token

### Private Events
- [ ] Create private event with valid data → succeeds
- [ ] Verify tokens are generated (organizer + participant)
- [ ] Token display screen shows all tokens clearly
- [ ] Can copy tokens to clipboard
- [ ] Private event requires token to access

### Validation
- [ ] Create event with past date → rejected with clear error
- [ ] Create event with missing name → shows validation error
- [ ] Create event with empty description → succeeds (optional field)
- [ ] Create event with very long name (>255 chars) → rejected
- [ ] Create event with very long description (>2000 chars) → rejected

---

## Event Editing Tests

### Future Events
- [ ] Edit future event (change name) → succeeds
- [ ] Edit future event (change date to another future date) → succeeds
- [ ] Edit future event (change description) → succeeds
- [ ] Edit future event (change visibility) → succeeds
- [ ] Tokens are preserved after editing private event
- [ ] Changes reflect immediately in event list

### Past Events
- [ ] Attempt to edit past event → shows read-only warning
- [ ] All form fields disabled for past events
- [ ] Save button is disabled for past events
- [ ] Can view past event details but cannot modify

### Validation
- [ ] Edit event with invalid date (past) → rejected with 400 error
- [ ] Edit event with missing name → validation error
- [ ] Edit event by different tenant admin → 403 forbidden

---

## Branding Customization Tests

### Color Picker
- [ ] Change primary color → live preview updates immediately
- [ ] Change secondary color → live preview updates immediately
- [ ] Enter hex value manually → picker updates
- [ ] Enter invalid hex → shows validation error
- [ ] Colors persist after save
- [ ] Colors apply across all admin pages after save

### Logo Upload
- [ ] Upload PNG logo (< 2MB) → succeeds
- [ ] Preview shows uploaded logo immediately
- [ ] Upload JPG logo (< 2MB) → succeeds
- [ ] Upload SVG logo (< 2MB) → succeeds
- [ ] Upload logo > 2MB → rejected with error message
- [ ] Upload PDF file → rejected (invalid type)
- [ ] Upload TXT file → rejected (invalid type)
- [ ] Uploaded logo displays on all pages after save
- [ ] Remove logo → logo disappears from preview and all pages

### Branding Persistence
- [ ] Save branding changes → success message shown
- [ ] Refresh page → branding changes persist
- [ ] Navigate to other pages → branding applies everywhere
- [ ] Logo URL is valid and accessible

### Reset Function
- [ ] Click reset → confirmation dialog appears
- [ ] Confirm reset → colors return to defaults (#3B82F6, #10B981)
- [ ] Confirm reset → logo is removed
- [ ] Cancel reset → no changes made
- [ ] Default branding applies after reset

---

## Event List Tests

### Sorting
- [ ] Default sort (Date - Soonest First) → events ordered by date ASC
- [ ] Sort by "Date - Newest First" → events ordered by date DESC
- [ ] Sort by "Recently Created" → events ordered by created_at DESC
- [ ] Sort persists in URL (?sort=date-desc)
- [ ] Refresh page → sort preference preserved from URL

### Filtering
- [ ] Filter "All Events" → shows all events (past + future)
- [ ] Filter "Active Only" → shows only future events
- [ ] Filter "Past Events" → shows only past events
- [ ] Filter persists in URL (?filter=active)
- [ ] Refresh page → filter preference preserved from URL

### Combined Sort + Filter
- [ ] Apply sort=date-desc AND filter=active → correct results
- [ ] Apply sort=created-desc AND filter=past → correct results
- [ ] URL contains both parameters (?sort=...&filter=...)

### Display & Interaction
- [ ] Event cards show name, date, description preview
- [ ] Public/private badge displays correctly
- [ ] Active/past status badge displays correctly
- [ ] Past events appear grayed out/disabled
- [ ] Click "Edit" on future event → navigates to edit page
- [ ] Click "View" on past event → navigates to read-only edit page
- [ ] Click "New Event" button → navigates to create page
- [ ] Empty state displays when no events match filter

---

## Settings Management Tests

### Hotel Name
- [ ] Update hotel name (valid 2-100 chars) → succeeds
- [ ] Hotel name with 2 characters → succeeds (minimum)
- [ ] Hotel name with 100 characters → succeeds (maximum)
- [ ] Hotel name with 1 character → validation error
- [ ] Hotel name with 101 characters → validation error
- [ ] Hotel name empty → validation error (required)
- [ ] Updated name displays in header/navigation

### Contact Email
- [ ] Update email (valid format) → succeeds
- [ ] Email with international TLD (.co.uk, .io) → succeeds
- [ ] Invalid email format (no @) → validation error
- [ ] Invalid email format (no domain) → validation error
- [ ] Invalid email format (spaces) → validation error
- [ ] Clear email (optional field) → succeeds

### Contact Phone
- [ ] Update phone (international format +1-555-...) → succeeds
- [ ] Update phone (local format) → succeeds
- [ ] Phone with spaces/dashes → succeeds (flexible format)
- [ ] Phone with letters → validation error
- [ ] Very short phone (< 5 chars) → validation error
- [ ] Very long phone (> 50 chars) → validation error
- [ ] Clear phone (optional field) → succeeds

### Billing Info (Read-Only)
- [ ] Billing info section is visible
- [ ] Plan name displays correctly
- [ ] Renewal date displays in readable format
- [ ] Payment method displays (masked card number)
- [ ] Billing fields are NOT editable
- [ ] Attempting to update billing via form → ignored/rejected
- [ ] Help text explains billing is managed externally

---

## Security & Authorization Tests

### Multi-Tenant Isolation
- [ ] Admin can only see their tenant's events
- [ ] Admin cannot access other tenant's branding via URL manipulation
- [ ] Admin cannot access other tenant's settings via URL manipulation
- [ ] API returns 403 when trying to access other tenant's resources

### Authentication
- [ ] Unauthenticated user redirected to login
- [ ] Logout button works and redirects to homepage
- [ ] Session expires after timeout (if configured)
- [ ] Can re-login after logout

### Non-Admin Users
- [ ] Non-admin user cannot access /admin/* routes
- [ ] API returns 403 for non-admin requests
- [ ] Regular attendees can access events with valid token

---

## User Experience Tests

### Loading States
- [ ] Loading spinner shows while fetching data
- [ ] Loading spinner shows during form submission
- [ ] Loading spinner shows during logo upload
- [ ] Page doesn't flash or jump during load

### Error Handling
- [ ] API error → clear error message displayed
- [ ] Network error → helpful error message
- [ ] Validation error → field-specific error shown
- [ ] Success message → confirmation shown with icon
- [ ] Error message → error icon and red styling

### Mobile Responsiveness
- [ ] Dashboard responsive on mobile (<768px)
- [ ] Event list readable on mobile
- [ ] Forms usable on mobile (touch-friendly)
- [ ] Color picker usable on mobile
- [ ] Navigation accessible on mobile

### Accessibility
- [ ] All forms have proper labels
- [ ] Error messages are associated with fields
- [ ] Keyboard navigation works (tab through forms)
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA standards

---

## Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome (latest) - all features work
- [ ] Firefox (latest) - all features work
- [ ] Safari (latest) - all features work
- [ ] Edge (latest) - all features work

### Mobile Browsers
- [ ] Chrome Mobile - all features work
- [ ] Safari iOS - all features work

---

## Performance (Subjective Feel)

- [ ] Pages load quickly (< 1s perceived)
- [ ] No lag when typing in forms
- [ ] Color picker updates smoothly
- [ ] Event list renders quickly (even with many events)
- [ ] Logo upload shows progress
- [ ] No freezing or stuttering

---

## Edge Cases & Stress Tests

### Large Data
- [ ] Event list with 100+ events → renders correctly
- [ ] Long event names → don't break layout
- [ ] Long descriptions → truncated properly
- [ ] Hotel name at max length → doesn't overflow

### Special Characters
- [ ] Event name with emojis → saves correctly
- [ ] Description with line breaks → preserved
- [ ] Hotel name with accents (é, ñ) → saves correctly
- [ ] Email with + addressing → accepted

### Concurrent Users
- [ ] Two admins editing different events → no conflicts
- [ ] Admin edits while attendee views event → no issues
- [ ] Branding updated while other admin viewing → see changes on refresh

---

## Results Summary

**Total Tests**: 150+ checklist items
**Tests Passed**: ___ / ___
**Tests Failed**: ___ / ___
**Tests Skipped**: ___ / ___

**Critical Issues Found**: ___
**Minor Issues Found**: ___

---

## Issue Log Template

Use this format to document any issues found:

```
## Issue #1: [Short Description]
**Severity**: Critical / High / Medium / Low
**Category**: Event Creation / Event Editing / Branding / Settings / etc.
**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Behavior**: ...
**Actual Behavior**: ...
**Screenshots**: (if applicable)
**Browser/Device**: ...
**Notes**: ...
```

---

## Status: ⬜ PENDING MANUAL TESTING

This checklist should be completed by a human tester once the application is fully deployed and running.

**Recommended Testing Order**:
1. Event Creation (to create test data)
2. Event List (to verify created events appear)
3. Event Editing (to test modifications)
4. Branding Customization (visual changes)
5. Settings Management (data updates)
6. Security & Authorization (edge cases)

**Time Estimate**: 2-3 hours for complete manual testing

**Next Steps**:
1. Start backend and frontend servers
2. Login as test admin
3. Follow checklist in order
4. Document any issues found
5. Mark task T040 as complete in tasks.md
