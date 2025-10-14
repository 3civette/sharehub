# Data Model: Event Advertisement Banner System

**Feature**: 010-ok-now-i | **Date**: 2025-10-13
**Phase**: 1 (Data Model Design)

## Entity: Banner

### Description
Represents an advertisement banner uploaded by event organizers. Each banner is assigned to one of 5 predefined slots and can optionally link to an external URL.

### Table Schema

```sql
CREATE TABLE public.banners (
  -- Primary Key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys (Multi-tenant isolation)
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Banner Properties
  slot_number integer NOT NULL CHECK (slot_number BETWEEN 1 AND 5),
  storage_path text NOT NULL, -- Supabase Storage path
  filename text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 5242880), -- Max 5MB
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),

  -- Optional Click URL
  click_url text NULL CHECK (click_url IS NULL OR click_url ~ '^https?://'),

  -- Status & Visibility
  is_active boolean NOT NULL DEFAULT true,

  -- Audit Fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL, -- Soft delete

  -- Constraints
  CONSTRAINT unique_event_slot_active UNIQUE (event_id, slot_number) WHERE deleted_at IS NULL,
  CONSTRAINT storage_path_pattern CHECK (storage_path ~ '^tenant-.+/event-.+/banner-.+\.(jpg|png|webp)$')
);

-- Indexes
CREATE INDEX idx_banners_event_id ON public.banners(event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_banners_tenant_id ON public.banners(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_banners_slot ON public.banners(slot_number) WHERE deleted_at IS NULL AND is_active = true;

-- Comments
COMMENT ON TABLE public.banners IS 'Advertisement banners for event pages, managed by event organizers';
COMMENT ON COLUMN public.banners.slot_number IS 'Banner slot position (1-5), each with predefined dimensions';
COMMENT ON COLUMN public.banners.storage_path IS 'Supabase Storage path: tenant-{id}/event-{id}/banner-{id}-slot-{num}.{ext}';
COMMENT ON COLUMN public.banners.click_url IS 'Optional external URL for banner clicks (opens in new tab)';
COMMENT ON COLUMN public.banners.is_active IS 'Controls banner visibility on public event page';
```

### Field Specifications

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| `id` | uuid | PK, auto-generated | Unique banner identifier |
| `tenant_id` | uuid | FK → tenants, NOT NULL | Multi-tenant isolation |
| `event_id` | uuid | FK → events, NOT NULL | Associates banner with event |
| `slot_number` | integer | 1-5 range, NOT NULL | Fixed slot position |
| `storage_path` | text | Pattern check, NOT NULL | Supabase Storage location |
| `filename` | text | NOT NULL | Original uploaded filename |
| `file_size` | integer | 1-5242880 bytes, NOT NULL | File size validation |
| `mime_type` | text | Enum check, NOT NULL | image/jpeg\|png\|webp |
| `click_url` | text | URL pattern or NULL | Optional external link |
| `is_active` | boolean | NOT NULL, default true | Visibility toggle |
| `created_at` | timestamptz | NOT NULL, auto | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, auto | Last update timestamp |
| `deleted_at` | timestamptz | NULL | Soft delete marker |

### Validation Rules

**From FR-004**: File validation
- **Formats**: Only JPEG, PNG, WebP (`mime_type` check constraint)
- **Size**: Maximum 5MB (5,242,880 bytes) (`file_size` check constraint)
- **Dimensions**: Recommended 1200x300px (enforced in frontend, not database)

**From FR-009, FR-010**: Slot management
- **Slot Range**: 1-5 only (`slot_number` check constraint)
- **Uniqueness**: One banner per slot per event (partial unique index excluding soft-deleted)

**From FR-011**: Click URL
- **Pattern**: Must start with http:// or https:// if provided (`click_url` check constraint)
- **Target**: Opens in new tab (frontend behavior, `target="_blank" rel="noopener noreferrer"`)

**From FR-013**: Visibility
- **Lifetime**: Banners visible as long as event is accessible (no `start_date`/`end_date` columns)
- **Control**: `is_active` flag provides manual visibility toggle

