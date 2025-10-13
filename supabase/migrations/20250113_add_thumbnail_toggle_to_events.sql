-- Migration: Add thumbnail_generation_enabled to events table
-- Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
-- Date: 2025-01-13

-- Add thumbnail generation toggle to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS thumbnail_generation_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN events.thumbnail_generation_enabled IS 'Enable automatic thumbnail generation for slides in this event';

-- Create index for retroactive generation queries
CREATE INDEX IF NOT EXISTS idx_events_thumbnail_enabled
ON events(thumbnail_generation_enabled)
WHERE thumbnail_generation_enabled = true;
