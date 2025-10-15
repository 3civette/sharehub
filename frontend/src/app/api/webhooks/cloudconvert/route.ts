/**
 * POST /api/webhooks/cloudconvert
 * Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
 * Purpose: Handle CloudConvert webhook callbacks for thumbnail completion
 *
 * CRITICAL: This endpoint must be idempotent and handle duplicate webhook deliveries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/service-role';
import {
  createCloudConvertClient,
  verifyWebhookSignature,
  getJobStatus,
} from '@/lib/cloudconvert';
import R2 from '@/lib/r2';
import {
  getConsecutiveFailureCount,
  sendThumbnailFailureNotification,
  shouldSendFailureNotification,
} from '@/services/emailNotificationService';
import { rollbackQuotaReservation } from '@/services/thumbnailQuotaService';

interface CloudConvertWebhookPayload {
  event: 'job.finished' | 'job.failed' | 'job.created' | 'job.processing';
  job: {
    id: string;
    status: 'finished' | 'error' | 'processing';
    created_at: string;
    tasks: Array<{
      id: string;
      operation: string;
      status: string;
      result?: {
        files?: Array<{
          filename: string;
          url: string;
        }>;
      };
      message?: string;
    }>;
  };
  // Custom metadata passed during job creation
  slide_id?: string;
  tenant_id?: string;
  output_filename?: string;
}

/**
 * POST Handler - CloudConvert Webhook
 * Processes webhook notifications from CloudConvert
 *
 * Flow:
 * 1. Verify webhook signature (HMAC-SHA256)
 * 2. Check idempotency (prevent duplicate processing)
 * 3. Handle job completion:
 *    - Download thumbnail from CloudConvert
 *    - Upload to R2
 *    - Update database
 * 4. Handle failures:
 *    - Log error
 *    - Rollback quota
 *    - Trigger email notification if 3+ failures
 *
 * Security:
 * - Signature verification required
 * - Service role key used (bypasses RLS)
 * - Rate limiting handled by Netlify
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-cloudconvert-signature') || '';

    // Step 2: Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        {
          error: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
        },
        { status: 401 }
      );
    }

    // Step 3: Parse webhook payload
    const payload: CloudConvertWebhookPayload = JSON.parse(rawBody);
    const { event, job } = payload;

    // Step 4: Extract metadata from webhook
    const slideId = payload.slide_id || extractMetadataFromJob(job, 'slide_id');
    const tenantId =
      payload.tenant_id || extractMetadataFromJob(job, 'tenant_id');

    if (!slideId || !tenantId) {
      console.error('Missing slide_id or tenant_id in webhook payload', {
        jobId: job.id,
        event,
      });
      return NextResponse.json(
        {
          error: 'INVALID_PAYLOAD',
          message: 'Missing required metadata',
        },
        { status: 400 }
      );
    }

    // Step 5: Check idempotency (prevent duplicate processing)
    const supabase = createClient();
    const { data: existingJob, error: jobCheckError } = await supabase
      .from('cloudconvert_jobs')
      .select('status, webhook_received_at')
      .eq('cloudconvert_job_id', job.id)
      .single();

    if (jobCheckError && jobCheckError.code !== 'PGRST116') {
      // Error other than "not found"
      throw jobCheckError;
    }

    // If webhook already processed, return 200 (idempotent)
    if (existingJob?.webhook_received_at) {
      console.log(`Webhook already processed for job ${job.id} (idempotent)`);
      return NextResponse.json({ message: 'Already processed' }, { status: 200 });
    }

    // Step 6: Handle different webhook events
    if (event === 'job.finished' && job.status === 'finished') {
      await handleJobSuccess(supabase, job, slideId, tenantId, payload);
    } else if (event === 'job.failed' || job.status === 'error') {
      await handleJobFailure(supabase, job, slideId, tenantId);
    } else {
      // Intermediate status (job.created, job.processing)
      console.log(`Webhook ${event} received for job ${job.id} - no action needed`);
    }

    return NextResponse.json(
      {
        message: 'Webhook processed',
        event,
        job_id: job.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing CloudConvert webhook:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message:
          error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle successful job completion
 * Download thumbnail from CloudConvert and upload to R2
 */
