-- Migration: Create RLS policies for subscriptions
-- Feature: 012-dobbiamo-lavorare-al
-- Date: 2025-10-14

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Agencies can only access their own subscription
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT
  USING (agency_id = app.current_agency_id());

-- Agencies can only update their own subscription
CREATE POLICY "subscriptions_update_own" ON subscriptions FOR UPDATE
  USING (agency_id = app.current_agency_id());

-- Auto-created on agency signup (triggered by after_agency_insert)
CREATE POLICY "subscriptions_auto_create" ON subscriptions FOR INSERT
  WITH CHECK (agency_id = app.current_agency_id());

-- Comments
COMMENT ON POLICY "subscriptions_select_own" ON subscriptions IS 'Agencies can only view their own subscription tier and usage';
COMMENT ON POLICY "subscriptions_update_own" ON subscriptions IS 'Agencies can only update their own subscription tier (upgrades/downgrades)';
COMMENT ON POLICY "subscriptions_auto_create" ON subscriptions IS 'Allow subscription creation for current agency (triggered on signup)';
