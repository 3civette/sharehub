# Data Model: UI/UX Design System & Meeting Hub Rebrand

**Feature**: 007-voglio-che-l
**Date**: 2025-10-08

## Overview
This feature primarily involves frontend visual changes with minimal backend data model impact. The existing tenant branding schema remains largely unchanged, with one optional field addition for tracking contrast warnings.

## Entities

### 1. DesignTokens (Frontend TypeScript Constants)
**Type**: Configuration object (not persisted)
**Purpose**: Central source of truth for 3Civette design system values

**Structure**:
```typescript
interface DesignTokens {
  colors: {
    brand: {
      black: string;     // #0B0B0C
      ink: string;       // #111827
      gold: string;      // #D4AF37
      silver: string;    // #E5E7EB
    };
    bg: string;          // #FFFFFF
    bgSoft: string;      // #F8FAFC
    ok: string;          // #16a34a
    warn: string;        // #f59e0b
    error: string;       // #dc2626
  };
  spacing: {
    1: string;           // 4px
    2: string;           // 8px
    3: string;           // 12px
    4: string;           // 16px
    6: string;           // 24px
    8: string;           // 32px
    12: string;          // 48px
    16: string;          // 64px
  };
  fonts: {
    display: string;     // "Archivo Black", "Bebas Neue", system-ui
    sans: string;        // Inter, ui-sans-serif, system-ui...
  };
  radius: {
    default: string;     // 16px
    lg: string;          // 20px
  };
  shadow: {
    brand: string;       // 0 8px 24px rgba(0, 0, 0, 0.08)
  };
  typography: {
    h1Desktop: string;   // 48-64px
    h1Mobile: string;    // 36-40px
    h2: string;          // 32-40px
    h3: string;          // 22-24px
    body: string;        // 16-18px
    caption: string;     // 13-14px
    lineHeight: number;  // 1.6
  };
}
```

