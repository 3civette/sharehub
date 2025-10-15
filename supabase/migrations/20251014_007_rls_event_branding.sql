-- Migration: Create RLS policies for event_branding
-- Feature: 012-dobbiamo-lavorare-al
-- Date: 2025-10-14

-- Enable RLS on event_branding table
ALTER TABLE event_branding ENABLE ROW LEVEL SECURITY;

-- Agencies can access branding for their own events
CREATE POLICY "event_branding_select_own" ON event_branding FOR SELECT
  USING (agency_id = app.current_agency_id());

-- Agencies can create branding for their own events
CREATE POLICY "event_branding_insert_own" ON event_branding FOR INSERT
  WITH CHECK (agency_id = app.current_agency_id());

-- Agencies can update branding for their own events
CREATE POLICY "event_branding_update_own" ON event_branding FOR UPDATE
  USING (agency_id = app.current_agency_id());

-- Agencies can delete branding for their own events
CREATE POLICY "event_branding_delete_own" ON event_branding FOR DELETE
  USING (agency_id = app.current_agency_id());

-- Comments
COMMENT ON POLICY "event_branding_select_own" ON event_branding IS 'Agencies can only view branding for their own events';
COMMENT ON POLICY "event_branding_insert_own" ON event_branding IS 'Agencies can only create branding for their own events';
COMMENT ON POLICY "event_branding_update_own" ON event_branding IS 'Agencies can only update branding for their own events';
COMMENT ON POLICY "event_branding_delete_own" ON event_branding IS 'Agencies can only delete branding for their own events';
