-- Feature 004: Public Event Page - RLS Policies for Public Read Access
-- Date: 2025-10-07
-- Description: Allow public read access to events, sessions, speeches, and slides

-- ============================================================================
-- 1. PUBLIC EVENT READ ACCESS
-- ============================================================================

-- Allow public read for public events
CREATE POLICY "public_events_read"
ON events FOR SELECT
USING (visibility = 'public');

-- Allow public read for sessions of public events
CREATE POLICY "public_sessions_read"
ON sessions FOR SELECT
USING (
  event_id IN (
    SELECT id FROM events WHERE visibility = 'public'
  )
);

-- Allow public read for speeches in public events
CREATE POLICY "public_speeches_read"
ON speeches FOR SELECT
USING (
  session_id IN (
    SELECT id FROM sessions WHERE event_id IN (
      SELECT id FROM events WHERE visibility = 'public'
    )
  )
);

-- Allow public read for slides in public events
CREATE POLICY "public_slides_read"
ON slides FOR SELECT
USING (
  speech_id IN (
    SELECT id FROM speeches WHERE session_id IN (
      SELECT id FROM sessions WHERE event_id IN (
        SELECT id FROM events WHERE visibility = 'public'
      )
    )
  )
);

-- ============================================================================
-- 2. PRIVATE EVENT ACCESS WITH VALID TOKEN
-- ============================================================================

-- Allow read for private events with valid token
-- Requires app.current_token_id() to be set by middleware
CREATE POLICY "private_events_read_with_token"
ON events FOR SELECT
USING (
  visibility = 'private' AND id IN (
    SELECT event_id FROM access_tokens
    WHERE id = app.current_token_id() AND expires_at > NOW()
  )
);

-- Allow read for sessions in private events with valid token
CREATE POLICY "private_sessions_read_with_token"
ON sessions FOR SELECT
USING (
  event_id IN (
    SELECT event_id FROM access_tokens
    WHERE id = app.current_token_id() AND expires_at > NOW()
  )
);

-- Allow read for speeches in private events with valid token
CREATE POLICY "private_speeches_read_with_token"
ON speeches FOR SELECT
USING (
  session_id IN (
    SELECT id FROM sessions WHERE event_id IN (
      SELECT event_id FROM access_tokens
      WHERE id = app.current_token_id() AND expires_at > NOW()
    )
  )
);

-- Allow read for slides in private events with valid token
CREATE POLICY "private_slides_read_with_token"
ON slides FOR SELECT
USING (
  speech_id IN (
    SELECT id FROM speeches WHERE session_id IN (
      SELECT id FROM sessions WHERE event_id IN (
        SELECT event_id FROM access_tokens
        WHERE id = app.current_token_id() AND expires_at > NOW()
      )
    )
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after applying migration to verify policies are active:
--
-- SELECT * FROM pg_policies WHERE tablename = 'events';
-- SELECT * FROM pg_policies WHERE tablename = 'sessions';
-- SELECT * FROM pg_policies WHERE tablename = 'speeches';
-- SELECT * FROM pg_policies WHERE tablename = 'slides';
