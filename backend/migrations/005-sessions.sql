-- Migration: 005-sessions
-- Feature: Event Details Management
-- Description: Create sessions table with smart chronological ordering
-- Date: 2025-10-08

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL CHECK (length(title) <= 100),
  description TEXT CHECK (length(description) <= 500),
  scheduled_time TIMESTAMPTZ,
  display_order INTEGER CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_event_id ON sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_time ON sessions(scheduled_time) WHERE scheduled_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_display_order ON sessions(event_id, display_order) WHERE display_order IS NOT NULL;

-- Create composite index for smart ordering
-- This supports the query: ORDER BY COALESCE(display_order, EXTRACT(EPOCH FROM scheduled_time)::INTEGER)
CREATE INDEX IF NOT EXISTS idx_sessions_smart_order ON sessions(
  event_id,
  COALESCE(display_order, EXTRACT(EPOCH FROM scheduled_time)::INTEGER)
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant admins can manage sessions for their events
CREATE POLICY "tenant_admins_manage_sessions" ON sessions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM admins WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM admins WHERE id = auth.uid()
    )
  );

-- RLS Policy: Organizer tokens can manage sessions for their events
CREATE POLICY "organizer_manage_sessions" ON sessions
  FOR ALL
  USING (
    event_id IN (
      SELECT event_id FROM access_tokens
      WHERE token = current_setting('app.current_token', true)
      AND type = 'organizer'
      AND expires_at > NOW()
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT event_id FROM access_tokens
      WHERE token = current_setting('app.current_token', true)
      AND type = 'organizer'
      AND expires_at > NOW()
    )
  );

-- RLS Policy: Public can view all sessions (for public events)
CREATE POLICY "public_view_sessions" ON sessions
  FOR SELECT
  USING (true);

-- RLS Policy: Participant tokens can view sessions for their events
CREATE POLICY "participant_view_sessions" ON sessions
  FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM access_tokens
      WHERE token = current_setting('app.current_token', true)
      AND (type = 'organizer' OR type = 'participant')
      AND expires_at > NOW()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- If scheduled_time changed, reset display_order to NULL (auto-reorder)
  IF OLD.scheduled_time IS DISTINCT FROM NEW.scheduled_time THEN
    NEW.display_order = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE sessions IS 'Time-based groupings of speeches within events with smart chronological ordering';
COMMENT ON COLUMN sessions.scheduled_time IS 'Scheduled start time for chronological ordering (optional)';
COMMENT ON COLUMN sessions.display_order IS 'Manual override for order (NULL = use scheduled_time for automatic ordering)';
COMMENT ON TRIGGER trigger_update_sessions_updated_at ON sessions IS 'Automatically resets display_order when scheduled_time changes';
