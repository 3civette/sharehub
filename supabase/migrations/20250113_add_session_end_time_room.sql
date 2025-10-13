-- Migration: Add end_time and room columns to sessions table
-- Feature: Session management enhancement
-- Date: 2025-01-13

-- Add end_time column (nullable, since not all sessions may have defined end times)
ALTER TABLE public.sessions
ADD COLUMN end_time timestamptz NULL;

-- Add room column (nullable, max 100 characters)
ALTER TABLE public.sessions
ADD COLUMN room text NULL;

-- Add constraint for room length
ALTER TABLE public.sessions
ADD CONSTRAINT sessions_room_length CHECK (room IS NULL OR length(room) <= 100);

-- Add constraint to ensure end_time is after start_time when both are present
ALTER TABLE public.sessions
ADD CONSTRAINT sessions_end_after_start CHECK (
  end_time IS NULL OR
  start_time IS NULL OR
  end_time > start_time
);

-- Add comment for clarity
COMMENT ON COLUMN public.sessions.end_time IS 'Session end time (optional)';
COMMENT ON COLUMN public.sessions.room IS 'Location/room name for the session (optional, max 100 chars)';
