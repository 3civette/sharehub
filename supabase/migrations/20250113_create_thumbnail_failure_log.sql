-- Migration: Create thumbnail_failure_log table
-- Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
-- Date: 2025-01-13

-- Create thumbnail_failure_log table for tracking failures
CREATE TABLE IF NOT EXISTS thumbnail_failure_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL
    CHECK (error_type IN ('cloudconvert_api_error', 'webhook_timeout', 'quota_exceeded', 'invalid_format', 'network_error')),
  error_message TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE thumbnail_failure_log IS 'Append-only log of thumbnail generation failures for email notification triggering';
COMMENT ON COLUMN thumbnail_failure_log.error_type IS 'Categorized error type for analytics';
COMMENT ON COLUMN thumbnail_failure_log.error_message IS 'Human-readable error message';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_failure_log_event_occurred ON thumbnail_failure_log(event_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_failure_log_tenant_id ON thumbnail_failure_log(tenant_id);
