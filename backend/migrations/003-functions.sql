-- Migration: Feature 003 - Database Functions
-- Purpose: Utility functions for event management (cleanup, automation)
-- Date: 2025-10-07

-- =============================================================================
-- FUNCTION: cleanup_expired_activity_logs
-- Purpose: Delete activity logs that exceed their retention period
-- Returns: Count of deleted records
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_activity_logs()
RETURNS TABLE (
  tenant_id UUID,
  deleted_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM activity_logs
    WHERE
      -- Only process logs with time-based retention (not indefinite)
      retention_days > 0
      -- Delete logs older than their retention period
      AND timestamp < (NOW() - (retention_days || ' days')::INTERVAL)
    RETURNING tenant_id
  )
  SELECT
    d.tenant_id,
    COUNT(*)::BIGINT as deleted_count
  FROM deleted d
  GROUP BY d.tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_activity_logs() IS
  'Deletes activity logs that exceed their retention period. Run periodically via cron.';

-- =============================================================================
-- FUNCTION: update_event_status
-- Purpose: Automatically update event status based on date
-- Returns: Count of updated events
-- =============================================================================
CREATE OR REPLACE FUNCTION update_event_status()
RETURNS TABLE (
  status_change TEXT,
  event_count BIGINT
) AS $$
BEGIN
  -- Update upcoming events to past when date has passed
  RETURN QUERY
  WITH updated_to_past AS (
    UPDATE events
    SET status = 'past', updated_at = NOW()
    WHERE status = 'upcoming' AND date < CURRENT_DATE
    RETURNING 1
  )
  SELECT
    'upcoming_to_past'::TEXT,
    COUNT(*)::BIGINT
  FROM updated_to_past;

  -- Handle archive_1year retention policy
  RETURN QUERY
  WITH updated_to_archived_1y AS (
    UPDATE events
    SET status = 'archived', updated_at = NOW()
    WHERE
      status = 'past'
      AND retention_policy = 'archive_1year'
      AND date < (CURRENT_DATE - INTERVAL '1 year')
    RETURNING 1
  )
  SELECT
    'past_to_archived_1year'::TEXT,
    COUNT(*)::BIGINT
  FROM updated_to_archived_1y;

  -- Handle delete_2years retention policy
  RETURN QUERY
  WITH deleted_2y AS (
    DELETE FROM events
    WHERE
      retention_policy = 'delete_2years'
      AND date < (CURRENT_DATE - INTERVAL '2 years')
    RETURNING 1
  )
  SELECT
    'deleted_2years'::TEXT,
    COUNT(*)::BIGINT
  FROM deleted_2y;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_event_status() IS
  'Updates event status based on date and retention policy. Run daily via cron.';

-- =============================================================================
-- FUNCTION: generate_event_hierarchy_json
-- Purpose: Return complete event hierarchy as JSON (for efficient API responses)
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_event_hierarchy_json(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', e.id,
    'slug', e.slug,
    'name', e.name,
    'date', e.date,
    'description', e.description,
    'visibility', e.visibility,
    'status', e.status,
    'sessions', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'title', s.title,
          'description', s.description,
          'start_time', s.start_time,
          'display_order', s.display_order,
          'speeches', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', sp.id,
                'title', sp.title,
                'speaker_name', sp.speaker_name,
                'duration', sp.duration,
                'description', sp.description,
                'display_order', sp.display_order,
                'slides', (
                  SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                      'id', sl.id,
                      'filename', sl.filename,
                      'file_size', sl.file_size,
                      'mime_type', sl.mime_type,
                      'display_order', sl.display_order,
                      'uploaded_at', sl.uploaded_at
                    ) ORDER BY sl.display_order
                  ), '[]'::jsonb)
                  FROM slides sl
                  WHERE sl.speech_id = sp.id
                )
              ) ORDER BY sp.display_order
            ), '[]'::jsonb)
            FROM speeches sp
            WHERE sp.session_id = s.id
          )
        ) ORDER BY s.display_order
      ), '[]'::jsonb)
      FROM sessions s
      WHERE s.event_id = e.id
    )
  ) INTO result
  FROM events e
  WHERE e.id = p_event_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION generate_event_hierarchy_json(UUID) IS
  'Returns complete event hierarchy (sessions → speeches → slides) as optimized JSONB.';

-- =============================================================================
-- FUNCTION: validate_token_access
-- Purpose: Check if token is valid and return access level
-- =============================================================================
CREATE OR REPLACE FUNCTION validate_token_access(p_token TEXT, p_event_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  token_type TEXT,
  token_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (t.expires_at > NOW())::BOOLEAN as is_valid,
    t.type as token_type,
    t.id as token_id
  FROM access_tokens t
  WHERE
    t.token = p_token
    AND t.event_id = p_event_id
  LIMIT 1;

  -- Update usage stats if token found
  UPDATE access_tokens
  SET
    last_used_at = NOW(),
    use_count = use_count + 1
  WHERE token = p_token AND event_id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_token_access(TEXT, UUID) IS
  'Validates token and updates usage stats. Returns access level (organizer/participant).';

-- =============================================================================
-- FUNCTION: get_event_metrics_summary
-- Purpose: Return metrics summary based on tenant subscription tier
-- =============================================================================
CREATE OR REPLACE FUNCTION get_event_metrics_summary(
  p_event_id UUID,
  p_include_premium BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'event_id', em.event_id,
    'page_views', em.page_views,
    'total_slide_downloads', em.total_slide_downloads,
    'premium_data', CASE
      WHEN p_include_premium THEN jsonb_build_object(
        'unique_visitors', em.unique_visitors,
        'per_slide_downloads', em.per_slide_downloads,
        'per_speech_downloads', em.per_speech_downloads,
        'geographic_data', em.geographic_data,
        'device_types', em.device_types,
        'access_timeline', em.access_timeline
      )
      ELSE NULL
    END,
    'updated_at', em.updated_at
  ) INTO result
  FROM event_metrics em
  WHERE em.event_id = p_event_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_event_metrics_summary(UUID, BOOLEAN) IS
  'Returns metrics summary. Premium data only included if p_include_premium = true.';

-- =============================================================================
-- TRIGGER: auto_update_timestamp
-- Purpose: Automatically update updated_at column on row modifications
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER speeches_updated_at
  BEFORE UPDATE ON speeches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER event_metrics_updated_at
  BEFORE UPDATE ON event_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON FUNCTION trigger_set_updated_at() IS
  'Trigger function to automatically update updated_at timestamp on row modifications.';

-- =============================================================================
-- Success Message
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 003-functions.sql completed successfully';
  RAISE NOTICE 'Created 6 functions: cleanup, status updates, hierarchy JSON, token validation, metrics, triggers';
  RAISE NOTICE 'Setup cron jobs:';
  RAISE NOTICE '  - Daily: SELECT * FROM update_event_status();';
  RAISE NOTICE '  - Weekly: SELECT * FROM cleanup_expired_activity_logs();';
END $$;
