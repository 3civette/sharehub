-- =============================================================================
-- Feature 003: Event Flow Management - Complete Migration
-- Purpose: Single comprehensive migration with all schema, RLS, functions, and indexes
-- Date: 2025-10-07
-- =============================================================================
-- This file combines:
--   - 003-events-schema.sql
--   - 003-rls-policies.sql
--   - 003-functions.sql
--   - 003-indexes.sql
-- =============================================================================

-- =============================================================================
-- CLEANUP: Drop existing objects (in reverse dependency order)
-- =============================================================================

-- Drop tables first (CASCADE will drop triggers and constraints automatically)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS event_metrics CASCADE;
DROP TABLE IF EXISTS slides CASCADE;
DROP TABLE IF EXISTS speeches CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS access_tokens CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Drop functions (CASCADE will handle dependencies)
DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_activity_logs() CASCADE;
DROP FUNCTION IF EXISTS update_event_status() CASCADE;
DROP FUNCTION IF EXISTS generate_event_hierarchy_json(UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_token_access(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_event_metrics_summary(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS test_rls_isolation(UUID) CASCADE;

-- =============================================================================
-- PART 1: SCHEMA (003-events-schema.sql)
-- =============================================================================

-- TABLE: events
CREATE TABLE events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,

  -- Core attributes
  name TEXT NOT NULL CHECK (length(name) <= 200),
  date DATE NOT NULL CHECK (date >= '2020-01-01'),
  description TEXT,

  -- Visibility & Status
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'past', 'archived')),

  -- Token configuration (for private events)
  token_expiration_date TIMESTAMP WITH TIME ZONE,

  -- Data retention
  retention_policy TEXT NOT NULL DEFAULT 'keep_forever'
    CHECK (retention_policy IN ('keep_forever', 'archive_1year', 'delete_2years')),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES admins(id),

  -- Constraints
  CONSTRAINT unique_slug_per_tenant UNIQUE (tenant_id, slug),
  CONSTRAINT valid_token_expiration CHECK (
    (visibility = 'private' AND token_expiration_date IS NOT NULL)
    OR (visibility = 'public' AND token_expiration_date IS NULL)
  )
);

COMMENT ON TABLE events IS 'Core event entity with public/private visibility and lifecycle management';
COMMENT ON COLUMN events.slug IS 'URL-friendly identifier, unique per tenant';
COMMENT ON COLUMN events.visibility IS 'public = no auth required, private = token required';
COMMENT ON COLUMN events.status IS 'upcoming/past/archived based on date and retention policy';

-- TABLE: sessions
CREATE TABLE sessions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Attributes
  title TEXT NOT NULL CHECK (length(title) <= 100),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  start_time TIMESTAMP WITH TIME ZONE,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_display_order_per_event UNIQUE (event_id, display_order)
);

COMMENT ON TABLE sessions IS 'Time blocks or thematic groupings within events';
COMMENT ON COLUMN sessions.display_order IS 'Manual ordering within event, must be unique';

-- TABLE: speeches
CREATE TABLE speeches (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Attributes
  title TEXT NOT NULL CHECK (length(title) <= 150),
  speaker_name TEXT CHECK (speaker_name IS NULL OR length(speaker_name) <= 100),
  duration INTEGER CHECK (duration IS NULL OR (duration >= 1 AND duration <= 600)),
  description TEXT,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_display_order_per_session UNIQUE (session_id, display_order)
);

COMMENT ON TABLE speeches IS 'Individual presentations or talks within sessions';
COMMENT ON COLUMN speeches.duration IS 'Duration in minutes, range 1-600';

-- TABLE: slides
CREATE TABLE slides (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speech_id UUID NOT NULL REFERENCES speeches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- File attributes
  filename TEXT NOT NULL CHECK (length(filename) <= 255),
  storage_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 104857600), -- 100MB max
  mime_type TEXT NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.apple.keynote',
    'application/vnd.oasis.opendocument.presentation'
  )),

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),

  -- Audit
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_display_order_per_speech UNIQUE (speech_id, display_order)
);

COMMENT ON TABLE slides IS 'Uploaded presentation files associated with speeches';
COMMENT ON COLUMN slides.storage_path IS 'Path in Supabase Storage, must be unique globally';
COMMENT ON COLUMN slides.file_size IS 'Size in bytes, max 100MB (104857600)';
COMMENT ON COLUMN slides.uploaded_by IS 'Format: organizer:{token_id} or admin:{admin_id}';

