-- Fix display_order race condition
-- Feature: Slide upload race condition fix
-- Date: 2025-10-13

-- Create atomic function to get next display_order for a speech
CREATE OR REPLACE FUNCTION get_next_display_order(p_speech_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_order INTEGER;
BEGIN
  -- Lock the speech row to prevent concurrent access
  PERFORM 1 FROM speeches WHERE id = p_speech_id FOR UPDATE;

  -- Get the maximum display_order for this speech
  SELECT COALESCE(MAX(display_order), 0) + 1
  INTO v_next_order
  FROM slides
  WHERE speech_id = p_speech_id
    AND deleted_at IS NULL;

  RETURN v_next_order;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_display_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_display_order(UUID) TO anon;
