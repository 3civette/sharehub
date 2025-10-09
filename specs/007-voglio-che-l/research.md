# Research: UI/UX Design System & Meeting Hub Rebrand

**Feature**: 007-voglio-che-l
**Date**: 2025-10-08

## Research Summary
All technical decisions were resolved during the `/clarify` phase via interactive clarification session. No additional research was required during planning.

## Decision Log

### Decision 1: Design System Scope
**Question**: Should the design system apply to admin pages only or include public pages?

**Chosen**: Apply to both admin and public event pages

**Rationale**:
- Provides consistent brand experience across all user touchpoints
- Hotel managers/guests see same professional design
- Reduces maintenance burden (single design system)
- Clarified explicitly in session Q1

**Alternatives Considered**:
- **Admin-only**: Rejected - would create inconsistent UX between admin and public views
- **Different systems**: Rejected - adds complexity, harder to maintain

**Impact**: Increases scope to ~15 pages (vs ~8 admin-only) but improves overall UX

---

### Decision 2: Tenant Branding Strategy
**Question**: How should tenant custom branding interact with the 3Civette design system?

**Chosen**: 3Civette design system as default, tenant branding colors override when configured

**Rationale**:
- Provides professional defaults for tenants without custom branding
- Allows white-label customization for tenants who want it
- Maintains design system quality while enabling flexibility
- Clarified explicitly in session Q2

**Alternatives Considered**:
- **Full replacement**: Rejected - tenants lose benefit of design system quality
- **Coexistence (dual branding)**: Rejected - confusing, poor UX, unclear precedence

**Impact**: Requires CSS custom property strategy for runtime color override

---

### Decision 3: Brand Identity
**Question**: Is this a rebrand to "3Civette" or keeping "shareHub" with their design?

**Chosen**: Complete rebrand to "Meeting Hub"

**Rationale**:
- Clear user directive in clarification session
- Meeting Hub better describes the purpose (meeting/event management)
- Clarified explicitly in session Q3

**Alternatives Considered**:
- **Keep shareHub name**: Rejected via clarification
- **Rebrand to 3Civette**: Rejected - 3Civette is service provider, not product name

**Impact**: Requires updating all UI text, metadata, documentation with new name

---

### Decision 4: Accessibility Validation
**Question**: Should system block tenant colors that fail accessibility or allow them?

**Chosen**: Validate colors for WCAG AA compliance, show warning but allow override

**Rationale**:
- Balances accessibility best practices with tenant autonomy
- Educates tenants about accessibility issues
- Doesn't force compliance (tenant decision)
- Clarified explicitly in session Q4

**Alternatives Considered**:
- **Hard block on invalid colors**: Rejected - too restrictive, limits tenant control
- **No validation**: Rejected - poor accessibility outcomes, no tenant education

**Impact**: Requires WCAG contrast calculation library (backend), warning UI (frontend)

---

### Decision 5: Icon System
**Question**: Which icon library should be used for consistency?

**Chosen**: Lucide React at 24×24px throughout application

**Rationale**:
- Recommended in 3Civette UI spec
- Modern, actively maintained
- Tree-shakeable (only imports used icons)
- Excellent React integration
- Clarified explicitly in session Q5

**Alternatives Considered**:
- **Feather Icons**: Rejected - less React-optimized, similar but older
- **Existing mixed icons**: Rejected - inconsistent, various sources

**Impact**: Requires `lucide-react` package installation, icon replacement in components

---

### Decision 6: Typography Implementation
**Question**: How to implement custom display fonts (Archivo Black / Bebas Neue)?

**Chosen**: Google Fonts CDN for display fonts, system Inter for body

**Rationale**:
- Fast loading via Google's global CDN
- No licensing concerns
- Wide browser support
- Automatic font optimization
- Industry standard approach

**Alternatives Considered**:
- **Self-hosted fonts**: Rejected - slower initial load, more setup, licensing complexity

**Impact**: Add Google Fonts links to layout.tsx, update Tailwind font config

---

### Decision 7: Design Token Strategy
**Question**: How to implement design tokens with tenant override capability?

