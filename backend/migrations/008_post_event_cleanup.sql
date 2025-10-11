-- Migration 008: Post-event ZIP generation and cleanup tracking
-- Purpose: Track ZIP generation, email delivery, and file cleanup for events

-- Add post-event tracking columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_end_date DATE,
ADD COLUMN IF NOT EXISTS zip_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS zip_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS zip_email_recipient TEXT,
ADD COLUMN IF NOT EXISTS files_deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS zip_deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS zip_storage_path TEXT,
ADD COLUMN IF NOT EXISTS zip_size_bytes BIGINT;

-- Index for cronjob queries (find events needing cleanup)
CREATE INDEX IF NOT EXISTS idx_events_post_cleanup
ON events(event_end_date, zip_sent_at, files_deleted_at)
WHERE files_deleted_at IS NULL;

-- Index for old ZIP cleanup
CREATE INDEX IF NOT EXISTS idx_events_zip_cleanup
ON events(zip_sent_at, zip_deleted_at)
WHERE zip_deleted_at IS NULL;

-- Add storage path to slides for cleanup
ALTER TABLE slides
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Comments for documentation
COMMENT ON COLUMN events.event_end_date IS 'Date when event concluded (for triggering post-event processing)';
COMMENT ON COLUMN events.zip_generated_at IS 'When ZIP archive was generated';
COMMENT ON COLUMN events.zip_sent_at IS 'When ZIP was sent via email to organizer';
COMMENT ON COLUMN events.zip_email_recipient IS 'Email address where ZIP was sent';
COMMENT ON COLUMN events.files_deleted_at IS 'When original presentation files were deleted';
COMMENT ON COLUMN events.zip_deleted_at IS 'When ZIP archive was deleted (7 days after sending)';
COMMENT ON COLUMN events.zip_storage_path IS 'Path to ZIP file in Fly.io volume';
COMMENT ON COLUMN events.zip_size_bytes IS 'Size of generated ZIP in bytes';
