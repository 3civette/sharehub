-- Migration: Create subscriptions table
-- Feature: 012-dobbiamo-lavorare-al
-- Date: 2025-10-14

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'professional', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled')) DEFAULT 'active',
  event_limit INTEGER NOT NULL CHECK (event_limit >= -1), -- -1 = unlimited (Enterprise)
  current_event_count INTEGER NOT NULL DEFAULT 0 CHECK (current_event_count >= 0),
  billing_cycle DATE NULL, -- NULL for free tier
  price_monthly DECIMAL(10,2) NULL CHECK (price_monthly >= 0), -- NULL for free tier
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id) -- One subscription per agency
);

-- Create indexes
CREATE UNIQUE INDEX idx_subscriptions_agency_id ON subscriptions(agency_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Create trigger to auto-create free subscription on agency signup
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (agency_id, tier, event_limit, price_monthly)
  VALUES (NEW.id, 'free', 3, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_agency_insert
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE subscriptions IS 'Tracks billing tier, usage limits, and tier enforcement for each agency';
COMMENT ON COLUMN subscriptions.tier IS 'Subscription tier: free (3 events), basic (5 events, €29), professional (20 events, €79), enterprise (unlimited, €199)';
COMMENT ON COLUMN subscriptions.event_limit IS 'Max events allowed. -1 = unlimited (Enterprise tier)';
COMMENT ON COLUMN subscriptions.current_event_count IS 'Current number of active events. Incremented/decremented by triggers.';
