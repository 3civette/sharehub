-- Fix unique constraint to account for soft deletes
-- The old constraint applies to ALL rows including deleted ones
-- We need a partial unique index that only applies to non-deleted rows

-- Step 1: Drop the old constraint
ALTER TABLE slides DROP CONSTRAINT IF EXISTS unique_display_order_per_speech;

-- Step 2: Create a partial unique index that excludes deleted rows
CREATE UNIQUE INDEX unique_display_order_per_speech_active
ON slides (speech_id, display_order)
WHERE deleted_at IS NULL;

-- This allows deleted rows to have duplicate display_order values
-- but enforces uniqueness only for active (non-deleted) slides
