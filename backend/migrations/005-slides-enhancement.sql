-- Migration: 005-slides-enhancement
-- Feature: Event Details Management
-- Description: Enhance slides table with speech_id reference and metadata
-- Date: 2025-10-08

-- Add speech_id column to slides table (if not already exists)
-- This links slides to speeches for better organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'slides' AND column_name = 'speech_id'
  ) THEN
    ALTER TABLE slides
    ADD COLUMN speech_id UUID REFERENCES speeches(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for speech_id lookups
CREATE INDEX IF NOT EXISTS idx_slides_speech_id ON slides(speech_id);

-- Add enhanced fields to events table for slide format configuration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'allowed_slide_formats'
  ) THEN
    ALTER TABLE events
    ADD COLUMN allowed_slide_formats JSONB NOT NULL DEFAULT '[
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ]'::jsonb;
  END IF;
END $$;

-- Add QR code and revocation fields to access_tokens table
DO $$
BEGIN
  -- Add qr_code_data_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_tokens' AND column_name = 'qr_code_data_url'
  ) THEN
    ALTER TABLE access_tokens
    ADD COLUMN qr_code_data_url TEXT;
  END IF;

  -- Add revoked_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_tokens' AND column_name = 'revoked_at'
  ) THEN
    ALTER TABLE access_tokens
    ADD COLUMN revoked_at TIMESTAMPTZ;
  END IF;

  -- Add revoked_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_tokens' AND column_name = 'revoked_by'
  ) THEN
    ALTER TABLE access_tokens
    ADD COLUMN revoked_by UUID REFERENCES admins(id);
  END IF;
END $$;

-- Create index for active tokens (not revoked and not expired)
CREATE INDEX IF NOT EXISTS idx_access_tokens_active ON access_tokens(event_id, expires_at)
  WHERE revoked_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN slides.speech_id IS 'Reference to parent speech (optional, for organizing slides by speech)';
COMMENT ON COLUMN events.allowed_slide_formats IS 'JSON array of allowed MIME types for slide uploads (configurable per event)';
COMMENT ON COLUMN access_tokens.qr_code_data_url IS 'Base64-encoded PNG data URL of QR code (generated on demand)';
COMMENT ON COLUMN access_tokens.revoked_at IS 'Timestamp when token was revoked (NULL = active)';
COMMENT ON COLUMN access_tokens.revoked_by IS 'Admin who revoked the token (NULL if not revoked)';

-- Create helper view for slides with enhanced metadata (speaker name, speech title)
CREATE OR REPLACE VIEW slides_with_metadata AS
SELECT
  slides.*,
  speeches.title AS speech_title,
  speeches.speaker_name AS speaker_name,
  sessions.title AS session_title,
  events.name AS event_name
FROM slides
LEFT JOIN speeches ON slides.speech_id = speeches.id
LEFT JOIN sessions ON speeches.session_id = sessions.id
LEFT JOIN events ON sessions.event_id = events.id;

COMMENT ON VIEW slides_with_metadata IS 'Enhanced view of slides with joined speaker and speech information for display';

-- Grant appropriate permissions (adjust as needed for your auth setup)
-- This assumes the API uses service role or auth.uid() for RLS
GRANT SELECT ON slides_with_metadata TO authenticated, anon;
