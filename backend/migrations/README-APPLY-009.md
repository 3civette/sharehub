# How to Apply Migration 009: R2 Storage

**Migration File**: `009-r2-storage-migration.sql`
**Feature**: Serverless Architecture with Cloudflare R2
**Date**: 2025-10-11

## Prerequisites
- Access to Supabase Dashboard
- Project: agmkgrpxgpzqscbkizdl.supabase.co

## Steps to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com/project/agmkgrpxgpzqscbkizdl/sql/new
2. Copy entire contents of `009-r2-storage-migration.sql`
3. Paste into SQL Editor
4. Click "Run" button
5. Verify success message in output

### Option 2: Supabase CLI (if configured)
```bash
# Initialize Supabase if not done
npx supabase init

# Link to remote project
npx supabase link --project-ref agmkgrpxgpzqscbkizdl

# Push migration
npx supabase db push
```

## Verification

After applying, run this query to verify:

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'slides'
  AND column_name IN ('r2_key', 'deleted_at')
ORDER BY column_name;

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'slides'
  AND indexname IN ('idx_slides_cleanup', 'idx_slides_not_deleted');

-- Check helper function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_expired_slides';

-- Check updated file_size constraint (should allow 1GB)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'slides'::regclass
  AND conname = 'slides_file_size_check';
```

Expected output:
```
column_name | data_type                   | is_nullable
------------+-----------------------------+-------------
deleted_at  | timestamp with time zone    | YES
r2_key      | text                        | YES

indexname               | indexdef
------------------------+--------------------------------------------------------
idx_slides_cleanup      | CREATE INDEX ... WHERE deleted_at IS NULL AND r2_key IS NOT NULL
idx_slides_not_deleted  | CREATE INDEX ... WHERE deleted_at IS NULL

routine_name         | routine_type
---------------------+--------------
get_expired_slides   | FUNCTION

conname                     | pg_get_constraintdef
----------------------------+----------------------------------------------
slides_file_size_check      | CHECK (file_size > 0 AND file_size <= 1073741824)
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove new columns
ALTER TABLE slides DROP COLUMN IF EXISTS r2_key;
ALTER TABLE slides DROP COLUMN IF EXISTS deleted_at;

-- Drop new indexes
DROP INDEX IF EXISTS idx_slides_cleanup;
DROP INDEX IF EXISTS idx_slides_not_deleted;

-- Drop helper function
DROP FUNCTION IF EXISTS get_expired_slides(INTEGER);

-- Restore old file_size constraint (100MB)
ALTER TABLE slides DROP CONSTRAINT IF EXISTS slides_file_size_check;
ALTER TABLE slides
ADD CONSTRAINT slides_file_size_check
CHECK (file_size > 0 AND file_size <= 104857600);

-- Restore storage_path constraint
ALTER TABLE slides DROP CONSTRAINT IF EXISTS slides_storage_location_check;
ALTER TABLE slides ALTER COLUMN storage_path SET NOT NULL;
ALTER TABLE slides ADD CONSTRAINT slides_storage_path_key UNIQUE (storage_path);
```

## Notes
- This migration is backward compatible
- Existing slides will continue to work (storage_path not affected)
- New slides will use r2_key instead of storage_path
- No data migration required
