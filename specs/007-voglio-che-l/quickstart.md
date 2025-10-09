# Quickstart: UI/UX Design System & Meeting Hub Rebrand

**Feature**: 007-voglio-che-l
**Date**: 2025-10-08
**Purpose**: Manual validation test plan for verifying the complete implementation of the 3Civette design system and Meeting Hub rebrand.

## Prerequisites

### Environment Setup
- Node.js 20 LTS installed
- Backend and frontend dev servers running
- Test tenant account with admin access
- Browser DevTools open (for inspecting CSS)

### Start Services
```bash
# Terminal 1: Backend
cd backend
npm run dev  # Runs on http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm run dev  # Runs on http://localhost:3000
```

### Test Data
- Tenant ID: `test-hotel` (or your test tenant slug)
- Admin credentials: (use your test admin account)
- Test images for logo upload (PNG/JPEG, < 2MB)

---

## Test Plan

### Part 1: Initial State Verification (No Custom Branding)

#### Test 1.1: Meeting Hub Branding
**Goal**: Verify complete rebrand from shareHub to "Meeting Hub"

**Steps**:
1. Navigate to `http://localhost:3000/admin/dashboard`
2. Observe page title in browser tab
3. Observe header logo/text
4. Check page metadata (view page source)

**Expected**:
- [x] Browser tab shows "Meeting Hub - Dashboard"
- [x] Header displays "Meeting Hub" text or logo
- [x] `<title>` tag contains "Meeting Hub"
- [x] `<meta property="og:site_name">` contains "Meeting Hub"

**Actual**: _______________

---

#### Test 1.2: 3Civette Default Colors
**Goal**: Verify 3Civette design system colors applied

**Steps**:
1. Navigate to `/admin/dashboard`
2. Inspect primary action button (e.g., "Create Event")
3. Open DevTools → Inspect button element
4. Check computed styles for background-color

**Expected**:
- [x] Button background: `#D4AF37` (gold)
- [x] Button text: `#0B0B0C` (brand-black)
- [x] Button has shadow: `0 8px 24px rgba(0,0,0,.08)`
- [x] Button border-radius: `16-20px`

**Actual**: _______________

---

#### Test 1.3: Typography Scale
**Goal**: Verify typography hierarchy implementation

**Steps**:
1. Navigate to `/admin/dashboard`
2. Find H1 heading (page title)
3. Inspect font-family and font-size
4. Check H2, H3, body text

**Expected**:
- [x] H1 font-family: Archivo Black or Bebas Neue
- [x] H1 font-size: 48-64px (desktop) or 36-40px (mobile)
- [x] Body text font-family: Inter
- [x] Body text line-height: 1.6
- [x] All text meets AA contrast (use browser accessibility tools)

**Actual**: _______________

---

#### Test 1.4: Spacing System
**Goal**: Verify 4px-based spacing applied

**Steps**:
1. Navigate to `/admin/events`
2. Inspect event card component
3. Check padding and margin values in DevTools

**Expected**:
- [x] Card padding: multiples of 4px (e.g., 16px, 24px)
- [x] Gap between cards: 16px or 24px
- [x] Section vertical padding: 48px (mobile) or 64px (desktop)

**Actual**: _______________

---

#### Test 1.5: Icon System
**Goal**: Verify Lucide React icons at 24×24px

**Steps**:
1. Navigate to `/admin/dashboard`
2. Find icon elements (e.g., calendar icon, settings icon)
3. Inspect SVG element width/height

**Expected**:
- [x] All icons are 24×24px
- [x] Icons rendered as `<svg>` elements (not image files)
- [x] Icons are from Lucide React library (check component source if needed)

**Actual**: _______________

---

### Part 2: Branding Settings UI

#### Test 2.1: Navigate to Branding Settings
**Goal**: Access branding configuration page

**Steps**:
1. From dashboard, navigate to Settings → Branding
2. URL should be `/admin/settings/branding`

**Expected**:
- [x] Page loads without errors
- [x] Form displays with color pickers and logo upload
- [x] Current branding shown (or empty if none)

