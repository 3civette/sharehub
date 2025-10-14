-- Migration: Create event_branding table
-- Feature: 012-dobbiamo-lavorare-al
-- Date: 2025-10-14

-- Create event_branding table
CREATE TABLE event_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url TEXT NULL, -- Supabase Storage path
  primary_color TEXT NOT NULL DEFAULT '#2563EB' CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color TEXT NOT NULL DEFAULT '#7C3AED' CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color TEXT NOT NULL DEFAULT '#F59E0B' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color TEXT NOT NULL DEFAULT '#F8FAFC' CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_family TEXT NOT NULL DEFAULT 'inter' CHECK (font_family IN ('inter', 'merriweather', 'poppins', 'roboto', 'playfair')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id) -- One branding per event (1:1)
);

-- Create indexes
CREATE UNIQUE INDEX idx_event_branding_event_id ON event_branding(event_id);
CREATE INDEX idx_event_branding_agency_id ON event_branding(agency_id);

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_event_branding_updated_at
BEFORE UPDATE ON event_branding
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE event_branding IS 'Stores custom visual identity (logo, colors, font) for each event';
COMMENT ON COLUMN event_branding.primary_color IS 'Main brand color. Default: #2563EB (3Civette Blue)';
COMMENT ON COLUMN event_branding.secondary_color IS 'Complementary color. Default: #7C3AED (3Civette Purple)';
COMMENT ON COLUMN event_branding.accent_color IS 'Highlight/CTA color. Default: #F59E0B (3Civette Amber)';
COMMENT ON COLUMN event_branding.background_color IS 'Page background color. Default: #F8FAFC (Light Gray)';
COMMENT ON COLUMN event_branding.font_family IS 'Font preset: inter (default), merriweather, poppins, roboto, playfair';
