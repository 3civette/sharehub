/**
 * CloudConvert Service
 * Feature: 009-voglio-implementare-la (Thumbnail Generation)
 * Purpose: Orchestrate thumbnail generation workflow with CloudConvert API
 */

import { createClient } from '@/lib/supabase/server';
import {
  createCloudConvertClient,
  createThumbnailJob,
  type ThumbnailJobConfig,
} from '@/lib/cloudconvert';
import {
  checkAndReserveQuota,
  rollbackQuotaReservation,
  type QuotaStatus,
} from './thumbnailQuotaService';
import { v4 as uuidv4 } from 'uuid';
import R2 from '@/lib/r2';

// Supported file types for thumbnail generation
const SUPPORTED_MIME_TYPES = [
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/pdf', // .pdf
];

const MIME_TYPE_TO_FORMAT: Record<string, 'ppt' | 'pptx' | 'pdf'> = {
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
  'application/pdf': 'pdf',
};

export interface ThumbnailGenerationRequest {
  slideId: string;
  tenantId: string;
  eventId: string;
}

export interface ThumbnailGenerationResult {
  success: boolean;
  jobId?: string;
  status: 'processing' | 'completed' | 'failed' | 'quota_exhausted' | 'disabled';
  quota: QuotaStatus;
  message: string;
  upgradeUrl?: string; // For quota exhausted cases
}

/**
 * Initiate thumbnail generation for a slide
 * Complete workflow: validate → check quota → create job → track
 *
 * @param request - Slide and tenant context
 * @returns Generation result with job ID and quota status
 *
 * @example
 * ```ts
 * const result = await initiateThumbnailGeneration({
 *   slideId: 'uuid',
 *   tenantId: 'uuid',
 *   eventId: 'uuid'
 * });
 *
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: result.status, message: result.message, quota: result.quota },
 *     { status: result.status === 'quota_exhausted' ? 403 : 400 }
 *   );
 * }
 * ```
 */
