# Implementation Plan: UI/UX Design System & Meeting Hub Rebrand

**Branch**: `007-voglio-che-l` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-voglio-che-l/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
   → Loaded successfully
2. Fill Technical Context ✓
   → Project Type: web (frontend + backend detected)
   → Structure Decision: Web application with frontend/backend split
3. Fill the Constitution Check section ✓
4. Evaluate Constitution Check section
   → No violations detected: UI-only changes maintain existing architecture
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md
   → All technical details resolved via clarification session
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
**Primary Requirement**: Rebrand shareHub to "Meeting Hub" and implement 3Civette design system across all admin and public pages with tenant branding override support.

**Technical Approach**: Frontend-only changes updating Tailwind configuration, component styling, typography, and brand assets. Design system implemented via CSS custom properties for tenant overrides. No backend or database changes required.

## Technical Context
**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Next.js 14 App Router, Tailwind CSS 3.x, Lucide React, Supabase Client
**Storage**: Supabase PostgreSQL (existing schema unchanged), Supabase Storage (for tenant logos)
**Testing**: Vitest (existing test infrastructure)
**Target Platform**: Web (Chrome, Firefox, Safari, Edge - modern browsers)
**Project Type**: web - frontend + backend separation
**Performance Goals**: LCP < 2.5s on 4G, lazy image loading, maintain existing < 1s dashboard load
**Constraints**: No breaking changes to existing functionality, maintain responsive design, WCAG AA compliance
**Scale/Scope**: ~20 React components to update, 10-15 pages to rebrand, design token system implementation

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. No Easy Fixes ✅ PASS
- Not applicable: No existing bugs being fixed
- Design system properly replaces ad-hoc styling

### II. Security First ✅ PASS
- No RLS changes: tenant branding already secured via existing policies
- Accessibility validation (FR-035, FR-036) maintains WCAG compliance
- No new security surfaces introduced

### III. Test-Driven Development (TDD) ✅ PASS
- Will create contract tests for branding API validation
- Visual regression testing for design system components
- Integration tests for tenant branding override behavior

### IV. Multi-Tenant Isolation ✅ PASS
- Existing tenant isolation unchanged
- Tenant branding uses existing RLS-protected branding table
- No new cross-tenant data access

### V. UX-First Design ✅ PASS
- Primary goal: improve user experience with professional design
- Performance maintained: FR-030 (LCP < 2.5s)
- Accessibility enhanced: FR-018 through FR-022
- Mobile-responsive preserved: FR-015 through FR-017

### VI. Simplicity ✅ PASS
- Uses existing Tailwind CSS (no new dependencies except Lucide React for icons)
- CSS custom properties for tenant branding (standard web feature)
- No new architecture patterns introduced
- Builds on existing component structure

**Result**: All constitutional principles satisfied. No violations to document.

## Project Structure

### Documentation (this feature)
```
specs/007-voglio-che-l/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   └── branding-validation.contract.json
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── routes/
│   │   └── branding.ts          # Add color validation endpoint
│   ├── services/
│   │   └── brandingService.ts   # Add contrast validation logic
│   └── validators/
│       └── colorValidator.ts     # NEW: WCAG AA contrast checker
└── tests/
    ├── contract/
    │   └── brandingValidation.test.ts  # NEW: Contract tests for validation
    └── integration/
        └── brandingOverride.test.ts    # NEW: Tenant branding flow tests

frontend/
├── public/
│   └── fonts/                    # NEW: Archivo Black, Bebas Neue fonts
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Update: Meeting Hub metadata
│   │   ├── admin/               # Update all admin pages
│   │   └── events/[slug]/       # Update public event pages
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx       # Update: 3Civette button styles
│   │   │   ├── Card.tsx         # Update: 3Civette card styles
│   │   │   ├── Input.tsx        # Update: Focus ring, borders
│   │   │   └── Header.tsx       # Update: Sticky, backdrop blur
│   │   └── admin/
│   │       └── BrandingSettings.tsx  # Update: Add contrast validation UI
│   ├── contexts/
│   │   └── TenantContext.tsx    # Update: Apply 3Civette defaults
│   ├── styles/
│   │   └── globals.css          # Update: Design tokens, typography
│   └── lib/
│       └── designTokens.ts       # NEW: 3Civette design system constants
└── tests/
    └── integration/
        └── designSystem.test.tsx  # NEW: Visual regression tests

tailwind.config.ts                # Update: 3Civette colors, spacing, fonts
package.json                      # Add: lucide-react dependency
```

