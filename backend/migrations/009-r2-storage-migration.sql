-- Migration: 009-r2-storage-migration
-- Feature: 008-voglio-implementare-la - Serverless Architecture with R2 Storage
-- Description: Add R2 storage support with 48-hour automatic retention
-- Date: 2025-10-11
-- Dependencies: Requires slides table from feature 003

-- =============================================================================
-- STEP 1: Add r2_key column for Cloudflare R2 storage path
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'slides' AND column_name = 'r2_key'
  ) THEN
    ALTER TABLE slides
    ADD COLUMN r2_key TEXT;

    COMMENT ON COLUMN slides.r2_key IS 'Cloudflare R2 object key (tenant-{id}/event-{id}/slide-{id}.ext). NULL for legacy Supabase Storage files.';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Add deleted_at column for soft delete tracking
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'slides' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE slides
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

    COMMENT ON COLUMN slides.deleted_at IS 'Soft delete timestamp. NULL = active file, NOT NULL = deleted after 48h retention period.';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Update file_size constraint to allow up to 1GB
-- =============================================================================
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'slides'
    AND constraint_name = 'slides_file_size_check'
    AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE slides DROP CONSTRAINT slides_file_size_check;
  END IF;

  -- Add new constraint allowing up to 1GB (1073741824 bytes)
  ALTER TABLE slides
  ADD CONSTRAINT slides_file_size_check
  CHECK (file_size > 0 AND file_size <= 1073741824);
END $$;

-- =============================================================================
-- STEP 4: Create performance indexes for cleanup queries
-- =============================================================================

-- Index for 48-hour cleanup query
-- Query: WHERE uploaded_at < NOW() - INTERVAL '48 hours' AND deleted_at IS NULL AND r2_key IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_slides_cleanup ON slides(uploaded_at)
WHERE deleted_at IS NULL AND r2_key IS NOT NULL;

COMMENT ON INDEX idx_slides_cleanup IS 'Optimizes cleanup job that deletes files older than 48 hours';

-- Composite index for tenant + session queries (already exists, but ensuring it's there)
CREATE INDEX IF NOT EXISTS idx_slides_tenant_speech ON slides(tenant_id, speech_id);

-- =============================================================================
-- STEP 5: Add constraint to ensure r2_key format (if present)
-- =============================================================================
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'slides'
    AND constraint_name = 'slides_r2_key_format'
  ) THEN
    ALTER TABLE slides DROP CONSTRAINT slides_r2_key_format;
  END IF;

  -- Add new constraint for R2 key format validation
  ALTER TABLE slides
  ADD CONSTRAINT slides_r2_key_format
  CHECK (
    r2_key IS NULL OR
    r2_key ~ '^tenant-[a-f0-9-]+/event-[a-f0-9-]+/slide-[a-f0-9-]+\.[a-z0-9]+$'
  );
END $$;

COMMENT ON CONSTRAINT slides_r2_key_format ON slides IS 'Ensures R2 keys follow pattern: tenant-{id}/event-{id}/slide-{id}.{ext}';

-- =============================================================================
-- STEP 6: Make storage_path nullable for R2-only files
-- =============================================================================
-- R2 files don't use storage_path (Supabase Storage), so make it nullable
DO $$
BEGIN
  -- Drop unique constraint on storage_path
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'slides'
    AND constraint_name = 'slides_storage_path_key'
  ) THEN
    ALTER TABLE slides DROP CONSTRAINT slides_storage_path_key;
  END IF;

  -- Make storage_path nullable
  ALTER TABLE slides ALTER COLUMN storage_path DROP NOT NULL;

  -- Add constraint: must have either storage_path OR r2_key (not both, not neither)
  ALTER TABLE slides
  ADD CONSTRAINT slides_storage_location_check
  CHECK (
    (storage_path IS NOT NULL AND r2_key IS NULL) OR
    (storage_path IS NULL AND r2_key IS NOT NULL)
  );
END $$;

COMMENT ON CONSTRAINT slides_storage_location_check ON slides IS 'Files must be in either Supabase Storage (storage_path) OR R2 (r2_key), not both';

-- =============================================================================
-- STEP 7: Update helper view to include new columns
-- =============================================================================
DROP VIEW IF EXISTS slides_with_metadata;

CREATE OR REPLACE VIEW slides_with_metadata AS
SELECT
  slides.*,
  speeches.title AS speech_title,
  speeches.speaker_name AS speaker_name,
  sessions.title AS session_title,
  events.name AS event_name,
  -- Add computed column for storage type
  CASE
    WHEN slides.r2_key IS NOT NULL THEN 'r2'
    WHEN slides.storage_path IS NOT NULL THEN 'supabase'
    ELSE 'unknown'
  END AS storage_type,
  -- Add computed column for file status
  CASE
    WHEN slides.deleted_at IS NOT NULL THEN 'deleted'
    WHEN slides.uploaded_at > NOW() - INTERVAL '48 hours' THEN 'active'
    ELSE 'expiring_soon'
  END AS file_status
FROM slides
LEFT JOIN speeches ON slides.speech_id = speeches.id
LEFT JOIN sessions ON speeches.session_id = sessions.id
LEFT JOIN events ON sessions.event_id = events.id;

COMMENT ON VIEW slides_with_metadata IS 'Enhanced view with storage type and file status for admin UI';

GRANT SELECT ON slides_with_metadata TO authenticated, anon;

-- =============================================================================
-- STEP 8: Create helper function for cleanup job
-- =============================================================================
CREATE OR REPLACE FUNCTION get_expired_slides(older_than_hours INTEGER DEFAULT 48)
RETURNS TABLE (
  id UUID,
  r2_key TEXT,
  filename TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.r2_key,
    s.filename,
    s.file_size,
    s.uploaded_at,
    s.tenant_id
  FROM slides s
  WHERE s.uploaded_at < NOW() - (older_than_hours || ' hours')::INTERVAL
    AND s.deleted_at IS NULL
    AND s.r2_key IS NOT NULL
  ORDER BY s.uploaded_at ASC
  LIMIT 1000; -- Process in batches
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_expired_slides IS 'Returns slides older than specified hours for cleanup job (default 48h)';

-- =============================================================================
-- STEP 9: Add indexes for public event queries (performance optimization)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_slides_not_deleted ON slides(id)
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_slides_not_deleted IS 'Optimizes queries filtering out deleted slides';

-- =============================================================================
-- Success Message & Migration Summary
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'Migration 009-r2-storage-migration.sql completed successfully';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ Added r2_key column (TEXT, nullable)';
  RAISE NOTICE '  ✓ Added deleted_at column (TIMESTAMP, nullable)';
  RAISE NOTICE '  ✓ Updated file_size limit: 100MB → 1GB';
  RAISE NOTICE '  ✓ Created idx_slides_cleanup index';
  RAISE NOTICE '  ✓ Created idx_slides_not_deleted index';
  RAISE NOTICE '  ✓ Made storage_path nullable';
  RAISE NOTICE '  ✓ Added storage_location_check constraint';
  RAISE NOTICE '  ✓ Updated slides_with_metadata view';
  RAISE NOTICE '  ✓ Created get_expired_slides() function';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Deploy R2 bucket and configure CORS';
  RAISE NOTICE '  2. Deploy Next.js API routes for presigned URLs';
  RAISE NOTICE '  3. Deploy Netlify scheduled function for cleanup';
  RAISE NOTICE '  4. Update frontend to use new upload flow';
  RAISE NOTICE '===================================================================';
END $$;
