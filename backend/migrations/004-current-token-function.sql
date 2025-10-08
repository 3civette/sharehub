-- Feature 004: Public Event Page - Token Validation Function
-- Date: 2025-10-07
-- Description: PostgreSQL function to retrieve current token ID from session variable

-- ============================================================================
-- CREATE SCHEMA FOR APP-SPECIFIC FUNCTIONS (if not exists)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS app;

-- ============================================================================
-- TOKEN ID SESSION VARIABLE FUNCTION
-- ============================================================================

-- Function to get current token ID set by middleware
-- Returns NULL if not set or invalid
CREATE OR REPLACE FUNCTION app.current_token_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  token_id_text text;
  token_id uuid;
BEGIN
  -- Get session variable set by middleware
  token_id_text := current_setting('app.current_token_id', true);

  -- Return NULL if not set
  IF token_id_text IS NULL OR token_id_text = '' THEN
    RETURN NULL;
  END IF;

  -- Try to cast to UUID, return NULL if invalid
  BEGIN
    token_id := token_id_text::uuid;
    RETURN token_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Allow public (anon/authenticated) to execute function
GRANT USAGE ON SCHEMA app TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app.current_token_id() TO anon, authenticated;

-- ============================================================================
-- USAGE IN MIDDLEWARE (for reference, not executed here)
-- ============================================================================
-- Backend middleware should set the session variable after token validation:
--
-- // TypeScript example:
-- await supabase.rpc('exec_sql', {
--   sql: `SET LOCAL app.current_token_id = '${validatedTokenId}';`
-- });
--
-- OR using raw SQL query:
-- SET LOCAL app.current_token_id = 'uuid-here';
--
-- This makes the token ID available to RLS policies for the current transaction.

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Test the function (should return NULL when not set):
-- SELECT app.current_token_id();
