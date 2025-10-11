-- Migration 008: Post-event ZIP generation with R2 archiving
-- Purpose: Track ZIP generation on R2, email delivery, and file cleanup

-- Add post-event tracking columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_end_date DATE,
ADD COLUMN IF NOT EXISTS zip_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS zip_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS zip_email_recipient TEXT,
ADD COLUMN IF NOT EXISTS files_deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS zip_r2_key TEXT,  -- R2 object key
ADD COLUMN IF NOT EXISTS zip_r2_url TEXT,  -- Public R2 URL
ADD COLUMN IF NOT EXISTS zip_size_bytes BIGINT;

-- Index for cronjob queries (find events needing cleanup)
CREATE INDEX IF NOT EXISTS idx_events_post_cleanup
ON events(event_end_date, zip_sent_at, files_deleted_at)
WHERE files_deleted_at IS NULL;

-- Removed: ZIP stays on R2 permanently (or until manual cleanup)

-- Add storage path to slides for cleanup
ALTER TABLE slides
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Comments for documentation
COMMENT ON COLUMN events.event_end_date IS 'Date when event concluded (for triggering post-event processing)';
COMMENT ON COLUMN events.zip_generated_at IS 'When ZIP archive was generated and uploaded to R2';
COMMENT ON COLUMN events.zip_sent_at IS 'When ZIP download link was sent via email to organizer';
COMMENT ON COLUMN events.zip_email_recipient IS 'Email address where ZIP link was sent';
COMMENT ON COLUMN events.files_deleted_at IS 'When original presentation files were deleted from hot storage';
COMMENT ON COLUMN events.zip_r2_key IS 'Cloudflare R2 object key for the ZIP archive';
COMMENT ON COLUMN events.zip_r2_url IS 'Public Cloudflare R2 URL for ZIP download';
COMMENT ON COLUMN events.zip_size_bytes IS 'Size of generated ZIP in bytes';