### State Transitions

```
[Upload Request]
     ↓
[Validation] → (Invalid) → [Error: 400 Bad Request]
     ↓ (Valid)
[Storage Upload] → (Fail) → [Error: 500 Internal Server Error]
     ↓ (Success)
[Database Insert]
     ↓
[Active Banner] ← (is_active = true)
     ↓
[Deactivated] ← (is_active = false, via PATCH)
     ↓
[Soft Deleted] ← (deleted_at = now(), via DELETE)
```

**No Reactivation**: Once soft-deleted, banners cannot be undeleted (business rule).

---

## Relationships

### Banner → Event (Many-to-One)
- **Foreign Key**: `banners.event_id → events.id`
- **Cardinality**: Many banners per event (max 5 active per event)
- **Cascade**: ON DELETE CASCADE (event deletion removes all banners)
- **Business Rule**: Enforced by `unique_event_slot_active` constraint

### Banner → Tenant (Many-to-One)
- **Foreign Key**: `banners.tenant_id → tenants.id`
- **Cardinality**: Many banners per tenant
- **Cascade**: ON DELETE CASCADE (tenant deletion removes all banners)
- **Purpose**: Multi-tenant data isolation for RLS policies

### Event → Banner (One-to-Many)
- **Inverse**: Event can have 0-5 active banners
- **Query Pattern**:
  ```sql
  SELECT * FROM banners
  WHERE event_id = $1
  AND deleted_at IS NULL
  ORDER BY slot_number ASC;
  ```

---

## TypeScript Types

```typescript
// Database row type
export interface Banner {
  id: string;
  tenant_id: string;
  event_id: string;
  slot_number: 1 | 2 | 3 | 4 | 5;
  storage_path: string;
  filename: string;
  file_size: number;
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp';
  click_url: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at: string | null; // ISO 8601
}

// API request types
export interface BannerCreateInput {
  event_id: string;
  slot_number: 1 | 2 | 3 | 4 | 5;
  file: File; // Browser File object
  click_url?: string;
}

export interface BannerUpdateInput {
  slot_number?: 1 | 2 | 3 | 4 | 5;
  click_url?: string | null;
  is_active?: boolean;
}

// API response types
export interface BannerResponse {
  id: string;
  slot_number: number;
  storage_url: string; // Public URL from Supabase Storage
  filename: string;
  file_size: number;
  click_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Frontend display type
export interface BannerDisplay extends BannerResponse {
  dimensions: { width: number; height: number };
  label: string;
}
```

---

## Migration Strategy

**Two-file approach** (following existing pattern from feature 009):

1. **`20250113_create_banners_table.sql`**: Schema creation, constraints, indexes
2. **`20250113_rls_banners.sql`**: RLS policies for tenant isolation

**Migration Naming**: Use current date format (`YYYYMMDD_description.sql`)

**Rollback Strategy**: Each migration includes DROP statements in comments for manual rollback if needed.

---

## Data Integrity Rules

1. **Tenant Isolation**: All queries MUST filter by `tenant_id` (enforced by RLS)
2. **Soft Delete Only**: No hard deletes; set `deleted_at` timestamp
3. **Unique Slots**: Only one active banner per slot per event (enforced by partial unique index)
4. **Cascade Deletes**: Event/tenant deletion soft-deletes all related banners
5. **File Size Validation**: Enforced at database level (check constraint) and API level
6. **URL Safety**: Click URLs validated for https:// protocol (check constraint)

---

## Performance Considerations

- **Index Coverage**: Queries by `event_id`, `tenant_id`, and `slot_number` are indexed
- **Partial Indexes**: Exclude `deleted_at IS NOT NULL` rows from indexes
- **Storage Caching**: Banner files cached for 1 year (`Cache-Control: max-age=31536000`)
- **Lazy Loading**: Use `loading="lazy"` attribute for banner images
- **Expected Load**: ~5 rows per event, ~500 active banners total across platform

---

**Data Model Complete**: Ready for API contract generation (Phase 1 continues).
