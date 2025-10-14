-- Migration: Extend access_tokens table with auto-expiration
-- Feature: 012-dobbiamo-lavorare-al
-- Date: 2025-10-14

-- Add new columns to access_tokens
ALTER TABLE access_tokens
  ADD COLUMN token_type TEXT CHECK (token_type IN ('slide_upload', 'participant_access')),
  ADD COLUMN auto_expire_date TIMESTAMPTZ CHECK (auto_expire_date > created_at);

-- Backfill existing tokens (set as participant_access with 7-day expiration)
UPDATE access_tokens t
SET
  token_type = 'participant_access',
  auto_expire_date = (SELECT end_date + INTERVAL '7 days' FROM events WHERE id = t.event_id)
WHERE token_type IS NULL;

-- Make columns NOT NULL after backfill
ALTER TABLE access_tokens
  ALTER COLUMN token_type SET NOT NULL,
  ALTER COLUMN auto_expire_date SET NOT NULL;

-- Create function to auto-create 2 tokens on event creation
CREATE OR REPLACE FUNCTION create_event_tokens()
RETURNS TRIGGER AS $$
DECLARE
  upload_token TEXT;
  access_token TEXT;
BEGIN
  -- Generate slide upload token (21-char nanoid)
  upload_token := substring(md5(random()::text || clock_timestamp()::text) from 1 for 21);

  INSERT INTO access_tokens (event_id, token_type, token, auto_expire_date)
  VALUES (
    NEW.id,
    'slide_upload',
    upload_token,
    NEW.end_date + INTERVAL '7 days'
  );

  -- Generate participant access token (21-char nanoid)
  access_token := substring(md5(random()::text || clock_timestamp()::text || 'salt') from 1 for 21);

  INSERT INTO access_tokens (event_id, token_type, token, auto_expire_date)
  VALUES (
    NEW.id,
    'participant_access',
    access_token,
    NEW.end_date + INTERVAL '7 days'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_insert_tokens
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION create_event_tokens();

-- Create function to update token expiration when event date changes
CREATE OR REPLACE FUNCTION update_token_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date <> OLD.end_date THEN
    UPDATE access_tokens
    SET auto_expire_date = NEW.end_date + INTERVAL '7 days'
    WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_date_change
AFTER UPDATE OF end_date ON events
FOR EACH ROW EXECUTE FUNCTION update_token_expiration();

-- Comments
COMMENT ON COLUMN access_tokens.token_type IS 'Token purpose: slide_upload (for speakers) or participant_access (for attendees)';
COMMENT ON COLUMN access_tokens.auto_expire_date IS 'Token expiration timestamp. Computed as event_date + 7 days. Non-regenerable.';
