/**
 * Client-side Thumbnail Service
 * Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
 * Purpose: Client-side API wrapper for thumbnail operations in React components
 */

// ============================================================================
// Types
// ============================================================================

export interface QuotaStatus {
  available: boolean;
  used: number;
  total: number;
  remaining: number;
}

export interface QuotaResponse {
  quota: QuotaStatus;
  usage_percent: number;
  upgrade_url: string;
}

export interface GenerateThumbnailResponse {
  message: string;
  status: 'processing' | 'completed' | 'failed' | 'quota_exhausted' | 'disabled';
  slide_id: string;
  job_id?: string;
  quota?: QuotaStatus;
  upgrade_url?: string;
}

export interface RetryThumbnailResponse {
  message: string;
  status: 'processing' | 'completed' | 'failed' | 'quota_exhausted' | 'disabled';
  slide_id: string;
  job_id?: string;
  quota?: QuotaStatus;
  upgrade_url?: string;
}

export interface ThumbnailServiceError {
  error: string;
  message: string;
  quota?: QuotaStatus;
  upgrade_url?: string;
}

// ============================================================================
// API Wrapper Functions
// ============================================================================

/**
 * Fetch current thumbnail quota status for authenticated tenant
 *
 * @returns Quota status with usage information
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * try {
 *   const quota = await fetchQuotaStatus();
 *   console.log(`Used: ${quota.quota.used}/${quota.quota.total}`);
 * } catch (error) {
 *   console.error('Failed to fetch quota:', error);
 * }
 * ```
 */
export async function fetchQuotaStatus(): Promise<QuotaResponse> {
  const response = await fetch('/api/admin/thumbnails/quota', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for auth
  });

  if (!response.ok) {
    const errorData: ThumbnailServiceError = await response.json();
    throw new Error(errorData.message || 'Failed to fetch quota status');
  }

  return response.json();
}

/**
 * Initiate thumbnail generation for a specific slide
 *
 * @param slideId - UUID of the slide
 * @returns Generation result with job status
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * try {
 *   const result = await generateThumbnail('slide-uuid');
 *   if (result.status === 'processing') {
 *     console.log('Thumbnail generation started:', result.job_id);
 *   }
 * } catch (error) {
 *   console.error('Failed to generate thumbnail:', error);
 * }
 * ```
 */
export async function generateThumbnail(
  slideId: string
): Promise<GenerateThumbnailResponse> {
  const response = await fetch(`/api/slides/${slideId}/generate-thumbnail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData: ThumbnailServiceError = await response.json();

    // For quota exhaustion, include quota data in error
    if (errorData.error === 'QUOTA_EXHAUSTED' && errorData.quota) {
      const error = new Error(errorData.message) as Error & {
        quota?: QuotaStatus;
        upgradeUrl?: string;
      };
      error.quota = errorData.quota;
      error.upgradeUrl = errorData.upgrade_url;
      throw error;
    }

    throw new Error(errorData.message || 'Failed to generate thumbnail');
  }

  return response.json();
}

/**
 * Retry thumbnail generation for a failed slide
 *
 * @param slideId - UUID of the slide with failed thumbnail
 * @returns Retry result with job status
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * try {
 *   const result = await retryThumbnail('slide-uuid');
 *   console.log('Retry initiated:', result.status);
 * } catch (error) {
 *   console.error('Failed to retry thumbnail:', error);
 * }
 * ```
 */
export async function retryThumbnail(
  slideId: string
): Promise<RetryThumbnailResponse> {
  const response = await fetch('/api/admin/thumbnails/retry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ slide_id: slideId }),
  });

  if (!response.ok) {
    const errorData: ThumbnailServiceError = await response.json();

    // For quota exhaustion, include quota data in error
    if (errorData.error === 'QUOTA_EXHAUSTED' && errorData.quota) {
      const error = new Error(errorData.message) as Error & {
        quota?: QuotaStatus;
        upgradeUrl?: string;
      };
      error.quota = errorData.quota;
      error.upgradeUrl = errorData.upgrade_url;
      throw error;
    }

    throw new Error(errorData.message || 'Failed to retry thumbnail generation');
  }

  return response.json();
}

// ============================================================================
// React Hook Utilities (Optional - for future use)
// ============================================================================

/**
 * Check if quota is available (used for conditional rendering)
 *
 * @param quota - Quota status object
 * @returns True if quota is available
 */
export function hasQuota(quota: QuotaStatus): boolean {
  return quota.available && quota.remaining > 0;
}

/**
 * Get quota usage percentage
 *
 * @param quota - Quota status object
 * @returns Usage percentage (0-100)
 */
export function getQuotaUsagePercent(quota: QuotaStatus): number {
  return Math.round((quota.used / quota.total) * 100);
}

/**
 * Get quota status color (for UI indicators)
 *
 * @param quota - Quota status object
 * @returns Color category: 'success' | 'warning' | 'error'
 */
export function getQuotaStatusColor(
  quota: QuotaStatus
): 'success' | 'warning' | 'error' {
  const percent = getQuotaUsagePercent(quota);
  if (!quota.available || percent === 100) return 'error';
  if (percent >= 80) return 'warning';
  return 'success';
}
