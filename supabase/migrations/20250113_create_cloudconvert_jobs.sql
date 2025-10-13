-- Migration: Create cloudconvert_jobs table
-- Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
-- Date: 2025-01-13

-- Create cloudconvert_jobs table for tracking external API jobs
CREATE TABLE IF NOT EXISTS cloudconvert_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  cloudconvert_job_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  webhook_received_at TIMESTAMPTZ,
  UNIQUE(slide_id) -- One job per slide at a time
);

-- Add comments for documentation
COMMENT ON TABLE cloudconvert_jobs IS 'Tracks CloudConvert API job status for async thumbnail generation';
COMMENT ON COLUMN cloudconvert_jobs.cloudconvert_job_id IS 'External CloudConvert job ID';
COMMENT ON COLUMN cloudconvert_jobs.idempotency_key IS 'Prevents duplicate job creation';
COMMENT ON COLUMN cloudconvert_jobs.webhook_received_at IS 'Timestamp when webhook was received (for monitoring)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cloudconvert_jobs_slide_id ON cloudconvert_jobs(slide_id);
CREATE INDEX IF NOT EXISTS idx_cloudconvert_jobs_tenant_id ON cloudconvert_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cloudconvert_jobs_status ON cloudconvert_jobs(status)
WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_cloudconvert_jobs_timeout ON cloudconvert_jobs(started_at)
WHERE status IN ('pending', 'processing') AND started_at < NOW() - INTERVAL '5 minutes';
