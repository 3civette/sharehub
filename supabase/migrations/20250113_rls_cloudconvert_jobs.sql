-- Migration: RLS policies for cloudconvert_jobs table
-- Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
-- Date: 2025-01-13

-- Enable RLS on cloudconvert_jobs table
ALTER TABLE cloudconvert_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view jobs for their tenant
CREATE POLICY IF NOT EXISTS "admins_view_own_jobs"
ON cloudconvert_jobs FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM admins WHERE id = auth.uid()));

-- Policy: System can manage jobs (via API routes with service role key)
CREATE POLICY IF NOT EXISTS "system_manage_jobs"
ON cloudconvert_jobs FOR ALL
USING (auth.role() = 'service_role');
