-- Migration: RLS policies for thumbnail_failure_log table
-- Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
-- Date: 2025-01-13

-- Enable RLS on thumbnail_failure_log table
ALTER TABLE thumbnail_failure_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view failures for their tenant
CREATE POLICY IF NOT EXISTS "admins_view_own_failures"
ON thumbnail_failure_log FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));

-- Policy: System can insert failures (via API routes with service role key)
CREATE POLICY IF NOT EXISTS "system_insert_failures"
ON thumbnail_failure_log FOR INSERT
WITH CHECK (auth.role() = 'service_role');