**Chosen**: CSS custom properties at `:root` + Tailwind theme extension

**Rationale**:
- CSS custom properties are native browser feature (no runtime cost)
- Works with existing Tailwind setup
- Enables runtime tenant color overrides via JavaScript
- TenantContext can apply custom properties dynamically
- Standard web platform approach

**Alternatives Considered**:
- **CSS-in-JS (styled-components, emotion)**: Rejected - adds bundle size, runtime overhead, not needed
- **Tailwind-only with variants**: Rejected - cannot do runtime color overrides

**Impact**: Define tokens in globals.css, reference via Tailwind config, apply dynamically via TenantContext

---

## Technical Specifications

### Design Tokens Structure
```typescript
// frontend/src/lib/designTokens.ts
export const designTokens = {
  colors: {
    brand: {
      black: '#0B0B0C',
      ink: '#111827',
      gold: '#D4AF37',
      silver: '#E5E7EB',
    },
    bg: '#FFFFFF',
    bgSoft: '#F8FAFC',
    ok: '#16a34a',
    warn: '#f59e0b',
    error: '#dc2626',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    16: '64px',
  },
  fonts: {
    display: '"Archivo Black", "Bebas Neue", system-ui',
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system',
  },
  radius: {
    default: '16px',
    lg: '20px',
  },
  shadow: {
    brand: '0 8px 24px rgba(0, 0, 0, 0.08)',
  },
}
```

### CSS Custom Properties Pattern
```css
/* globals.css */
:root {
  --color-primary: var(--brand-gold);
  --color-secondary: var(--brand-black);
  /* ... */
}

/* Applied dynamically by TenantContext when tenant branding exists */
:root[data-tenant-branding] {
  --color-primary: /* tenant primary_color */;
  --color-secondary: /* tenant secondary_color */;
}
```

### Tenant Branding Override Flow
1. TenantContext fetches tenant branding on mount
2. If branding exists, applies CSS custom properties to `:root`
3. Tailwind classes reference custom properties: `bg-[var(--color-primary)]`
4. Colors update reactively without page reload

---

## Dependencies

### New Dependencies
- **lucide-react**: ^0.292.0 (icon library)

### Existing Dependencies (no changes)
- Next.js 14
- React 18
- Tailwind CSS 3.x
- Supabase Client

---

## Performance Considerations

### Font Loading Strategy
- Use `<link rel="preconnect">` for Google Fonts
- Set `font-display: swap` for FOIT prevention
- Load only required font weights (bold/black for display, regular for body)

### Icon Optimization
- Import icons individually (tree-shaking): `import { Calendar } from 'lucide-react'`
- Avoid barrel imports: `import * as Icons from 'lucide-react'`

### CSS Custom Property Performance
- Native browser feature (no JavaScript runtime cost)
- Applies globally, no per-component overhead
- Efficient tenant color switching

---

## Testing Strategy

### Visual Regression
- Snapshot tests for key components (Button, Card, Input)
- Compare before/after design system application
- Use @testing-library/react for component testing

### Accessibility
- axe-core automated accessibility audit
- Manual keyboard navigation testing
- Contrast ratio validation (backend + frontend)

### Browser Compatibility
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- CSS custom properties supported in all target browsers
- Tailwind v3 compatibility verified

---

## Migration Path

### Phase 1: Foundation
1. Install lucide-react
2. Add font links to layout
3. Update Tailwind config with tokens
4. Create designTokens.ts constants

### Phase 2: Components
1. Update base components (Button, Card, Input, etc.)
2. Test each component in isolation
3. Verify design system adherence

### Phase 3: Pages
1. Update page metadata (Meeting Hub)
2. Apply component updates to pages
3. Verify responsive behavior

### Phase 4: Branding
1. Implement contrast validation
2. Update branding settings UI
3. Test tenant override flow

---

## Open Questions
None - all resolved via clarification session.

---

## References
- [3Civette UI Spec](../../uiSpec.md)
- [Feature Specification](./spec.md)
- [Clarification Session Results](./spec.md#clarifications)
- [Lucide React Documentation](https://lucide.dev/guide/packages/lucide-react)
- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