export async function initiateThumbnailGeneration(
  request: ThumbnailGenerationRequest
): Promise<ThumbnailGenerationResult> {
  const supabase = await createClient();
  const { slideId, tenantId, eventId } = request;

  try {
    // Step 1: Verify event has thumbnail generation enabled
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('thumbnail_generation_enabled')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    if (!event.thumbnail_generation_enabled) {
      return {
        success: false,
        status: 'disabled',
        quota: { available: false, used: 0, total: 0, remaining: 0 },
        message: 'Thumbnail generation is disabled for this event',
      };
    }

    // Step 2: Get slide details and validate
    const { data: slide, error: slideError } = await supabase
      .from('slides')
      .select('filename, mime_type, r2_key, thumbnail_status, thumbnail_r2_key')
      .eq('id', slideId)
      .single();

    if (slideError || !slide) {
      throw new Error('Slide not found');
    }

    // Check if thumbnail already exists
    if (slide.thumbnail_status === 'completed' && slide.thumbnail_r2_key) {
      // Don't consume quota for existing thumbnails
      const quota = await checkAndReserveQuota(tenantId);
      await rollbackQuotaReservation(tenantId); // Undo the increment

      return {
        success: true,
        status: 'completed',
        quota,
        message: 'Thumbnail already exists',
      };
    }

    // Check if file type is supported
    if (!SUPPORTED_MIME_TYPES.includes(slide.mime_type)) {
      return {
        success: false,
        status: 'failed',
        quota: { available: false, used: 0, total: 0, remaining: 0 },
        message: `Unsupported file type. Only PPT, PPTX, and PDF files are supported.`,
      };
    }

    // Step 3: Check and reserve quota atomically
    const quota = await checkAndReserveQuota(tenantId);

    if (!quota.available) {
      return {
        success: false,
        status: 'quota_exhausted',
        quota,
        message: `Thumbnail quota exhausted. You have used all ${quota.total} free thumbnails.`,
        upgradeUrl: '/admin/settings/billing?upgrade=thumbnail-quota',
      };
    }

    // Step 4: Generate R2 signed URL for input file
    let inputFileUrl: string;
    try {
      inputFileUrl = await R2.generateDownloadUrl(slide.r2_key, 3600); // 1 hour expiry
    } catch (error) {
      await rollbackQuotaReservation(tenantId); // Rollback quota on error
      throw new Error('Failed to generate signed URL for slide: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Step 5: Create CloudConvert job
    const cloudConvert = createCloudConvertClient();
    const inputFormat = MIME_TYPE_TO_FORMAT[slide.mime_type];
    const outputFilename = `${slideId}-thumbnail.jpg`;

    const jobConfig: ThumbnailJobConfig = {
      slideId,
      tenantId,
      inputFileUrl,
      inputFormat,
      webhookUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/cloudconvert`,
      outputFilename,
    };

    let jobResult;
    try {
      jobResult = await createThumbnailJob(cloudConvert, jobConfig);
    } catch (error) {
      // Rollback quota if CloudConvert API fails
      await rollbackQuotaReservation(tenantId);

      // Log failure
      await logThumbnailFailure(tenantId, eventId, slideId, {
        type: 'cloudconvert_api_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }

    // Step 6: Update slide status
    const { error: updateSlideError } = await supabase
      .from('slides')
      .update({ thumbnail_status: 'processing' })
      .eq('id', slideId);

    if (updateSlideError) {
      console.error('Failed to update slide status:', updateSlideError);
      // Don't fail the request - webhook will handle completion
    }

    // Step 7: Track job in database
    const idempotencyKey = uuidv4();
    const { error: jobTrackingError } = await supabase
      .from('cloudconvert_jobs')
      .insert({
        tenant_id: tenantId,
        slide_id: slideId,
        cloudconvert_job_id: jobResult.jobId,
        status: 'pending',
        idempotency_key: idempotencyKey,
        started_at: new Date().toISOString(),
      });

    if (jobTrackingError) {
      console.error('Failed to track CloudConvert job:', jobTrackingError);
      // Don't fail - job is already created, webhook will handle completion
    }

    return {
      success: true,
      jobId: jobResult.jobId,
      status: 'processing',
      quota,
      message: 'Thumbnail generation started',
    };
  } catch (error) {
    // Generic error handler
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Try to get current quota status
    let quota: QuotaStatus;
    try {
      const { checkAndReserveQuota: getQuotaStatus } = await import(
        './thumbnailQuotaService'
      );
      quota = await getQuotaStatus(tenantId);
      await rollbackQuotaReservation(tenantId); // Undo increment
    } catch {
      quota = { available: false, used: 0, total: 0, remaining: 0 };
    }

    return {
      success: false,
      status: 'failed',
      quota,
      message: `Thumbnail generation failed: ${errorMessage}`,
    };
  }
}

/**
 * Log thumbnail generation failure for email notification triggering
 * After 3+ consecutive failures, email service will send notification
 *
 * @param tenantId - Tenant UUID
 * @param eventId - Event UUID
 * @param slideId - Slide UUID
 * @param error - Error details
 */
async function logThumbnailFailure(
  tenantId: string,
  eventId: string,
  slideId: string,
  error: { type: string; message: string }
): Promise<void> {
  const supabase = await createClient();

  try {
    await supabase.from('thumbnail_failure_log').insert({
      tenant_id: tenantId,
      event_id: eventId,
      slide_id: slideId,
      error_type: error.type,
      error_message: error.message,
      occurred_at: new Date().toISOString(),
    });
  } catch (logError) {
    console.error('Failed to log thumbnail failure:', logError);
    // Don't throw - logging failure should not block the main flow
  }
}

/**
 * Retry thumbnail generation for a failed slide
 * Re-checks quota and re-initiates generation
 *
 * @param slideId - Slide UUID
 * @returns Generation result
 */
export async function retryThumbnailGeneration(
  slideId: string
): Promise<ThumbnailGenerationResult> {
  const supabase = await createClient();

  // Get slide context
  const { data: slide, error: slideError } = await supabase
    .from('slides')
    .select(
      `
      id,
      tenant_id,
      speech_id,
      speeches!inner (
        session_id,
        sessions!inner (
          event_id
        )
      )
    `
    )
    .eq('id', slideId)
    .single();

  if (slideError || !slide) {
    throw new Error('Slide not found');
  }

  const eventId = (slide.speeches as any).sessions.event_id;

  // Reset slide status to pending
  await supabase
    .from('slides')
    .update({ thumbnail_status: 'pending' })
    .eq('id', slideId);

  // Initiate generation
  return initiateThumbnailGeneration({
    slideId: slide.id,
    tenantId: slide.tenant_id,
    eventId,
  });
}

/**
 * Get consecutive failure count for an event
 * Used to determine if email notification should be sent
 *
 * @param eventId - Event UUID
 * @returns Number of consecutive failures in last 24 hours
 */
export async function getConsecutiveFailureCount(
  eventId: string
): Promise<number> {
  const supabase = await createClient();

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data, error } = await supabase
    .from('thumbnail_failure_log')
    .select('id')
    .eq('event_id', eventId)
    .gte('occurred_at', oneDayAgo.toISOString())
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('Failed to get failure count:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Check if file type supports thumbnail generation
 *
 * @param mimeType - File MIME type
 * @returns True if supported
 */
export function isFileTypeSupported(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType);
}

/**
 * Get input format from MIME type
 *
 * @param mimeType - File MIME type
 * @returns CloudConvert input format or null
 */
export function getMimeTypeFormat(
  mimeType: string
): 'ppt' | 'pptx' | 'pdf' | null {
  return MIME_TYPE_TO_FORMAT[mimeType] || null;
}
