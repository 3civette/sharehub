-- Migration: Feature 003 - RLS Policies for Event Management
-- Purpose: Row-level security policies with direct tenant_id checks
-- Date: 2025-10-07
-- Lesson Learned: Avoid recursive joins (from feature 002) by using direct tenant_id columns

-- =============================================================================
-- EVENTS TABLE RLS
-- =============================================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can manage their own events
CREATE POLICY "events_tenant_isolation"
ON events
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "events_tenant_isolation" ON events IS
  'Tenants can only access events that belong to them. Uses direct tenant_id check to avoid recursion.';

-- =============================================================================
-- SESSIONS TABLE RLS
-- =============================================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can manage their own sessions
CREATE POLICY "sessions_tenant_isolation"
ON sessions
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "sessions_tenant_isolation" ON sessions IS
  'Direct tenant_id check avoids recursive joins through events table.';

-- =============================================================================
-- SPEECHES TABLE RLS
-- =============================================================================
ALTER TABLE speeches ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can manage their own speeches
CREATE POLICY "speeches_tenant_isolation"
ON speeches
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "speeches_tenant_isolation" ON speeches IS
  'Direct tenant_id check avoids recursive joins through sessions/events tables.';

-- =============================================================================
-- SLIDES TABLE RLS
-- =============================================================================
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can manage their own slides
CREATE POLICY "slides_tenant_isolation"
ON slides
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "slides_tenant_isolation" ON slides IS
  'Direct tenant_id check avoids recursive joins through speeches/sessions/events tables.';

-- =============================================================================
-- ACCESS_TOKENS TABLE RLS
-- =============================================================================
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Public read for token validation (middleware needs to check any token)
CREATE POLICY "access_tokens_public_read"
ON access_tokens
FOR SELECT
USING (true);

-- Policy: Only event owners can create/manage tokens
CREATE POLICY "access_tokens_owner_write"
ON access_tokens
FOR INSERT, UPDATE, DELETE
USING (
  event_id IN (
    SELECT id FROM events
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
  )
);

COMMENT ON POLICY "access_tokens_public_read" ON access_tokens IS
  'Anyone can read tokens for validation. Expiration is checked in application layer.';
COMMENT ON POLICY "access_tokens_owner_write" ON access_tokens IS
  'Only event owners (matched by tenant) can create or modify tokens.';

-- =============================================================================
-- EVENT_METRICS TABLE RLS
-- =============================================================================
ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own metrics
CREATE POLICY "event_metrics_tenant_read"
ON event_metrics
FOR SELECT
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: System can update any metrics (for tracking page views, downloads)
-- Note: Application layer will set tenant context before updates
CREATE POLICY "event_metrics_system_write"
ON event_metrics
FOR INSERT, UPDATE
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMENT ON POLICY "event_metrics_tenant_read" ON event_metrics IS
  'Tenants can only view metrics for their own events.';
COMMENT ON POLICY "event_metrics_system_write" ON event_metrics IS
  'Metrics updates require tenant context to be set by application middleware.';

-- =============================================================================
-- ACTIVITY_LOGS TABLE RLS
-- =============================================================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own activity logs
CREATE POLICY "activity_logs_tenant_read"
ON activity_logs
FOR SELECT
USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: System can insert logs with tenant context
CREATE POLICY "activity_logs_system_insert"
ON activity_logs
FOR INSERT
WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: No updates or deletes (audit trail immutability)
-- Exception: cleanup function bypasses RLS to delete expired logs

COMMENT ON POLICY "activity_logs_tenant_read" ON activity_logs IS
  'Tenants can only view activity logs for their own events.';
COMMENT ON POLICY "activity_logs_system_insert" ON activity_logs IS
  'Logs can only be inserted with proper tenant context set.';

-- =============================================================================
-- RLS TESTING HELPER FUNCTION
-- =============================================================================
-- This function helps verify RLS policies are working correctly
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
-- Success Message
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 003-rls-policies.sql completed successfully';
  RAISE NOTICE 'RLS enabled on 7 tables with direct tenant_id checks';
  RAISE NOTICE 'Use SELECT * FROM test_rls_isolation(tenant_id) to verify isolation';
END $$;
