-- Migration: Add title and organizer fields to events table
-- Purpose: Add title (distinct from name/slug) and organizer fields to events
-- Date: 2025-10-09

-- Add new columns to events table
ALTER TABLE events
ADD COLUMN title TEXT CHECK (length(title) <= 300),
ADD COLUMN organizer TEXT CHECK (length(organizer) <= 200);

-- Update existing events to use name as title if title is null
UPDATE events SET title = name WHERE title IS NULL;

-- Make title NOT NULL after populating
ALTER TABLE events ALTER COLUMN title SET NOT NULL;

-- Add comments
COMMENT ON COLUMN events.title IS 'Display title for the event (distinct from slug)';
COMMENT ON COLUMN events.organizer IS 'Name of the event organizer';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 008-add-title-organizer-to-events.sql completed successfully';
  RAISE NOTICE 'Added title and organizer columns to events table';
END $$;
