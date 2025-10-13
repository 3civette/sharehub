-- Migration: Add thumbnail quota columns to tenants table
-- Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
-- Date: 2025-01-13

-- Add thumbnail quota columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS thumbnail_quota_total INTEGER NOT NULL DEFAULT 5
  CHECK (thumbnail_quota_total >= 0),
ADD COLUMN IF NOT EXISTS thumbnail_quota_used INTEGER NOT NULL DEFAULT 0
  CHECK (thumbnail_quota_used >= 0 AND thumbnail_quota_used <= thumbnail_quota_total);

-- Add comment for documentation
COMMENT ON COLUMN tenants.thumbnail_quota_total IS 'Total thumbnails allowed for this tenant (freemium: 5 free)';
COMMENT ON COLUMN tenants.thumbnail_quota_used IS 'Number of thumbnails consumed by this tenant';

-- Update existing tenants to have default quota
UPDATE tenants
SET thumbnail_quota_total = 5, thumbnail_quota_used = 0
WHERE thumbnail_quota_total IS NULL OR thumbnail_quota_used IS NULL;