**Actual**: _______________

---

#### Test 2.2: Color Validation - Passing Colors
**Goal**: Verify validation works for accessible colors

**Steps**:
1. On branding settings page, set:
   - Primary color: `#D4AF37` (gold)
   - Secondary color: `#0B0B0C` (black)
2. Observe validation feedback (should appear dynamically or on blur)

**Expected**:
- [x] No warning messages displayed
- [x] Green checkmark or "Valid" indicator shown
- [x] Save button is enabled

**Actual**: _______________

---

#### Test 2.3: Color Validation - Failing Colors
**Goal**: Verify validation warns for poor contrast

**Steps**:
1. Change primary color to `#FFFF00` (yellow - poor contrast)
2. Tab out of input (trigger validation)
3. Observe warning message

**Expected**:
- [x] Warning message appears: "Primary color fails WCAG AA contrast"
- [x] Shows contrast ratio (e.g., "2.8:1, needs 4.5:1")
- [x] Save button remains enabled (allow override)
- [x] Recommendation shown (suggested better color)

**Actual**: _______________

---

#### Test 2.4: Logo Upload
**Goal**: Verify logo upload functionality

**Steps**:
1. Click logo upload area or "Change Logo" button
2. Select a test image (PNG, < 2MB)
3. Wait for upload to complete
4. Observe preview

**Expected**:
- [x] File upload dialog appears
- [x] Upload progress indicator shown
- [x] Preview of uploaded logo displayed
- [x] Logo URL saved in branding settings

**Actual**: _______________

---

#### Test 2.5: Save with Warnings
**Goal**: Verify can save despite accessibility warnings

**Steps**:
1. Keep primary color as `#FFFF00` (with warning)
2. Check "I understand the accessibility concerns" checkbox (if present)
3. Click "Save Changes"

**Expected**:
- [x] Save succeeds (200 response)
- [x] Success toast notification appears
- [x] Warning is recorded in database (check `contrast_warnings` field)

**Actual**: _______________

---

### Part 3: Tenant Branding Override

#### Test 3.1: Apply Custom Colors
**Goal**: Verify tenant colors override 3Civette defaults

**Steps**:
1. With branding saved (primary: `#FF0000` red), navigate to `/admin/dashboard`
2. Inspect primary action button
3. Check computed background-color

**Expected**:
- [x] Button background: `#FF0000` (custom red, not gold)
- [x] Page loads within 1-2 seconds
- [x] No console errors

**Actual**: _______________

---

#### Test 3.2: Tenant Logo Displayed
**Goal**: Verify custom logo appears in header

**Steps**:
1. Navigate to `/admin/dashboard`
2. Observe header
3. Check for tenant logo image

**Expected**:
- [x] Custom logo displayed in header (if uploaded)
- [x] Logo loaded from Supabase Storage URL
- [x] Logo has appropriate size/aspect ratio

**Actual**: _______________

---

#### Test 3.3: CSS Custom Properties
**Goal**: Verify CSS variables updated dynamically

**Steps**:
1. Open DevTools → Elements → `<html>` element
2. Check inline styles on `:root`

**Expected**:
- [x] `--color-primary: #FF0000` (or tenant color)
- [x] `--color-secondary: (tenant secondary color)`
- [x] Custom properties applied dynamically (not hardcoded in CSS)

**Actual**: _______________

---

#### Test 3.4: Revert to Defaults
**Goal**: Verify can clear custom branding

**Steps**:
1. Navigate back to `/admin/settings/branding`
2. Click "Reset to Defaults" or "Clear Branding"
3. Navigate to `/admin/dashboard`
4. Inspect button colors

**Expected**:
- [x] Button background reverts to `#D4AF37` (gold)
- [x] Logo reverts to "Meeting Hub" text/default logo
- [x] CSS custom properties reset to 3Civette values

**Actual**: _______________

---

### Part 4: Public Pages

#### Test 4.1: Public Event Page Styling
**Goal**: Verify design system applied to public pages