-- TABLE: access_tokens
CREATE TABLE access_tokens (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Token attributes
  token TEXT UNIQUE NOT NULL CHECK (length(token) = 21),
  type TEXT NOT NULL CHECK (type IN ('organizer', 'participant')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Usage tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),

  -- Constraints
  CONSTRAINT expires_after_creation CHECK (expires_at > created_at)
);

COMMENT ON TABLE access_tokens IS 'Token-based authentication for private events';
COMMENT ON COLUMN access_tokens.token IS 'Unique 21-character nanoid token';
COMMENT ON COLUMN access_tokens.type IS 'organizer = full access, participant = read-only';

-- TABLE: event_metrics
CREATE TABLE event_metrics (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic metrics (free tier)
  page_views INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
  total_slide_downloads INTEGER NOT NULL DEFAULT 0 CHECK (total_slide_downloads >= 0),

  -- Premium metrics (stored as JSONB)
  unique_visitors JSONB NOT NULL DEFAULT '{}',
  per_slide_downloads JSONB NOT NULL DEFAULT '{}',
  per_speech_downloads JSONB NOT NULL DEFAULT '{}',
  geographic_data JSONB NOT NULL DEFAULT '{}',
  device_types JSONB NOT NULL DEFAULT '{}',
  access_timeline JSONB NOT NULL DEFAULT '[]',

  -- Audit
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE event_metrics IS 'Analytics data with tiered access (free vs premium)';
COMMENT ON COLUMN event_metrics.page_views IS 'Basic metric: total page view count';
COMMENT ON COLUMN event_metrics.unique_visitors IS 'Premium: {ip_hash: last_seen_iso}';
COMMENT ON COLUMN event_metrics.per_slide_downloads IS 'Premium: {slide_id: count}';

-- TABLE: activity_logs
CREATE TABLE activity_logs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Event details
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('organizer', 'participant', 'anonymous', 'admin')),
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'download', 'view', 'edit', 'delete')),

  -- File context (nullable - deleted items set to NULL)
  filename TEXT,
  file_size INTEGER,
  slide_id UUID REFERENCES slides(id) ON DELETE SET NULL,
  speech_id UUID REFERENCES speeches(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Retention configuration
  retention_days INTEGER NOT NULL DEFAULT 90 CHECK (retention_days = -1 OR retention_days > 0),

  -- Additional metadata
  metadata JSONB
);

COMMENT ON TABLE activity_logs IS 'Audit trail of file operations with configurable retention';
COMMENT ON COLUMN activity_logs.retention_days IS '-1 for indefinite, or 30/90/365 for time-based cleanup';
COMMENT ON COLUMN activity_logs.metadata IS 'Optional: {ip_hash, user_agent, etc.}';

-- =============================================================================
-- PART 2: RLS POLICIES (003-rls-policies.sql)
-- =============================================================================

-- EVENTS TABLE RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_tenant_isolation"
ON events
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "events_tenant_isolation" ON events IS
  'Tenants can only access events that belong to them. Uses direct tenant_id check to avoid recursion.';

-- SESSIONS TABLE RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_tenant_isolation"
ON sessions
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "sessions_tenant_isolation" ON sessions IS
  'Direct tenant_id check avoids recursive joins through events table.';

-- SPEECHES TABLE RLS
ALTER TABLE speeches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "speeches_tenant_isolation"
ON speeches
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "speeches_tenant_isolation" ON speeches IS
  'Direct tenant_id check avoids recursive joins through sessions/events tables.';

-- SLIDES TABLE RLS
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slides_tenant_isolation"
ON slides
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "slides_tenant_isolation" ON slides IS
  'Direct tenant_id check avoids recursive joins through speeches/sessions/events tables.';

-- ACCESS_TOKENS TABLE RLS
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_tokens_public_read"
ON access_tokens
FOR SELECT
USING (true);

CREATE POLICY "access_tokens_owner_insert"
ON access_tokens
FOR INSERT
WITH CHECK (
  event_id IN (
    SELECT id FROM events
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
  )
);

CREATE POLICY "access_tokens_owner_update"
ON access_tokens
FOR UPDATE
USING (
  event_id IN (
    SELECT id FROM events
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
  )
);

CREATE POLICY "access_tokens_owner_delete"
ON access_tokens
FOR DELETE
USING (
  event_id IN (
    SELECT id FROM events
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
  )
);

