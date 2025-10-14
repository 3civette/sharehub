-- Migration: Row Level Security policies for banners table
-- Feature: 010-ok-now-i
-- Date: 2025-01-13

-- Enable RLS on banners table
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public read access for active banners on public events
-- Allows anyone to view active banners for publicly visible events
CREATE POLICY "banners_public_read"
  ON public.banners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = banners.event_id
        AND events.visibility = 'public'
    )
    AND banners.deleted_at IS NULL
    AND banners.is_active = true
  );

-- Policy 2: Admin write access (tenant-scoped)
-- Allows tenant admins to perform all operations on banners for their tenant's events
CREATE POLICY "banners_admin_write"
  ON public.banners
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.admins WHERE id = auth.uid()
    )
  );

-- Policy 3: Admin read access (tenant-scoped)
-- Allows tenant admins to view all banners (including inactive/deleted) for their tenant
CREATE POLICY "banners_admin_read"
  ON public.banners
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.admins WHERE id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON POLICY "banners_public_read" ON public.banners IS
  'Allows public read access to active banners on public events';

COMMENT ON POLICY "banners_admin_write" ON public.banners IS
  'Allows tenant admins to manage (INSERT/UPDATE/DELETE) banners for their tenant''s events';

COMMENT ON POLICY "banners_admin_read" ON public.banners IS
  'Allows tenant admins to view all banners (including inactive/deleted) for their tenant';