async function handleJobSuccess(
  supabase: any,
  job: CloudConvertWebhookPayload['job'],
  slideId: string,
  tenantId: string,
  payload: CloudConvertWebhookPayload
): Promise<void> {
  try {
    // Find export task with thumbnail URL
    const exportTask = job.tasks.find(
      (t) => t.operation === 'export/url' && t.status === 'finished'
    );

    if (!exportTask?.result?.files?.[0]?.url) {
      throw new Error('No thumbnail URL in webhook payload');
    }

    const thumbnailUrl = exportTask.result.files[0].url;

    // Download thumbnail from CloudConvert
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      throw new Error(`Failed to download thumbnail: ${response.statusText}`);
    }

    const thumbnailBuffer = Buffer.from(await response.arrayBuffer());

    // Generate R2 key for thumbnail
    const outputFilename = payload.output_filename || `${slideId}-thumbnail.jpg`;
    const thumbnailR2Key = `tenants/${tenantId}/thumbnails/${outputFilename}`;

    // Upload to R2
    await R2.uploadFile(thumbnailR2Key, thumbnailBuffer, 'image/jpeg');

    // Update slides table
    await supabase
      .from('slides')
      .update({
        thumbnail_r2_key: thumbnailR2Key,
        thumbnail_status: 'completed',
        thumbnail_generated_at: new Date().toISOString(),
      })
      .eq('id', slideId);

    // Update cloudconvert_jobs table
    await supabase
      .from('cloudconvert_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
      })
      .eq('cloudconvert_job_id', job.id);

    console.log(`Thumbnail generated successfully for slide ${slideId}`);
  } catch (error) {
    console.error('Error handling job success:', error);

    // Mark as failed in database
    await supabase
      .from('slides')
      .update({ thumbnail_status: 'failed' })
      .eq('id', slideId);

    await supabase
      .from('cloudconvert_jobs')
      .update({
        status: 'failed',
        error_message:
          error instanceof Error ? error.message : 'Unknown error',
        webhook_received_at: new Date().toISOString(),
      })
      .eq('cloudconvert_job_id', job.id);

    // Log failure and potentially notify
    await logAndNotifyFailure(
      supabase,
      slideId,
      tenantId,
      error instanceof Error ? error.message : 'Unknown error'
    );

    throw error; // Re-throw to return 500 to CloudConvert
  }
}

/**
 * Handle job failure
 * Log error, rollback quota, and trigger email notification if needed
 */
async function handleJobFailure(
  supabase: any,
  job: CloudConvertWebhookPayload['job'],
  slideId: string,
  tenantId: string
): Promise<void> {
  try {
    // Extract error message from failed task
    const failedTask = job.tasks.find((t) => t.status === 'error');
    const errorMessage = failedTask?.message || 'CloudConvert job failed';

    // Update slides table
    await supabase
      .from('slides')
      .update({ thumbnail_status: 'failed' })
      .eq('id', slideId);

    // Update cloudconvert_jobs table
    await supabase
      .from('cloudconvert_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
      })
      .eq('cloudconvert_job_id', job.id);

    // Rollback quota (since job failed)
    await rollbackQuotaReservation(tenantId);

    // Log failure and potentially notify
    await logAndNotifyFailure(supabase, slideId, tenantId, errorMessage);

    console.log(`Thumbnail generation failed for slide ${slideId}: ${errorMessage}`);
  } catch (error) {
    console.error('Error handling job failure:', error);
    throw error;
  }
}

/**
 * Log failure and trigger email notification if threshold reached
 */
async function logAndNotifyFailure(
  supabase: any,
  slideId: string,
  tenantId: string,
  errorMessage: string
): Promise<void> {
  try {
    // Get event_id for this slide
    const { data: slide } = await supabase
      .from('slides')
      .select(
        `
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

    if (!slide) {
      console.error(`Slide ${slideId} not found for failure logging`);
      return;
    }

    const eventId = (slide.speeches as any).sessions.event_id;

    // Log failure
    await supabase.from('thumbnail_failure_log').insert({
      tenant_id: tenantId,
      event_id: eventId,
      slide_id: slideId,
      error_type: 'cloudconvert_api_error',
      error_message: errorMessage,
      occurred_at: new Date().toISOString(),
    });

    // Check if notification should be sent (3+ failures)
    const failureCount = await getConsecutiveFailureCount(eventId);

    if (failureCount >= 3) {
      const shouldSend = await shouldSendFailureNotification(eventId);
      if (shouldSend) {
        await sendThumbnailFailureNotification({
          tenantId,
          eventId,
          failureCount,
        });
      }
    }
  } catch (error) {
    console.error('Error logging failure or sending notification:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Extract metadata from job payload (fallback if not in top-level)
 */
function extractMetadataFromJob(
  job: CloudConvertWebhookPayload['job'],
  key: string
): string | undefined {
  // Check if metadata is in webhook task
  const webhookTask = job.tasks.find((t) => t.operation === 'webhook');
  if (webhookTask) {
    try {
      // Metadata might be in the payload field
      return undefined; // TODO: Implement if CloudConvert supports this
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Export runtime configuration
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Allow up to 10 seconds for webhook processing
