-- Migration: Create subscription event count triggers
-- Feature: 012-dobbiamo-lavorare-al
-- Date: 2025-10-14

-- Create function to increment event count on event creation
CREATE OR REPLACE FUNCTION increment_event_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE subscriptions
  SET current_event_count = current_event_count + 1,
      updated_at = NOW()
  WHERE agency_id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_insert
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION increment_event_count();

-- Create function to decrement event count on event deletion
CREATE OR REPLACE FUNCTION decrement_event_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE subscriptions
  SET current_event_count = current_event_count - 1,
      updated_at = NOW()
  WHERE agency_id = OLD.tenant_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_delete
AFTER DELETE ON events
FOR EACH ROW EXECUTE FUNCTION decrement_event_count();

-- Comments
COMMENT ON FUNCTION increment_event_count() IS 'Increments subscription event count when event is created';
COMMENT ON FUNCTION decrement_event_count() IS 'Decrements subscription event count when event is deleted';