COMMENT ON POLICY "access_tokens_public_read" ON access_tokens IS
  'Anyone can read tokens for validation. Expiration is checked in application layer.';
COMMENT ON POLICY "access_tokens_owner_insert" ON access_tokens IS
  'Only event owners (matched by tenant) can create tokens.';
COMMENT ON POLICY "access_tokens_owner_update" ON access_tokens IS
  'Only event owners (matched by tenant) can update tokens.';
COMMENT ON POLICY "access_tokens_owner_delete" ON access_tokens IS
  'Only event owners (matched by tenant) can delete tokens.';

-- EVENT_METRICS TABLE RLS
ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_metrics_tenant_read"
ON event_metrics
FOR SELECT
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "event_metrics_system_insert"
ON event_metrics
FOR INSERT
WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "event_metrics_system_update"
ON event_metrics
FOR UPDATE
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "event_metrics_tenant_read" ON event_metrics IS
  'Tenants can only view metrics for their own events.';
COMMENT ON POLICY "event_metrics_system_insert" ON event_metrics IS
  'Metrics inserts require tenant context to be set by application middleware.';
COMMENT ON POLICY "event_metrics_system_update" ON event_metrics IS
  'Metrics updates require tenant context to be set by application middleware.';

-- ACTIVITY_LOGS TABLE RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_tenant_read"
ON activity_logs
FOR SELECT
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "activity_logs_system_insert"
ON activity_logs
FOR INSERT
WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "activity_logs_tenant_read" ON activity_logs IS
  'Tenants can only view activity logs for their own events.';
COMMENT ON POLICY "activity_logs_system_insert" ON activity_logs IS
  'Logs can only be inserted with proper tenant context set.';

