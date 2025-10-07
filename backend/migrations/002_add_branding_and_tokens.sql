-- Migration: Add branding and token columns
-- Created: 2025-10-06
-- Feature: 001-voglio-creare-l (Hotel Admin Dashboard)

-- Add branding_config to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#10B981"
  },
  "logo_url": null,
  "advertisements": []
}'::jsonb;

-- Add token and branding columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS organizer_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS participant_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS branding_overrides JSONB DEFAULT '{}'::jsonb;

-- Create indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_events_organizer_token ON events(organizer_token) WHERE organizer_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_participant_token ON events(participant_token) WHERE participant_token IS NOT NULL;

-- Add check constraint for branding_config structure
ALTER TABLE tenants
ADD CONSTRAINT branding_config_structure CHECK (
  jsonb_typeof(branding_config) = 'object' AND
  branding_config ? 'colors' AND
  jsonb_typeof(branding_config->'colors') = 'object'
);

-- Add check constraint for branding_overrides structure
ALTER TABLE events
ADD CONSTRAINT branding_overrides_structure CHECK (
  jsonb_typeof(branding_overrides) = 'object'
);
