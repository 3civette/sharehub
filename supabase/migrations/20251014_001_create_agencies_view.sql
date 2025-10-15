-- Migration: Create agencies VIEW (backward compatible tenant alias)
-- Feature: 012-dobbiamo-lavorare-al
-- Date: 2025-10-14

-- Create VIEW aliasing tenants table for backward compatibility
CREATE OR REPLACE VIEW agencies AS SELECT * FROM tenants;

-- Create helper function to get current agency ID from context or auth
CREATE OR REPLACE FUNCTION app.current_agency_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('app.agency_id', true)::UUID,
    auth.uid() -- Fallback to Supabase auth user ID
  );
$$ LANGUAGE SQL STABLE;

-- Comment
COMMENT ON VIEW agencies IS 'Backward-compatible alias for tenants table. Used for agency-centric B2B SaaS terminology.';
COMMENT ON FUNCTION app.current_agency_id() IS 'Returns current agency ID from app context or Supabase auth. Used in RLS policies.';