**Validation Rules**:
- All color values must be valid hex codes (#RRGGBB)
- All spacing values in px
- All typography sizes in px or rem

**Relationships**: None (static configuration)

**State Transitions**: None (immutable constants)

---

### 2. BrandingOverride (Database Table - Existing)
**Table**: `branding` (already exists in database)
**Purpose**: Store tenant-specific branding overrides

**Schema** (existing fields unchanged):
```sql
CREATE TABLE branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  primary_color VARCHAR(7) NOT NULL,      -- Hex color #RRGGBB
  secondary_color VARCHAR(7) NOT NULL,    -- Hex color #RRGGBB
  logo_url TEXT,                          -- Supabase Storage URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- NEW FIELD (optional, for tracking validation history)
  contrast_warnings JSONB DEFAULT '[]'::jsonb,

  UNIQUE(tenant_id)
);
```

**NEW Field Details**:
- `contrast_warnings`: Array of warning objects from validation
  ```json
  [
    {
      "timestamp": "2025-10-08T10:30:00Z",
      "primary_contrast": 3.2,
      "secondary_contrast": 4.8,
      "warnings": ["Primary color fails WCAG AA (3.2:1, needs 4.5:1)"],
      "acknowledged": true
    }
  ]
  ```

**Validation Rules**:
- `primary_color`: Must be valid hex (#RRGGBB format)
- `secondary_color`: Must be valid hex (#RRGGBB format)
- `logo_url`: Must be valid URL or null
- `tenant_id`: Must reference existing tenant
- `contrast_warnings`: Valid JSON array

**Relationships**:
- **tenant_id** → `tenants.id` (many-to-one)
- **logo_url** → Supabase Storage `logos` bucket

**State Transitions**:
- **Created**: Admin saves first branding settings
- **Updated**: Admin modifies colors or logo
- **Validated**: Contrast check performed, warnings recorded
- **Acknowledged**: Admin saves despite warnings

**RLS Policies** (existing, unchanged):
- Admins can only view/edit branding for their own tenant
- Public users cannot access branding table directly

---

### 3. ContrastValidationResult (API Response Type)
**Type**: API response object (not persisted)
**Purpose**: Return contrast validation results to frontend

**Structure**:
```typescript
interface ContrastValidationResult {
  valid: boolean;                    // Overall validation status (true if no errors)
  warnings: string[];                // Human-readable warning messages
  contrastRatios: {
    primary: number;                 // Contrast ratio for primary color (e.g., 4.5)
    secondary: number;               // Contrast ratio for secondary color
  };
  recommendations?: {
    primary?: string;                // Suggested alternative hex color
    secondary?: string;              // Suggested alternative hex color
  };
}
```

**Validation Rules**:
- `valid`: `false` if any warnings exist
- `contrastRatios`: Values 1.0-21.0 (WCAG range)
- `warnings`: Empty array if all checks pass
- `recommendations`: Only present if warnings exist

**Example Response**:
```json
{
  "valid": false,
  "warnings": [
    "Primary color (#FFFF00) fails WCAG AA contrast (2.8:1, needs 4.5:1 for normal text)"
  ],
  "contrastRatios": {
    "primary": 2.8,
    "secondary": 18.5
  },
  "recommendations": {
    "primary": "#D4AF37"
  }
}
```

---

### 4. TenantBrandingContext (Frontend Context)
**Type**: React Context (runtime state)
**Purpose**: Provide tenant branding to components, apply CSS custom properties

**Structure**:
```typescript
interface TenantBrandingContextValue {
  branding: BrandingOverride | null;        // Current tenant's branding or null
  isLoading: boolean;                       // Loading state
  error: string | null;                     // Error message if fetch failed
  applyBranding: (branding: BrandingOverride | null) => void;  // Apply to DOM
  resetBranding: () => void;                // Reset to defaults
}
```

**Validation Rules**:
- `branding`: Must match `BrandingOverride` schema if not null
- `applyBranding`: Must update CSS custom properties at `:root`

**Relationships**:
- Consumes `BrandingOverride` from API
- Applies `DesignTokens` as fallback

**State Transitions**:
- **Initial**: `branding: null, isLoading: true`
- **Loaded (with branding)**: `branding: {...}, isLoading: false`
- **Loaded (no branding)**: `branding: null, isLoading: false` (uses defaults)
- **Error**: `error: "...", isLoading: false`

**DOM Side Effects**:
When `applyBranding()` called:
```javascript
document.documentElement.style.setProperty('--color-primary', branding.primary_color);
document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
```

---

## Relationships Diagram

```
┌─────────────────┐
│  DesignTokens   │ (Frontend constants)
│  (TypeScript)   │
└────────┬────────┘
         │ provides defaults
         ↓
┌─────────────────────────┐
│ TenantBrandingContext   │ (React Context)
│  - branding: {...}      │
│  - applyBranding()      │
└────────┬────────────────┘
         │ fetches from API
         ↓
┌──────────────────────────┐      ┌─────────────────────┐
│   branding (table)       │──────│  tenants (table)    │
│  - id                    │      │  - id               │
│  - tenant_id ────────────┼──────│  - name             │
│  - primary_color         │      └─────────────────────┘
│  - secondary_color       │
│  - logo_url              │
│  - contrast_warnings     │ (NEW)
└──────────┬───────────────┘
           │ references
           ↓
┌─────────────────────────┐
│  Supabase Storage       │
│  logos/ bucket          │
│  - tenant logo files    │
└─────────────────────────┘
```

---

## Data Flows

### Flow 1: Application Loads with Tenant Branding
```
1. TenantContext mounts
2. Fetches branding from /api/admin/branding (uses existing endpoint)
3. If branding exists:
   a. Calls applyBranding(branding)
   b. Sets CSS custom properties at :root
   c. Components use var(--color-primary) via Tailwind
4. If no branding:
   a. Calls applyBranding(null)
   b. Uses DesignTokens defaults
   c. Components use default gold/black colors
```

### Flow 2: Admin Updates Tenant Colors
```
1. Admin opens /admin/settings/branding
2. Changes primary_color to #FF0000
3. Frontend calls POST /api/admin/branding/validate-colors
4. Backend calculates contrast ratios
5. Backend returns ContrastValidationResult with warnings
6. Frontend displays warning UI
7. Admin clicks "Save Anyway"
8. Frontend calls PUT /api/admin/branding with acknowledge_warnings: true
9. Backend saves branding + contrast_warnings to database
10. Frontend calls applyBranding(newBranding)
11. CSS custom properties update
12. UI re-renders with new colors
```

### Flow 3: Tenant Without Branding Views Dashboard
```
1. User accesses /admin/dashboard
2. TenantContext fetches branding → returns null (404)
3. applyBranding(null) called
4. CSS custom properties set to DesignTokens defaults
5. Components render with 3Civette colors (gold, black, ink, silver)
```

---

## Migration Notes

### Database Migration
**Optional**: Add `contrast_warnings` column to existing `branding` table

```sql
-- Migration: Add contrast warnings tracking (OPTIONAL)
ALTER TABLE branding
ADD COLUMN IF NOT EXISTS contrast_warnings JSONB DEFAULT '[]'::jsonb;

-- No data migration needed (existing rows get empty array)
```

**Rollback**:
```sql
ALTER TABLE branding DROP COLUMN IF EXISTS contrast_warnings;
```

### No Breaking Changes
- Existing `branding` table structure unchanged (except optional field)
- Existing RLS policies unchanged
- Existing API endpoints unchanged (only new validation endpoint added)
- Frontend branding logic enhanced (not replaced)

---

## Validation Logic

### WCAG AA Contrast Calculation
Backend implementation (`backend/src/validators/colorValidator.ts`):

```typescript
function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(hexToRgb(color1));
  const l2 = relativeLuminance(hexToRgb(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function meetsWCAG_AA(ratio: number, fontSize: 'normal' | 'large'): boolean {
  return fontSize === 'normal' ? ratio >= 4.5 : ratio >= 3.0;
}
```

**Validation Rules**:
- Primary color vs white background: ≥ 4.5:1 for normal text (AA)
- Secondary color vs white background: ≥ 4.5:1 for normal text (AA)
- Large text (18pt+): ≥ 3.0:1 (relaxed)

---

## Performance Considerations

### Frontend
- **DesignTokens**: Static object, no runtime cost
- **CSS Custom Properties**: Native browser feature, efficient
- **TenantContext**: Single fetch on mount, cached in context
- **Logo Images**: Lazy loaded, Supabase CDN delivery

### Backend
- **Contrast Calculation**: O(1) operation, < 1ms per color
- **Validation Endpoint**: No database writes, fast response
- **Branding Fetch**: Indexed by tenant_id, single-row query

---

## Testing Strategy

### Unit Tests
- `DesignTokens`: Validate all values are valid CSS
- `colorValidator`: Test contrast calculation accuracy
- `TenantContext`: Test applyBranding() DOM manipulation

### Integration Tests
- Tenant branding override flow (end-to-end)
- Contrast validation API endpoint
- Default fallback behavior

### Contract Tests
- Branding validation endpoint schema
- Branding update endpoint schema

---

## Summary

**Database Changes**: Minimal (1 optional JSONB column)
**API Changes**: 1 new endpoint (validation), 1 updated endpoint (branding update)
**Frontend Changes**: New design tokens, enhanced TenantContext, component styling updates
**Breaking Changes**: None
**Migration Risk**: Low (additive changes only)
