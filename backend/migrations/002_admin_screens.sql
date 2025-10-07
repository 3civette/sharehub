-- ============================================================================
-- Migration 002: Admin Panel Secondary Screens
-- Date: 2025-10-07
-- Description: Extend events and tenants tables for branding, settings
-- ============================================================================

-- Extend events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS branding_overrides JSONB DEFAULT NULL;

COMMENT ON COLUMN events.branding_overrides IS
'Optional event-specific branding overrides. Schema: {primary_color?, secondary_color?, logo_url?}';

-- Extend tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{"primary_color":"#3B82F6","secondary_color":"#10B981","logo_url":null}'::jsonb,
ADD COLUMN IF NOT EXISTS hotel_name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Hotel',
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

COMMENT ON COLUMN tenants.branding IS
'Tenant branding configuration. Schema: {primary_color: hex, secondary_color: hex, logo_url: string|null}';
COMMENT ON COLUMN tenants.hotel_name IS 'Hotel/venue name (2-100 chars)';
COMMENT ON COLUMN tenants.contact_email IS 'Contact email (valid format)';
COMMENT ON COLUMN tenants.contact_phone IS 'Contact phone (international format supported)';

-- Add indexes for sorting
CREATE INDEX IF NOT EXISTS idx_events_date_sort ON events(tenant_id, event_date ASC);
CREATE INDEX IF NOT EXISTS idx_events_created_sort ON events(tenant_id, created_at DESC);

-- RLS Policy: Admin can edit future events
DROP POLICY IF EXISTS "admin_can_edit_future_events" ON events;
CREATE POLICY "admin_can_edit_future_events"
ON events FOR UPDATE
USING (
  tenant_id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
  AND event_date >= CURRENT_DATE
)
WITH CHECK (
  tenant_id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
  AND event_date >= CURRENT_DATE
);

-- RLS Policy: Admin can update tenant branding/settings
DROP POLICY IF EXISTS "admin_can_update_tenant_branding" ON tenants;
CREATE POLICY "admin_can_update_tenant_branding"
ON tenants FOR UPDATE
USING (
  id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT a.tenant_id FROM admins a WHERE a.id = auth.uid()
  )
);

-- Verify RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
