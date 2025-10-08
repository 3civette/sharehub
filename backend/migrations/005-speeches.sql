-- Migration: 005-speeches
-- Feature: Event Details Management
-- Description: Create speeches table with smart ordering and cascade safeguards
-- Date: 2025-10-08

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create speeches table
CREATE TABLE IF NOT EXISTS speeches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT, -- RESTRICT prevents delete if speeches exist
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL CHECK (length(title) <= 255),
  speaker_name VARCHAR(255) NOT NULL CHECK (length(speaker_name) <= 255),
  duration_minutes INTEGER CHECK (duration_minutes > 0 AND duration_minutes <= 480), -- Max 8 hours
  description TEXT CHECK (length(description) <= 1000),
  scheduled_time TIMESTAMPTZ,
  display_order INTEGER CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_speeches_session_id ON speeches(session_id);
CREATE INDEX IF NOT EXISTS idx_speeches_tenant_id ON speeches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_speeches_scheduled_time ON speeches(scheduled_time) WHERE scheduled_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_speeches_display_order ON speeches(session_id, display_order) WHERE display_order IS NOT NULL;

-- Create composite index for smart ordering (same pattern as sessions)
CREATE INDEX IF NOT EXISTS idx_speeches_smart_order ON speeches(
  session_id,
  COALESCE(display_order, EXTRACT(EPOCH FROM scheduled_time)::INTEGER)
);

-- Enable Row Level Security
ALTER TABLE speeches ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant admins can manage speeches for their sessions
CREATE POLICY "tenant_admins_manage_speeches" ON speeches
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

-- RLS Policy: Organizer tokens can manage speeches for their sessions
CREATE POLICY "organizer_manage_speeches" ON speeches
  FOR ALL
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN access_tokens at ON s.event_id = at.event_id
      WHERE at.token = current_setting('app.current_token', true)
      AND at.type = 'organizer'
      AND at.expires_at > NOW()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN access_tokens at ON s.event_id = at.event_id
      WHERE at.token = current_setting('app.current_token', true)
      AND at.type = 'organizer'
      AND at.expires_at > NOW()
    )
  );

-- RLS Policy: Public can view all speeches (for public events)
CREATE POLICY "public_view_speeches" ON speeches
  FOR SELECT
  USING (true);

-- RLS Policy: Participant tokens can view speeches for their events
CREATE POLICY "participant_view_speeches" ON speeches
  FOR SELECT
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN access_tokens at ON s.event_id = at.event_id
      WHERE at.token = current_setting('app.current_token', true)
      AND (at.type = 'organizer' OR at.type = 'participant')
      AND at.expires_at > NOW()
    )
  );

-- Create trigger to update updated_at timestamp and handle auto-reorder
CREATE OR REPLACE FUNCTION update_speeches_updated_at()
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

CREATE TRIGGER trigger_update_speeches_updated_at
  BEFORE UPDATE ON speeches
  FOR EACH ROW
  EXECUTE FUNCTION update_speeches_updated_at();

-- Add comments for documentation
COMMENT ON TABLE speeches IS 'Individual presentations within sessions with speaker details and smart ordering';
COMMENT ON COLUMN speeches.session_id IS 'Parent session (ON DELETE RESTRICT prevents session deletion if speeches exist)';
COMMENT ON COLUMN speeches.speaker_name IS 'Name of the speaker presenting this speech';
COMMENT ON COLUMN speeches.duration_minutes IS 'Expected duration in minutes (optional)';
COMMENT ON COLUMN speeches.scheduled_time IS 'Scheduled start time for chronological ordering (optional)';
COMMENT ON COLUMN speeches.display_order IS 'Manual override for order (NULL = use scheduled_time for automatic ordering)';
COMMENT ON TRIGGER trigger_update_speeches_updated_at ON speeches IS 'Automatically resets display_order when scheduled_time changes';