**Structure Decision**: Web application structure with frontend/backend split. Frontend changes dominate (~80% of work), with minimal backend additions for color validation. All changes are additive and maintain backward compatibility.

## Phase 0: Outline & Research
*All technical unknowns resolved via clarification session during /specify phase*

### Research Findings

**Decision 1**: Design System Scope
- **Chosen**: Apply to both admin and public pages
- **Rationale**: Consistent brand experience, clarified in session
- **Alternatives considered**: Admin-only (rejected for inconsistent UX)

**Decision 2**: Tenant Branding Strategy
- **Chosen**: 3Civette defaults with tenant color override capability
- **Rationale**: Flexibility for white-label while maintaining design quality
- **Alternatives considered**: Full replacement (rejected - loses design system), coexistence (rejected - confusing dual-brand)

**Decision 3**: Brand Identity
- **Chosen**: Complete rebrand to "Meeting Hub"
- **Rationale**: Clear direction from clarification session
- **Alternatives considered**: Partial adoption (rejected via clarification)

**Decision 4**: Accessibility Validation
- **Chosen**: Validate colors, show warning but allow override
- **Rationale**: Balance accessibility with tenant autonomy
- **Alternatives considered**: Hard block (rejected - too restrictive), no validation (rejected - poor accessibility)

**Decision 5**: Icon System
- **Chosen**: Lucide React at 24×24px
- **Rationale**: Recommended in UI spec, modern, tree-shakeable
- **Alternatives considered**: Feather Icons (less React-optimized), existing icons (inconsistent)

**Decision 6**: Typography Implementation
- **Chosen**: Google Fonts CDN for Archivo Black/Bebas Neue + system Inter
- **Rationale**: Fast loading, no licensing concerns, wide browser support
- **Alternatives considered**: Self-hosted fonts (slower, more setup)

**Decision 7**: Design Token Strategy
- **Chosen**: CSS custom properties at :root + Tailwind theme extension
- **Rationale**: Native browser feature, works with existing Tailwind, tenant overrides via context
- **Alternatives considered**: CSS-in-JS (performance overhead), Tailwind-only (no runtime overrides)

**No NEEDS CLARIFICATION remaining**: All resolved via /clarify session

**Output**: research.md (complete inline above)

## Phase 1: Design & Contracts

### Data Model
*See data-model.md for full details*

**Key Entities**:
1. **DesignTokens** (frontend TypeScript constants)
   - Colors: brand-black, brand-ink, brand-gold, brand-silver
   - Spacing: 4px scale (1-16 units)
   - Typography: font families, sizes, weights
   - Radii: 16px, 20px
   - Shadow: 0 8px 24px rgba(0,0,0,.08)

2. **BrandingOverride** (existing database table - no changes)
   - tenant_id: uuid
   - primary_color: varchar(7)
   - secondary_color: varchar(7)
   - logo_url: text
   - contrast_warnings: jsonb (NEW field to track validation)

### API Contracts
*See contracts/ directory*

**New Endpoint**: `POST /api/admin/branding/validate-colors`
- Request: `{ primary: "#D4AF37", secondary: "#0B0B0C", background: "#FFFFFF" }`
- Response: `{ valid: boolean, warnings: string[], contrastRatios: { primary: 4.5, secondary: 21 } }`
- Status: 200 (always succeeds, warnings in body)

**Updated Endpoint**: `PUT /api/admin/branding`
- Request: Add `acknowledge_warnings: boolean` field
- Response: Add `validation: { warnings: string[] }` field

### Contract Tests
*Tests fail until implementation*

