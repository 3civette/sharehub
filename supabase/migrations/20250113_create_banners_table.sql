-- Migration: Create banners table for event advertisement system
-- Feature: 010-ok-now-i
-- Date: 2025-01-13

-- Create the banners table
CREATE TABLE IF NOT EXISTS public.banners (
  -- Primary Key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys (Multi-tenant isolation)
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Banner Properties
  slot_number integer NOT NULL CHECK (slot_number BETWEEN 1 AND 5),
  storage_path text NOT NULL,
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
  CONSTRAINT storage_path_pattern CHECK (storage_path ~ '^tenant-.+/event-.+/banner-.+\\.(jpg|png|webp)$')
);

-- Create partial unique index for slot uniqueness (only for non-deleted banners)
CREATE UNIQUE INDEX IF NOT EXISTS unique_event_slot_active
  ON public.banners(event_id, slot_number)
  WHERE deleted_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_banners_event_id
  ON public.banners(event_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_banners_tenant_id
  ON public.banners(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_banners_slot
  ON public.banners(slot_number)
  WHERE deleted_at IS NULL AND is_active = true;

-- Add table and column comments
COMMENT ON TABLE public.banners IS 'Advertisement banners for event pages, managed by event organizers';
COMMENT ON COLUMN public.banners.slot_number IS 'Banner slot position (1-5), each with predefined dimensions';
COMMENT ON COLUMN public.banners.storage_path IS 'Supabase Storage path: tenant-{id}/event-{id}/banner-{id}-slot-{num}.{ext}';
COMMENT ON COLUMN public.banners.click_url IS 'Optional external URL for banner clicks (opens in new tab)';
COMMENT ON COLUMN public.banners.is_active IS 'Controls banner visibility on public event page';
COMMENT ON COLUMN public.banners.deleted_at IS 'Soft delete timestamp - banner hidden when populated';

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER banners_updated_at_trigger
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_banners_updated_at();
