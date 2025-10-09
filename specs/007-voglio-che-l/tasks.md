# Tasks: UI/UX Design System & Meeting Hub Rebrand

**Input**: Design documents from `/specs/007-voglio-che-l/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: TypeScript 5.3+, Next.js 14, Tailwind 3.x, Lucide React
   → Structure: Web app (frontend/ + backend/)
2. Load optional design documents ✓
   → data-model.md: DesignTokens, BrandingOverride entities
   → contracts/: branding-validation.contract.json
   → research.md: 7 technical decisions documented
   → quickstart.md: 8-part validation test plan
3. Generate tasks by category ✓
   → Setup: 3 tasks (dependencies, config)
   → Tests: 6 tasks (contract + integration)
   → Core: 21 tasks (tokens, components, pages)
   → Integration: 3 tasks (validation, branding)
   → Polish: 3 tasks (accessibility, performance)
4. Apply task rules ✓
   → Different files = marked [P]
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T036) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
   → Contract has test: Yes
   → Entities have implementation: Yes
   → Tests before implementation: Yes
9. Return: SUCCESS (36 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app structure**: `backend/src/`, `frontend/src/`
- All paths relative to repository root
- Tests in `backend/tests/` and `frontend/tests/`

---

## Phase 3.1: Setup & Configuration

- [ ] **T001** Install lucide-react dependency in `frontend/package.json`
  - Run: `cd frontend && npm install lucide-react`
  - Verify: Package appears in package.json dependencies

- [ ] **T002** Add Google Fonts preconnect links to `frontend/src/app/layout.tsx`
  - Add `<link rel="preconnect" href="https://fonts.googleapis.com" />`
  - Add `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin />`
  - Add `<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />`
  - Set `font-display: swap` for FOIT prevention

- [ ] **T003** Update Tailwind config with 3Civette design tokens in `tailwind.config.ts`
  - Add custom colors to `theme.extend.colors`:
    - `brand: { black: '#0B0B0C', ink: '#111827', gold: '#D4AF37', silver: '#E5E7EB' }`
    - `bg: '#FFFFFF', bgSoft: '#F8FAFC'`
    - `ok: '#16a34a', warn: '#f59e0b', error: '#dc2626'`
  - Add custom spacing scale (4px increments)
  - Add custom border radius: `xl: '20px'`
  - Add custom shadow: `brand: '0 8px 24px rgba(0, 0, 0, 0.08)'`
  - Add font families: `display: ['Archivo Black', 'Bebas Neue', 'system-ui']`, `sans: ['Inter', 'ui-sans-serif', 'system-ui']`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T004** [P] Contract test POST /api/admin/branding/validate-colors in `backend/tests/contract/brandingValidation.test.ts`
  - Test 1: Valid colors return no warnings
  - Test 2: Invalid primary color returns warning
  - Test 3: Returns contrast ratios for both colors
  - Test 4: Returns recommendations when warnings exist
  - Test 5: Rejects malformed hex colors (400)
  - Verify: ALL TESTS FAIL (endpoint doesn't exist yet)

- [ ] **T005** [P] Integration test for design system defaults in `frontend/tests/integration/designSystem.test.tsx`
  - Test 1: 3Civette colors applied when no tenant branding
  - Test 2: Typography scale applied correctly (H1, body)
  - Test 3: Spacing system applied (4px increments)
  - Test 4: Icon sizes are 24×24px
  - Verify: ALL TESTS FAIL (design system not implemented)

- [ ] **T006** [P] Integration test for tenant branding override in `frontend/tests/integration/brandingOverride.test.tsx`
  - Test 1: Tenant colors override defaults when configured
  - Test 2: CSS custom properties updated dynamically
  - Test 3: Tenant logo displayed in header
  - Test 4: Defaults restored when branding cleared
  - Verify: ALL TESTS FAIL (override logic doesn't exist)

---

## Phase 3.3: Design System Foundation

- [ ] **T007** Create design tokens constants in `frontend/src/lib/designTokens.ts`
  - Export `designTokens` object with colors, spacing, fonts, radius, shadow
  - Match structure from data-model.md
  - Add TypeScript types for token structure

- [ ] **T008** Update global CSS with design system in `frontend/src/styles/globals.css`
  - Define CSS custom properties at `:root` for all design tokens
  - Add `:root[data-tenant-branding]` selector for tenant overrides
  - Import Google Fonts
  - Set base typography styles (line-height: 1.6)

- [ ] **T009** Create WCAG contrast calculator utility in `backend/src/validators/colorValidator.ts`
  - Implement `hexToRgb(hex: string): RGB` function
  - Implement `relativeLuminance(rgb: RGB): number` function
  - Implement `calculateContrastRatio(color1: string, color2: string): number` function
  - Implement `meetsWCAG_AA(ratio: number, fontSize: 'normal' | 'large'): boolean` function
  - Export all functions with TypeScript types

- [ ] **T010** Create branding validation endpoint in `backend/src/routes/branding.ts`
  - Add `POST /api/admin/branding/validate-colors` endpoint
  - Request body: `{ primary, secondary, background }`
  - Calculate contrast ratios using colorValidator
  - Return response matching contract schema (valid, warnings, contrastRatios, recommendations)
  - Handle 400 errors for invalid hex format

- [ ] **T011** Update TenantContext to apply design tokens in `frontend/src/contexts/TenantContext.tsx`
  - Add `applyBranding(branding: BrandingOverride | null)` function
  - Set CSS custom properties on `:root` element
  - If branding null, apply designTokens defaults
  - If branding exists, apply tenant colors
  - Add `resetBranding()` function to restore defaults

---

## Phase 3.4: Component Updates
**Components can be updated in parallel [P] as they are independent files**

- [ ] **T012** [P] Update Button component in `frontend/src/components/common/Button.tsx`
  - Primary variant: `bg-[var(--color-primary)] text-brand-black hover:brightness-95 shadow-brand`
  - Secondary variant: `border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10`
  - Border radius: `rounded-xl` (20px)
  - Padding: `px-5 py-3` (20px/12px)
  - Text: uppercase with tracking-wide
  - Add disabled state: `opacity-50 cursor-not-allowed`

- [ ] **T013** [P] Update Card component in `frontend/src/components/common/Card.tsx`
  - Background: `bg-white`
  - Border: `border border-brand-silver`
  - Shadow: `shadow-brand`
  - Border radius: `rounded-2xl` (20px)
  - Hover: `hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200`
  - Padding: `p-4` (16px)

- [ ] **T014** [P] Update Input component in `frontend/src/components/common/Input.tsx`
  - Border: `border border-brand-silver`
  - Focus ring: `focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent`
  - Border radius: `rounded` (16px)
  - Padding: `px-4 py-2`
  - Label: Visible (not placeholder-only), `text-brand-ink`
  - Error state: `border-error text-error`

- [ ] **T015** [P] Update Header component in `frontend/src/components/common/Header.tsx`
  - Make sticky: `sticky top-0 z-50`
  - Background: `bg-white/95 backdrop-blur-md`
  - Add Meeting Hub branding/logo
  - Desktop: horizontal navigation
  - Mobile: hamburger menu (implement in T016)

- [ ] **T016** [P] Create mobile navigation component in `frontend/src/components/common/MobileNav.tsx`
  - Off-canvas drawer pattern
  - Full-height: `h-screen`
  - Slide animation: 200ms
  - Focus trap on open
  - ESC key to close
  - Overlay with `backdrop-blur`

- [ ] **T017** [P] Update Form components in `frontend/src/components/common/` (FormGroup, FormError, FormSuccess)
  - FormError: Red text `text-error`, positioned below input
  - FormSuccess: Toast notification component
  - Consistent spacing: 8px between label and input, 4px between input and error

- [ ] **T018** [P] Update Typography components (H1, H2, H3, Body, Caption) in `frontend/src/components/common/Typography.tsx`
  - H1: `font-display text-6xl lg:text-7xl` (48-64px desktop, 36-40px mobile)
  - H2: `font-display text-4xl lg:text-5xl` (32-40px)
  - H3: `font-display text-2xl` (22-24px)
  - Body: `font-sans text-base lg:text-lg leading-relaxed` (16-18px, 1.6 line-height)
  - Caption: `font-sans text-sm` (13-14px)

- [ ] **T019** [P] Update LoadingSpinner component in `frontend/src/components/common/LoadingSpinner.tsx`
  - Color: `text-[var(--color-primary)]`
  - Size variants: sm (16px), md (24px), lg (32px)

- [ ] **T020** [P] Update Toast notification component in `frontend/src/components/common/Toast.tsx`
  - Success: `bg-ok text-white`
  - Error: `bg-error text-white`
  - Warning: `bg-warn text-brand-black`
  - Border radius: `rounded-xl`
  - Auto-hide after 5 seconds

- [ ] **T021** Update BrandingSettings component in `frontend/src/components/admin/BrandingSettings.tsx`
  - Add color validation UI (calls T010 endpoint)
  - Display warnings when validation fails
  - Show contrast ratios and recommendations
  - "Save Anyway" button enabled despite warnings
  - "I acknowledge accessibility concerns" checkbox
  - Real-time validation on color input change/blur

---

## Phase 3.5: Page Rebranding
**Pages can be updated in parallel [P] after components are done**

- [ ] **T022** [P] Update root layout metadata in `frontend/src/app/layout.tsx`
  - Change title from "shareHub" to "Meeting Hub"
  - Update `<meta name="application-name">` to "Meeting Hub"
  - Update `<meta property="og:site_name">` to "Meeting Hub"
  - Update favicon/app icons if needed

- [ ] **T023** [P] Update admin dashboard page in `frontend/src/app/admin/dashboard/page.tsx`
  - Apply new component styles (Button, Card)
  - Verify Meeting Hub branding in header
  - Check responsive layout (12-col desktop, 6-col tablet, 4-col mobile)

- [ ] **T024** [P] Update admin events page in `frontend/src/app/admin/events/page.tsx`
  - Apply Card component updates
  - Verify pagination controls use new Button styles
  - Check mobile responsive grid collapse

- [ ] **T025** [P] Update admin settings pages in `frontend/src/app/admin/settings/`
  - Update branding settings page (already done in T021)
  - Update profile settings page
  - Update notification settings page

- [ ] **T026** [P] Update public event page in `frontend/src/app/events/[slug]/page.tsx`
  - Apply design system (same as admin pages)
  - Verify typography scale
  - Check CTA button styling

- [ ] **T027** [P] Update 404 and error pages in `frontend/src/app/not-found.tsx` and `error.tsx`
  - Apply design system styling
  - Update branding references

- [ ] **T028** [P] Update documentation in `README.md` and any `/docs` files
  - Replace "shareHub" with "Meeting Hub"
  - Update screenshots if any
  - Update setup instructions if branding-related

---

## Phase 3.6: Accessibility & Icon System

- [ ] **T029** Replace existing icons with Lucide React throughout application
  - Audit all current icon usage
  - Import from lucide-react: `import { Calendar, Settings, User } from 'lucide-react'`
  - Set size prop: `<Calendar size={24} />`
  - Add aria-label to icon-only buttons: `<button aria-label="Open calendar"><Calendar size={24} /></button>`
  - Update 10-15 icon instances across components

- [ ] **T030** [P] Add skip-to-content link in `frontend/src/app/layout.tsx`
  - Add visually hidden link at top: `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>`
  - Add `id="main-content"` to main element
  - Style focus state with gold ring

- [ ] **T031** [P] Verify focus rings on all interactive elements
  - Test keyboard navigation (Tab through all buttons, links, inputs)
  - Ensure `focus:ring-2 focus:ring-[var(--color-primary)]` applied
  - Add focus-visible styles where missing

---

## Phase 3.7: Testing & Validation

- [ ] **T032** [P] Run accessibility audit with axe-core in `frontend/tests/accessibility/audit.test.ts`
  - Test all major pages (dashboard, events, settings)
  - Verify WCAG AA contrast compliance
  - Check for missing aria-labels
  - Verify focus management

- [ ] **T033** [P] Update existing tests for Meeting Hub rebrand
  - Find and replace "shareHub" with "Meeting Hub" in test assertions
  - Update snapshot tests if UI changed
  - Run full test suite: `npm test`

- [ ] **T034** Performance testing: Verify LCP < 2.5s on throttled 4G
  - Use Chrome DevTools Network throttling (Fast 3G)
  - Load `/admin/dashboard` with hard refresh
  - Check Lighthouse performance score
  - Verify lazy loading on images

- [ ] **T035** Execute quickstart.md manual validation plan
  - Complete all 8 test sections (60+ test cases)
  - Verify all 36 functional requirements met
  - Test on Chrome, Firefox, Safari if available
  - Test mobile viewport (375px), tablet (768px), desktop (1200px+)
  - Document any failures for fixing

- [ ] **T036** Cross-browser compatibility testing
  - Test on Chrome (verify baseline)
  - Test on Firefox (CSS custom properties, fonts)
  - Test on Safari if available (font rendering)
  - Test on Edge (modern Chromium-based)

---

## Dependencies

### Sequential Dependencies
- T001-T003 (Setup) must complete before any other tasks
- T004-T006 (Tests) must complete before T007-T036 (Implementation)
- T007-T011 (Foundation) must complete before T012-T021 (Components)
- T012-T021 (Components) must complete before T022-T028 (Pages)
- T029-T031 (Icons/A11y) can run anytime after T012
- T032-T036 (Testing) must run last

### Parallel Opportunities
- **Tests (T004-T006)**: All 3 can run in parallel [P]
- **Foundation (T007-T011)**: T007-T008 (frontend) parallel with T009-T010 (backend) [P]
- **Components (T012-T021)**: All 10 can run in parallel [P] (different files)
- **Pages (T022-T028)**: All 7 can run in parallel [P] (different files)
- **Testing (T032-T034)**: Can run in parallel [P]

---

## Parallel Execution Examples

### Example 1: Run all tests in parallel (after setup)
```bash
# Terminal 1
npm test backend/tests/contract/brandingValidation.test.ts