**Steps**:
1. Navigate to `/events/[test-event-slug]`
2. Observe page styling, buttons, typography
3. Inspect elements

**Expected**:
- [x] Same design tokens applied (gold buttons, proper spacing)
- [x] Typography scale consistent with admin pages
- [x] Meeting Hub branding visible
- [x] Responsive design works on mobile viewport

**Actual**: _______________

---

#### Test 4.2: Public Page with Tenant Branding
**Goal**: Verify tenant branding applies to public pages

**Steps**:
1. With custom tenant branding active (red buttons)
2. Navigate to public event page
3. Inspect button colors

**Expected**:
- [x] Buttons use tenant custom color (red, not gold)
- [x] Tenant logo displayed if configured
- [x] Consistent with admin page styling

**Actual**: _______________

---

### Part 5: Accessibility

#### Test 5.1: Keyboard Navigation
**Goal**: Verify 100% keyboard navigability

**Steps**:
1. Navigate to `/admin/dashboard`
2. Tab through all interactive elements
3. Observe focus rings
4. Press Enter/Space on buttons

**Expected**:
- [x] All buttons, links, inputs receive focus
- [x] Focus ring visible (2px gold outline)
- [x] Tab order logical (follows visual layout)
- [x] Skip-to-content link appears on first Tab
- [x] Enter/Space activates buttons

**Actual**: _______________

---

#### Test 5.2: Screen Reader (Optional)
**Goal**: Verify screen reader compatibility

**Steps**:
1. Enable screen reader (NVDA/JAWS on Windows, VoiceOver on Mac)
2. Navigate dashboard
3. Listen to announcements

**Expected**:
- [x] All icon-only buttons have aria-label
- [x] Form labels properly associated
- [x] Toast notifications announced

**Actual**: _______________

---

#### Test 5.3: Contrast Checker
**Goal**: Verify WCAG AA compliance with browser tools

**Steps**:
1. Open DevTools → Accessibility Inspector (Firefox) or Lighthouse (Chrome)
2. Run accessibility audit
3. Check for contrast issues