```typescript
// tests/contract/brandingValidation.test.ts
describe('POST /api/admin/branding/validate-colors', () => {
  it('returns validation results for tenant colors', async () => {
    const response = await request(app)
      .post('/api/admin/branding/validate-colors')
      .send({ primary: '#D4AF37', secondary: '#0B0B0C', background: '#FFFFFF' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('valid')
    expect(response.body).toHaveProperty('warnings')
    expect(response.body).toHaveProperty('contrastRatios')
  })

  it('warns when primary color fails AA contrast', async () => {
    const response = await request(app)
      .post('/api/admin/branding/validate-colors')
      .send({ primary: '#FFFF00', secondary: '#FFFFFF', background: '#FFFFFF' })

    expect(response.body.warnings).toContain('Primary color fails WCAG AA contrast')
  })
})
```

### Integration Tests
*From user stories*

```typescript
// tests/integration/designSystem.test.tsx
describe('Design System Integration', () => {
  it('applies 3Civette colors when no tenant branding configured', async () => {
    render(<Dashboard />, { tenant: { branding: null } })
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toHaveStyle({ backgroundColor: '#D4AF37' }) // gold
  })

  it('overrides with tenant colors when configured', async () => {
    render(<Dashboard />, {
      tenant: { branding: { primary_color: '#FF0000' } }
    })
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toHaveStyle({ backgroundColor: '#FF0000' })
  })

  it('applies typography scale correctly', async () => {
    render(<EventPage />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveStyle({ fontSize: expect.stringMatching(/48|64/) })
  })
})
```

### Quickstart Validation
*See quickstart.md for full test plan*

**Manual Test Steps**:
1. Start dev servers: `npm run dev` (frontend + backend)
2. Navigate to `/admin/settings/branding`
3. Verify Meeting Hub branding visible in header
4. Upload new logo → verify preview
5. Change primary color to #FF0000 (low contrast)
6. Verify warning appears but save succeeds
7. Navigate to `/admin/dashboard`
8. Verify red buttons (tenant override working)
9. Clear tenant branding
10. Verify gold buttons (3Civette default restored)

**Acceptance Criteria**: All 36 functional requirements met per spec.md acceptance scenarios.

### Agent Context Update
*CLAUDE.md will be updated automatically via update script*

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Setup Tasks** (1-3):
   - Install Lucide React dependency
   - Add font files to public/fonts
   - Update Tailwind config with 3Civette tokens

2. **Design System Foundation** (4-8):
   - Create designTokens.ts constants
   - Update globals.css with CSS custom properties
   - Update TenantContext to apply design tokens
   - Create contrast validation utility (backend)
   - Add branding validation endpoint (backend)

3. **Component Updates** (9-18) [P]:
   - Update Button component with 3Civette styles
   - Update Card component
   - Update Input component
   - Update Header component (sticky, backdrop blur)
   - Update Form components
   - Update Typography components
   - Update Navigation (mobile off-canvas)
   - Update Loading states
   - Update Toast notifications
   - Update BrandingSettings with validation UI

4. **Page Rebranding** (19-25) [P]:
   - Update layout.tsx metadata (Meeting Hub)
   - Update admin dashboard page
   - Update admin events page
   - Update admin settings pages
   - Update public event page
   - Update 404/error pages
   - Update documentation references

5. **Testing** (26-30):
   - Write contract tests for validation endpoint [P]
   - Write integration tests for tenant override [P]
   - Write visual regression tests for components [P]
   - Update existing tests for new brand name
   - Run accessibility audit (axe-core)

6. **Validation** (31-33):
   - Execute quickstart.md manual test plan
   - Performance testing (LCP < 2.5s)
   - Cross-browser testing

**Ordering Strategy**:
- Foundation first (tokens, config) → enables parallel component work
- Backend validation early → unblocks frontend validation UI
- Components in parallel [P] → independent files
- Pages in parallel [P] after components done
- Tests in parallel [P] after implementation

**Estimated Output**: ~33 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, execute quickstart.md, verify performance targets)

## Complexity Tracking
*No constitutional violations - table remains empty*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _None_    | _N/A_      | _N/A_                               |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution - See `.specify/memory/constitution.md`*
