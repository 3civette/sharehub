/**
 * Thumbnail Quota Service
 * Feature: 009-voglio-implementare-la (Thumbnail Generation)
 * Purpose: Manage tenant thumbnail quota with atomic operations
 */

import { createClient } from '@/lib/supabase/server';

export interface QuotaStatus {
  available: boolean;
  used: number;
  total: number;
  remaining: number;
}

export interface QuotaCheckResult {
  quota_available: boolean;
  quota_used: number;
  quota_total: number;
  quota_remaining: number;
}

/**
 * Atomically check and reserve thumbnail quota
 * Uses PostgreSQL row-level locking to prevent race conditions
 *
 * @param tenantId - Tenant UUID
 * @returns Quota status after increment (if successful)
 * @throws Error if tenant not found or database error
 *
 * @example
 * ```ts
 * const quota = await checkAndReserveQuota(tenantId);
 * if (!quota.available) {
 *   return { error: 'QUOTA_EXHAUSTED', quota };
 * }
 * // Proceed with CloudConvert job creation
 * ```
 */
export async function checkAndReserveQuota(
  tenantId: string
): Promise<QuotaStatus> {
  const supabase = await createClient();

  try {
    // Call atomic function with row-level locking
    const { data, error } = await supabase.rpc(
      'check_and_increment_thumbnail_quota',
      { p_tenant_id: tenantId }
    );

    if (error) {
      throw new Error(`Quota check failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const result: QuotaCheckResult = data[0];

    return {
      available: result.quota_available,
      used: result.quota_used,
      total: result.quota_total,
      remaining: result.quota_remaining,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to check quota: ${error.message}`);
    }
    throw new Error('Failed to check quota with unknown error');
  }
}

/**
 * Rollback quota reservation when job creation fails
 * Decrements quota_used by 1 (with minimum of 0)
 *
 * @param tenantId - Tenant UUID
 *
 * @example
 * ```ts
 * const quota = await checkAndReserveQuota(tenantId);
 * try {
 *   await createCloudConvertJob(config);
 * } catch (error) {
 *   await rollbackQuotaReservation(tenantId); // Undo quota increment
 *   throw error;
 * }
 * ```
 */
export async function rollbackQuotaReservation(
  tenantId: string
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('rollback_thumbnail_quota', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Quota rollback failed: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to rollback quota: ${error.message}`);
    }
    throw new Error('Failed to rollback quota with unknown error');
  }
}

/**
 * Get current quota status without modifying it
 * Used for displaying quota in UI (quota badge)
 *
 * @param tenantId - Tenant UUID
 * @returns Current quota status
 *
 * @example
 * ```ts
 * const quota = await getQuotaStatus(tenantId);
 * return {
 *   message: `${quota.remaining} thumbnails remaining`,
 *   progress: (quota.used / quota.total) * 100
 * };
 * ```
 */
export async function getQuotaStatus(
  tenantId: string
): Promise<QuotaStatus> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('thumbnail_quota_used, thumbnail_quota_total')
      .eq('id', tenantId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch quota: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const used = data.thumbnail_quota_used;
    const total = data.thumbnail_quota_total;
    const remaining = Math.max(0, total - used);

    return {
      available: used < total,
      used,
      total,
      remaining,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get quota status: ${error.message}`);
    }
    throw new Error('Failed to get quota status with unknown error');
  }
}

/**
 * Check if tenant has any quota remaining (non-atomic, read-only)
 * Used for UI conditional rendering (show/hide thumbnail button)
 *
 * @param tenantId - Tenant UUID
 * @returns True if quota available
 */
export async function hasQuotaAvailable(tenantId: string): Promise<boolean> {
  try {
    const quota = await getQuotaStatus(tenantId);
    return quota.available;
  } catch (error) {
    console.error('Failed to check quota availability:', error);
    return false; // Fail safe - assume no quota on error
  }
}

/**
 * Reset tenant quota (admin operation)
 * Sets quota_used back to 0
 *
 * @param tenantId - Tenant UUID
 *
 * @example
 * ```ts
 * // Admin upgrading tenant to paid plan
 * await resetQuota(tenantId);
 * await updateQuotaTotal(tenantId, 100); // Increase to paid tier
 * ```
 */
export async function resetQuota(tenantId: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('tenants')
      .update({
        thumbnail_quota_used: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      throw new Error(`Failed to reset quota: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to reset quota: ${error.message}`);
    }
    throw new Error('Failed to reset quota with unknown error');
  }
}

/**
 * Update tenant quota total (admin operation)
 * Used for upgrading/downgrading plans
 *
 * @param tenantId - Tenant UUID
 * @param newTotal - New quota total value
 *
 * @example
 * ```ts
 * // Upgrade to paid plan
 * await updateQuotaTotal(tenantId, 100);
 *
 * // Downgrade to free plan
 * await updateQuotaTotal(tenantId, 5);
 * ```
 */
export async function updateQuotaTotal(
  tenantId: string,
  newTotal: number
): Promise<void> {
  if (newTotal < 0) {
    throw new Error('Quota total must be non-negative');
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('tenants')
      .update({
        thumbnail_quota_total: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      throw new Error(`Failed to update quota total: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update quota total: ${error.message}`);
    }
    throw new Error('Failed to update quota total with unknown error');
  }
}

/**
 * Get quota statistics for analytics
 * Returns aggregate quota usage across all tenants
 *
 * @returns Quota statistics
 */
export async function getQuotaStatistics(): Promise<{
  totalTenants: number;
  avgQuotaUsed: number;
  tenantsAtLimit: number;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('thumbnail_quota_used, thumbnail_quota_total');

    if (error) {
      throw new Error(`Failed to fetch quota statistics: ${error.message}`);
    }

    const tenants = data || [];
    const totalTenants = tenants.length;
    const avgQuotaUsed =
      tenants.reduce((sum, t) => sum + t.thumbnail_quota_used, 0) /
      totalTenants;
    const tenantsAtLimit = tenants.filter(
      (t) => t.thumbnail_quota_used >= t.thumbnail_quota_total
    ).length;

    return {
      totalTenants,
      avgQuotaUsed: Math.round(avgQuotaUsed * 100) / 100,
      tenantsAtLimit,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get quota statistics: ${error.message}`);
    }
    throw new Error('Failed to get quota statistics with unknown error');
  }
}