**Expected**:
- [x] No contrast errors for default 3Civette colors
- [x] Gold (#D4AF37) on white meets AA (>= 4.5:1)
- [x] Black (#0B0B0C) on white meets AAA (>= 7:1)

**Actual**: _______________

---

### Part 6: Responsive Design

#### Test 6.1: Mobile Viewport (375px)
**Goal**: Verify mobile responsive behavior

**Steps**:
1. Open DevTools → Toggle device toolbar
2. Set viewport to iPhone SE (375px width)
3. Navigate to `/admin/dashboard`

**Expected**:
- [x] Hamburger menu visible in header
- [x] Grid layout collapses to 1 column
- [x] H1 font-size reduces to 36-40px
- [x] Buttons maintain 44×44px minimum touch target
- [x] Horizontal padding: 24px

**Actual**: _______________

---

#### Test 6.2: Tablet Viewport (768px)
**Goal**: Verify tablet layout

**Steps**:
1. Set viewport to iPad (768px width)
2. Navigate to `/admin/events`

**Expected**:
- [x] Grid uses 6 columns (not 12 or 4)
- [x] Card layout adjusts appropriately
- [x] Navigation still visible (not hamburger)

**Actual**: _______________

---

#### Test 6.3: Desktop Viewport (1200px+)
**Goal**: Verify desktop max-width constraint

**Steps**:
1. Set viewport to 1920px wide
2. Navigate to `/admin/dashboard`
3. Observe content width

**Expected**:
- [x] Content container max-width: 1200px
- [x] Content centered with margin: auto
- [x] Horizontal padding: 40px
- [x] 12-column grid used

**Actual**: _______________

---

### Part 7: Performance

#### Test 7.1: Largest Contentful Paint (LCP)
**Goal**: Verify LCP under 2.5s on 4G

**Steps**:
1. Open DevTools → Network tab
2. Set throttling to "Fast 3G" or "Slow 4G"
3. Hard reload `/admin/dashboard` (Ctrl+Shift+R)
4. Open Performance tab → Record reload
5. Check LCP metric

**Expected**:
- [x] LCP < 2.5s
- [x] Fonts load quickly (preconnect working)
- [x] Images lazy load

**Actual**: _______________

---

#### Test 7.2: Image Lazy Loading
**Goal**: Verify images load on demand

**Steps**:
1. Navigate to `/admin/events` (page with many event images)
2. Open Network tab
3. Observe image requests as you scroll

**Expected**:
- [x] Images below fold not loaded initially
- [x] Images load as they enter viewport
- [x] `loading="lazy"` attribute on `<img>` tags

**Actual**: _______________

---

### Part 8: Cross-Browser

#### Test 8.1: Chrome
**Goal**: Verify compatibility in Chrome

**Steps**:
1. Open Meeting Hub in Chrome
2. Complete tests 1.2, 1.3, 3.1, 5.1

**Expected**:
- [x] All features work as expected
- [x] No console errors

**Actual**: _______________

---

#### Test 8.2: Firefox
**Goal**: Verify compatibility in Firefox

**Steps**:
1. Open Meeting Hub in Firefox
2. Complete tests 1.2, 1.3, 3.1

**Expected**:
- [x] All features work as expected
- [x] CSS custom properties work
- [x] No console errors

**Actual**: _______________

---

#### Test 8.3: Safari (if available)
**Goal**: Verify compatibility in Safari

**Steps**:
1. Open Meeting Hub in Safari
2. Test button styling, typography

**Expected**:
- [x] Design system renders correctly
- [x] Fonts load properly

**Actual**: _______________

---

## Acceptance Criteria Checklist

### Functional Requirements (from spec.md)
- [ ] FR-001: Design system applies to admin + public pages
- [ ] FR-001a: Rebrand to "Meeting Hub" complete
- [ ] FR-002: 3Civette color palette applied
- [ ] FR-003: Display fonts (Archivo Black/Bebas Neue) + Inter body
- [ ] FR-004: 4px spacing scale
- [ ] FR-005: 16-20px border radius
- [ ] FR-006: Consistent shadow
- [ ] FR-006a: Lucide React icons at 24×24px
- [ ] FR-007-011: Component styling (buttons, cards, inputs, headers)
- [ ] FR-012-014: Typography hierarchy
- [ ] FR-015-017: Layout & responsiveness
- [ ] FR-018-022: Accessibility (AA contrast, focus rings, keyboard nav)
- [ ] FR-023-026: User feedback (errors, toasts, loading, disabled states)
- [ ] FR-027-029: Consistency (mobile nav, CTAs, links)
- [ ] FR-030-031: Performance (LCP < 2.5s, lazy images)
- [ ] FR-032-034: Tenant branding defaults + overrides
- [ ] FR-035-036: Color validation with warnings

### User Scenarios (from spec.md)
- [ ] Scenario 1: Admin sees 3Civette colors in dashboard
- [ ] Scenario 2: Button states (normal, hover, disabled)
- [ ] Scenario 3: Keyboard navigation works
- [ ] Scenario 4: Low vision users see AA contrast
- [ ] Scenario 5: Form inputs have proper styling
- [ ] Scenario 6: Cards have proper spacing and hover
- [ ] Scenario 7: Mobile responsive behavior

---

## Troubleshooting

### Issue: Colors not updating after branding change
**Solution**: Check TenantContext.applyBranding() is called, verify CSS custom properties in DevTools

### Issue: Fonts not loading
**Solution**: Check Google Fonts link in layout.tsx, verify font-display: swap set

### Issue: Icons missing or wrong size
**Solution**: Verify lucide-react installed, check icon component props (size={24})

### Issue: Accessibility warnings not showing
**Solution**: Check validation endpoint response, verify frontend displays warnings from API

---

## Sign-Off

**Tester**: _______________
**Date**: _______________
**All Tests Pass**: [ ] Yes [ ] No
**Notes**: _______________
