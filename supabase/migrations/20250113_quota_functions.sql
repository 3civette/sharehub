-- Migration: Atomic quota functions
-- Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
-- Date: 2025-01-13

-- Function: Atomic quota check and increment
-- Purpose: Prevent race conditions when checking and reserving thumbnail quota
CREATE OR REPLACE FUNCTION check_and_increment_thumbnail_quota(p_tenant_id UUID)
RETURNS TABLE (
  quota_available BOOLEAN,
  quota_used INTEGER,
  quota_total INTEGER,
  quota_remaining INTEGER
) AS $$
DECLARE
  v_quota_used INTEGER;
  v_quota_total INTEGER;
BEGIN
  -- Lock tenant row to prevent concurrent modifications
  SELECT thumbnail_quota_used, thumbnail_quota_total
  INTO v_quota_used, v_quota_total
  FROM tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  -- Check if tenant exists
  IF v_quota_used IS NULL OR v_quota_total IS NULL THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;

  -- Check if quota available
  IF v_quota_used < v_quota_total THEN
    -- Increment usage
    UPDATE tenants
    SET
      thumbnail_quota_used = thumbnail_quota_used + 1,
      updated_at = NOW()
    WHERE id = p_tenant_id
    RETURNING thumbnail_quota_used, thumbnail_quota_total
    INTO v_quota_used, v_quota_total;

    -- Return success with updated quota
    RETURN QUERY SELECT
      true AS quota_available,
      v_quota_used AS quota_used,
      v_quota_total AS quota_total,
      (v_quota_total - v_quota_used) AS quota_remaining;
  ELSE
    -- Quota exhausted
    RETURN QUERY SELECT
      false AS quota_available,
      v_quota_used AS quota_used,
      v_quota_total AS quota_total,
      0 AS quota_remaining;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Rollback quota on failure
-- Purpose: Decrement quota if CloudConvert job creation fails after reservation
CREATE OR REPLACE FUNCTION rollback_thumbnail_quota(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE tenants
  SET
    thumbnail_quota_used = GREATEST(thumbnail_quota_used - 1, 0),
    updated_at = NOW()
  WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION check_and_increment_thumbnail_quota(UUID) IS 'Atomically check and reserve thumbnail quota with row-level locking';
COMMENT ON FUNCTION rollback_thumbnail_quota(UUID) IS 'Decrement quota if job creation fails after reservation';
