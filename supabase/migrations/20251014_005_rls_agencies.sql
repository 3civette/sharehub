-- Migration: Create RLS policies for agencies (tenants)
-- Feature: 012-dobbiamo-lavorare-al
-- Date: 2025-10-14

-- Enable RLS on tenants table (agencies VIEW references it)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Agencies can only access their own record
CREATE POLICY "agencies_select_own" ON tenants FOR SELECT
  USING (id = app.current_agency_id());

-- Agencies can only update their own record
CREATE POLICY "agencies_update_own" ON tenants FOR UPDATE
  USING (id = app.current_agency_id());

-- Public signup (INSERT) - anyone can create an agency account
CREATE POLICY "agencies_public_signup" ON tenants FOR INSERT
  WITH CHECK (true); -- Validation handled at API level

-- Comments
COMMENT ON POLICY "agencies_select_own" ON tenants IS 'Agencies can only view their own profile data';
COMMENT ON POLICY "agencies_update_own" ON tenants IS 'Agencies can only update their own profile data';
COMMENT ON POLICY "agencies_public_signup" ON tenants IS 'Allow public agency registration (self-signup)';
