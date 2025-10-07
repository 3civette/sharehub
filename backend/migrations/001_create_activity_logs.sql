-- Migration: Create activity_logs table with RLS policies
-- Created: 2025-10-06
-- Feature: 001-voglio-creare-l (Hotel Admin Dashboard)

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'organizer', 'participant', 'system')),
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_event_id ON activity_logs(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view their tenant's activity logs
CREATE POLICY activity_logs_select_policy ON activity_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM admins WHERE id = auth.uid()
    )
  );

-- RLS Policy: System can insert activity logs (for backend service)
CREATE POLICY activity_logs_insert_policy ON activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Create function to auto-delete old activity logs (7-day retention)
CREATE OR REPLACE FUNCTION delete_old_activity_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- Note: This requires manual setup in Supabase dashboard
-- SELECT cron.schedule('delete-old-activity-logs', '0 2 * * *', 'SELECT delete_old_activity_logs()');