# Terminal 2
npm test frontend/tests/integration/designSystem.test.tsx

# Terminal 3
npm test frontend/tests/integration/brandingOverride.test.tsx
```

### Example 2: Update components in parallel (after foundation)
```bash
# Can use Task agent to launch multiple parallel tasks:
Task: "Update Button component in frontend/src/components/common/Button.tsx per T012 specifications"
Task: "Update Card component in frontend/src/components/common/Card.tsx per T013 specifications"
Task: "Update Input component in frontend/src/components/common/Input.tsx per T014 specifications"
# (Launch T012-T021 all together)
```

### Example 3: Rebrand pages in parallel (after components)
```bash
Task: "Update root layout metadata in frontend/src/app/layout.tsx per T022"
Task: "Update admin dashboard in frontend/src/app/admin/dashboard/page.tsx per T023"
Task: "Update admin events in frontend/src/app/admin/events/page.tsx per T024"
# (Launch T022-T028 all together)
```

---

## Task Checklist

- [x] All contracts have corresponding tests (T004 covers branding-validation contract)
- [x] All entities have implementation tasks (DesignTokens in T007, BrandingOverride uses existing)
- [x] All tests come before implementation (T004-T006 before T007+)
- [x] Parallel tasks truly independent (verified different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---

## Validation Checklist
*GATE: Checked before marking feature complete*

- [ ] All 36 tasks completed
- [ ] All tests passing (T004-T006, T032-T033)
- [ ] Quickstart.md validation passed (T035)
- [ ] Performance targets met: LCP < 2.5s (T034)
- [ ] Accessibility audit passed: No WCAG violations (T032)
- [ ] Cross-browser testing passed (T036)
- [ ] Meeting Hub rebrand complete throughout app (T022-T028)
- [ ] Tenant branding override works (tested in T006, T021)
- [ ] Design system applied consistently (verified in T005, T035)

---

## Notes

- **[P]** tasks = different files, no dependencies, can run in parallel
- **Sequential** tasks = same file or dependencies, must run in order
- Verify tests fail before implementing (TDD principle)
- Commit after each task or logical group
- Keep dev servers running during development for hot reload
- Use browser DevTools to inspect CSS custom properties and design tokens

---

## Estimated Timeline

**Setup**: 30 minutes (T001-T003)
**Tests**: 2 hours (T004-T006)
**Foundation**: 3 hours (T007-T011)
**Components**: 4 hours (T012-T021) - can parallelize
**Pages**: 2 hours (T022-T028) - can parallelize
**Icons/A11y**: 2 hours (T029-T031)
**Testing**: 3 hours (T032-T036)

**Total**: ~16-18 hours (2-3 days for solo developer)
**With Parallelization**: ~12-14 hours (components and pages in parallel)

---

*Generated from plan.md, research.md, data-model.md, contracts/, and quickstart.md*