-- RLS TESTING HELPER FUNCTION
CREATE OR REPLACE FUNCTION test_rls_isolation(test_tenant_id UUID)
RETURNS TABLE (
  table_name TEXT,
  can_read BOOLEAN,
  can_write BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  -- Set tenant context
  PERFORM set_config('app.current_tenant_id', test_tenant_id::TEXT, true);

  -- Test events table
  BEGIN
    PERFORM COUNT(*) FROM events;
    RETURN QUERY SELECT 'events'::TEXT, true, NULL::BOOLEAN, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'events'::TEXT, false, NULL::BOOLEAN, SQLERRM;
  END;

  -- Test sessions table
  BEGIN
    PERFORM COUNT(*) FROM sessions;
    RETURN QUERY SELECT 'sessions'::TEXT, true, NULL::BOOLEAN, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'sessions'::TEXT, false, NULL::BOOLEAN, SQLERRM;
  END;

  -- Test speeches table
  BEGIN
    PERFORM COUNT(*) FROM speeches;
    RETURN QUERY SELECT 'speeches'::TEXT, true, NULL::BOOLEAN, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'speeches'::TEXT, false, NULL::BOOLEAN, SQLERRM;
  END;

  -- Test slides table
  BEGIN
    PERFORM COUNT(*) FROM slides;
    RETURN QUERY SELECT 'slides'::TEXT, true, NULL::BOOLEAN, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'slides'::TEXT, false, NULL::BOOLEAN, SQLERRM;
  END;

  -- Test activity_logs table
  BEGIN
    PERFORM COUNT(*) FROM activity_logs;
    RETURN QUERY SELECT 'activity_logs'::TEXT, true, NULL::BOOLEAN, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'activity_logs'::TEXT, false, NULL::BOOLEAN, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_rls_isolation(UUID) IS
  'Helper function to verify RLS policies work correctly for a given tenant.';

-- =============================================================================
-- PART 3: FUNCTIONS (003-functions.sql)
-- =============================================================================

-- FUNCTION: cleanup_expired_activity_logs
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

-- FUNCTION: update_event_status
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

-- FUNCTION: generate_event_hierarchy_json
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

-- FUNCTION: validate_token_access
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

-- FUNCTION: get_event_metrics_summary
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

-- TRIGGER: auto_update_timestamp
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
-- PART 4: INDEXES (003-indexes.sql)
-- =============================================================================

-- EVENTS TABLE INDEXES
CREATE INDEX idx_events_slug ON events(tenant_id, slug);
COMMENT ON INDEX idx_events_slug IS 'Fast lookup for event URLs: /events/:slug';

CREATE INDEX idx_events_status_date ON events(tenant_id, status, date DESC);
COMMENT ON INDEX idx_events_status_date IS 'Efficient filtering for upcoming/past/archived events';

CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_created_by ON events(created_by);

-- SESSIONS TABLE INDEXES
CREATE INDEX idx_sessions_event_order ON sessions(event_id, display_order);
COMMENT ON INDEX idx_sessions_event_order IS 'Retrieve ordered sessions for event detail page';

CREATE INDEX idx_sessions_event_id ON sessions(event_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);

-- SPEECHES TABLE INDEXES
CREATE INDEX idx_speeches_session_order ON speeches(session_id, display_order);
COMMENT ON INDEX idx_speeches_session_order IS 'Retrieve ordered speeches for session detail';

CREATE INDEX idx_speeches_session_id ON speeches(session_id);
CREATE INDEX idx_speeches_tenant_id ON speeches(tenant_id);

-- SLIDES TABLE INDEXES
CREATE INDEX idx_slides_speech_order ON slides(speech_id, display_order);
COMMENT ON INDEX idx_slides_speech_order IS 'Retrieve ordered slides for speech detail';

CREATE INDEX idx_slides_storage_path ON slides(storage_path);
COMMENT ON INDEX idx_slides_storage_path IS 'Quick lookup when processing download requests';

CREATE INDEX idx_slides_speech_id ON slides(speech_id);
CREATE INDEX idx_slides_tenant_id ON slides(tenant_id);

-- ACCESS_TOKENS TABLE INDEXES
CREATE INDEX idx_access_tokens_token ON access_tokens(token);
COMMENT ON INDEX idx_access_tokens_token IS 'Critical for middleware token validation performance';

CREATE INDEX idx_access_tokens_event_id ON access_tokens(event_id);

CREATE INDEX idx_access_tokens_expires_at ON access_tokens(expires_at);
COMMENT ON INDEX idx_access_tokens_expires_at IS 'Index for token expiration queries and cleanup';

-- EVENT_METRICS TABLE INDEXES
CREATE INDEX idx_event_metrics_tenant_id ON event_metrics(tenant_id);
CREATE INDEX idx_event_metrics_event_id ON event_metrics(event_id);

-- ACTIVITY_LOGS TABLE INDEXES
CREATE INDEX idx_activity_logs_event_timestamp ON activity_logs(event_id, timestamp DESC);
COMMENT ON INDEX idx_activity_logs_event_timestamp IS 'Fast retrieval of recent activity for event dashboard';

CREATE INDEX idx_activity_logs_slide_id ON activity_logs(slide_id) WHERE slide_id IS NOT NULL;
CREATE INDEX idx_activity_logs_speech_id ON activity_logs(speech_id) WHERE speech_id IS NOT NULL;
CREATE INDEX idx_activity_logs_session_id ON activity_logs(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX idx_activity_logs_retention_cleanup ON activity_logs(tenant_id, retention_days, timestamp)
WHERE retention_days > 0;
COMMENT ON INDEX idx_activity_logs_retention_cleanup IS 'Optimize cleanup function for expired logs';

CREATE INDEX idx_activity_logs_event_id ON activity_logs(event_id);
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Feature 003: Event Flow Management';
  RAISE NOTICE 'Complete Migration Successful!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created 7 tables:';
  RAISE NOTICE '  - events, sessions, speeches, slides';
  RAISE NOTICE '  - access_tokens, event_metrics, activity_logs';
  RAISE NOTICE '';
  RAISE NOTICE 'Enabled RLS on all tables with tenant isolation';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 6 functions:';
  RAISE NOTICE '  - cleanup_expired_activity_logs()';
  RAISE NOTICE '  - update_event_status()';
  RAISE NOTICE '  - generate_event_hierarchy_json(uuid)';
  RAISE NOTICE '  - validate_token_access(text, uuid)';
  RAISE NOTICE '  - get_event_metrics_summary(uuid, boolean)';
  RAISE NOTICE '  - test_rls_isolation(uuid)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 25 performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Setup cron jobs (recommended):';
  RAISE NOTICE '  - Daily: SELECT * FROM update_event_status();';
  RAISE NOTICE '  - Weekly: SELECT * FROM cleanup_expired_activity_logs();';
  RAISE NOTICE '';
  RAISE NOTICE 'Test RLS: SELECT * FROM test_rls_isolation(''your-tenant-id'');';
  RAISE NOTICE '========================================';
END $$;
