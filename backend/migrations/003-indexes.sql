-- Migration: Feature 003 - Performance Indexes
-- Purpose: Optimize query performance for event management tables
-- Date: 2025-10-07

-- =============================================================================
-- EVENTS TABLE INDEXES
-- =============================================================================

-- Fast lookup by slug (used in public event pages)
CREATE INDEX idx_events_slug ON events(tenant_id, slug);
COMMENT ON INDEX idx_events_slug IS 'Fast lookup for event URLs: /events/:slug';

-- Filter by status and date (for dashboard views)
CREATE INDEX idx_events_status_date ON events(tenant_id, status, date DESC);
COMMENT ON INDEX idx_events_status_date IS 'Efficient filtering for upcoming/past/archived events';

-- Foreign key index for tenant relationship
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_created_by ON events(created_by);

-- =============================================================================
-- SESSIONS TABLE INDEXES
-- =============================================================================

-- Fast retrieval of sessions for an event (ordered)
CREATE INDEX idx_sessions_event_order ON sessions(event_id, display_order);
COMMENT ON INDEX idx_sessions_event_order IS 'Retrieve ordered sessions for event detail page';

-- Foreign key indexes
CREATE INDEX idx_sessions_event_id ON sessions(event_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);

-- =============================================================================
-- SPEECHES TABLE INDEXES
-- =============================================================================

-- Fast retrieval of speeches for a session (ordered)
CREATE INDEX idx_speeches_session_order ON speeches(session_id, display_order);
COMMENT ON INDEX idx_speeches_session_order IS 'Retrieve ordered speeches for session detail';

-- Foreign key indexes
CREATE INDEX idx_speeches_session_id ON speeches(session_id);
CREATE INDEX idx_speeches_tenant_id ON speeches(tenant_id);

-- =============================================================================
-- SLIDES TABLE INDEXES
-- =============================================================================

-- Fast retrieval of slides for a speech (ordered)
CREATE INDEX idx_slides_speech_order ON slides(speech_id, display_order);
COMMENT ON INDEX idx_slides_speech_order IS 'Retrieve ordered slides for speech detail';

-- Fast lookup by storage path (for download operations)
CREATE INDEX idx_slides_storage_path ON slides(storage_path);
COMMENT ON INDEX idx_slides_storage_path IS 'Quick lookup when processing download requests';

-- Foreign key indexes
CREATE INDEX idx_slides_speech_id ON slides(speech_id);
CREATE INDEX idx_slides_tenant_id ON slides(tenant_id);

-- =============================================================================
-- ACCESS_TOKENS TABLE INDEXES
-- =============================================================================

-- Fast token validation (most critical for performance)
CREATE INDEX idx_access_tokens_token ON access_tokens(token);
COMMENT ON INDEX idx_access_tokens_token IS 'Critical for middleware token validation performance';

-- Find tokens by event (for management dashboard)
CREATE INDEX idx_access_tokens_event_id ON access_tokens(event_id);

-- Find expired tokens for cleanup
CREATE INDEX idx_access_tokens_expires_at ON access_tokens(expires_at)
WHERE expires_at < NOW();
COMMENT ON INDEX idx_access_tokens_expires_at IS 'Partial index for expired token cleanup';

-- =============================================================================
-- EVENT_METRICS TABLE INDEXES
-- =============================================================================

-- Unique lookup by event_id (already covered by UNIQUE constraint on event_id column)
-- Foreign key index
CREATE INDEX idx_event_metrics_tenant_id ON event_metrics(tenant_id);
CREATE INDEX idx_event_metrics_event_id ON event_metrics(event_id);

-- =============================================================================
-- ACTIVITY_LOGS TABLE INDEXES
-- =============================================================================

-- Reverse chronological log retrieval (most common query pattern)
CREATE INDEX idx_activity_logs_event_timestamp ON activity_logs(event_id, timestamp DESC);
COMMENT ON INDEX idx_activity_logs_event_timestamp IS 'Fast retrieval of recent activity for event dashboard';

-- Find logs for specific resources (when viewing speech/slide details)
CREATE INDEX idx_activity_logs_slide_id ON activity_logs(slide_id) WHERE slide_id IS NOT NULL;
CREATE INDEX idx_activity_logs_speech_id ON activity_logs(speech_id) WHERE speech_id IS NOT NULL;
CREATE INDEX idx_activity_logs_session_id ON activity_logs(session_id) WHERE session_id IS NOT NULL;

-- Cleanup query optimization (find logs older than retention period)
CREATE INDEX idx_activity_logs_retention_cleanup ON activity_logs(tenant_id, retention_days, timestamp)
WHERE retention_days > 0;
COMMENT ON INDEX idx_activity_logs_retention_cleanup IS 'Optimize cleanup function for expired logs';

-- Foreign key indexes
CREATE INDEX idx_activity_logs_event_id ON activity_logs(event_id);
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);

-- =============================================================================
-- Success Message
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 003-indexes.sql completed successfully';
  RAISE NOTICE 'Created 25 indexes for optimized query performance';
  RAISE NOTICE 'Key indexes: token validation, slug lookup, ordered retrievals, cleanup queries';
END $$;
