-- Feature 004: Increment Slide Downloads Function
-- Date: 2025-10-07
-- Description: PostgreSQL function to atomically increment total_slide_downloads

-- ============================================================================
-- INCREMENT FUNCTION FOR SLIDE DOWNLOADS
-- ============================================================================

-- Function to increment total_slide_downloads for an event
-- Used when a slide is downloaded via public API
CREATE OR REPLACE FUNCTION increment_slide_downloads(event_id_param UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE event_metrics
  SET
    total_slide_downloads = total_slide_downloads + 1,
    updated_at = NOW()
  WHERE event_id = event_id_param;

  -- If no row exists, insert one
  IF NOT FOUND THEN
    INSERT INTO event_metrics (
      event_id,
      page_views,
      total_slide_downloads,
      unique_visitors,
      per_slide_downloads,
      per_speech_downloads,
      geographic_data,
      device_types,
      access_timeline
    ) VALUES (
      event_id_param,
      0,
      1,
      0,
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION increment_slide_downloads(UUID) IS
  'Atomically increments total_slide_downloads counter for an event. Creates metrics row if needed.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Allow public (anon/authenticated) to execute function
GRANT EXECUTE ON FUNCTION increment_slide_downloads(UUID) TO anon, authenticated;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Test the function (should work):
-- SELECT increment_slide_downloads('some-valid-event-uuid');
-- SELECT total_slide_downloads FROM event_metrics WHERE event_id = 'some-valid-event-uuid';
