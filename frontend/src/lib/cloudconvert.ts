/**
 * CloudConvert SDK Wrapper
 * Feature: 009-voglio-implementare-la (Thumbnail Generation)
 * Purpose: Thin wrapper around CloudConvert SDK for type safety and error handling
 */

import CloudConvert from 'cloudconvert';

// Type definitions for CloudConvert job operations
export interface ThumbnailJobConfig {
  slideId: string;
  tenantId: string;
  inputFileUrl: string;
  inputFormat: 'pptx' | 'ppt' | 'pdf';
  webhookUrl: string;
  outputFilename: string;
}

export interface ThumbnailJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'finished' | 'error';
  createdAt: string;
}

export interface JobStatus {
  id: string;
  status: 'waiting' | 'processing' | 'finished' | 'error';
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
}

/**
 * Initialize CloudConvert client
 * Requires CLOUDCONVERT_API_KEY environment variable
 */
export function createCloudConvertClient() {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;

  if (!apiKey) {
    throw new Error('CLOUDCONVERT_API_KEY environment variable is required');
  }

  return new CloudConvert(apiKey, true); // sandbox = true for development
}

/**
 * Create a thumbnail generation job for PPT/PPTX/PDF files
 * Extracts first slide and converts to JPEG
 *
 * @param config - Job configuration with file URLs and metadata
 * @returns Job ID and initial status
 *
 * @example
 * ```ts
 * const result = await createThumbnailJob({
 *   slideId: 'uuid',
 *   tenantId: 'uuid',
 *   inputFileUrl: 'https://r2.cloudflare.com/slides/file.pptx',
 *   inputFormat: 'pptx',
 *   webhookUrl: 'https://sharehub.app/api/webhooks/cloudconvert',
 *   outputFilename: 'thumbnail.jpg'
 * });
 * ```
 */
export async function createThumbnailJob(
  client: CloudConvert,
  config: ThumbnailJobConfig
): Promise<ThumbnailJobResult> {
  try {
    // Create job with multiple tasks: import → convert → export → webhook
    const job = await client.jobs.create({
      tasks: {
        // Task 1: Import file from URL
        'import-slide': {
          operation: 'import/url',
          url: config.inputFileUrl,
          filename: `input.${config.inputFormat}`,
        },

        // Task 2: Convert first page to JPEG
        'convert-to-thumbnail': {
          operation: 'convert',
          input: 'import-slide',
          output_format: 'jpg',
          // Use appropriate engine based on file type:
          // - PDF: graphicsmagick (fast and reliable)
          // - PPTX: office (modern Office format)
          // - PPT: libreoffice (legacy Office format - better compatibility)
          engine:
            config.inputFormat === 'pdf'
              ? 'graphicsmagick'
              : config.inputFormat === 'ppt'
              ? 'libreoffice'
              : 'office',
          pages: '1', // Extract only first page/slide
          // JPEG quality settings
          quality: 85,
          // Resize to thumbnail dimensions (maintain aspect ratio)
          resize: {
            fit: 'max',
            width: 1920,
            height: 1080,
          },
        },

        // Task 3: Export to temporary CloudConvert storage
        'export-thumbnail': {
          operation: 'export/url',
          input: 'convert-to-thumbnail',
          inline: false,
          archive_multiple_files: false,
        },

        // Task 4: Send webhook notification when complete
        'webhook-notify': {
          operation: 'webhook',
          url: config.webhookUrl,
          input: ['export-thumbnail'],
          // Pass metadata for webhook processing
          payload: JSON.stringify({
            slide_id: config.slideId,
            tenant_id: config.tenantId,
            output_filename: config.outputFilename,
          }),
        },
      },

      // Job-level webhook for error notifications
      webhook_url: config.webhookUrl,

      // Tag for tracking
      tag: `thumbnail-${config.slideId}`,
    });

    return {
      jobId: job.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    // Type-safe error handling
    if (error instanceof Error) {
      throw new Error(`CloudConvert job creation failed: ${error.message}`);
    }
    throw new Error('CloudConvert job creation failed with unknown error');
  }
}

/**
 * Get status of a CloudConvert job
 * Used for polling or webhook verification
 *
 * @param client - CloudConvert client instance
 * @param jobId - CloudConvert job ID
 * @returns Job status with task details
 */
export async function getJobStatus(
  client: CloudConvert,
  jobId: string
): Promise<JobStatus> {
  try {
    const job = await client.jobs.get(jobId);

    return {
      id: job.id,
      status: job.status,
      tasks: job.tasks.map((task: any) => ({
        id: task.id,
        operation: task.operation,
        status: task.status,
        result: task.result,
        message: task.message,
      })),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get job status: ${error.message}`);
    }
    throw new Error('Failed to get job status with unknown error');
  }
}

/**
 * Verify webhook signature from CloudConvert
 * Ensures webhook requests are authentic
 *
 * @param payload - Webhook request body (raw string)
 * @param signature - X-CloudConvert-Signature header value
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const webhookSecret = process.env.CLOUDCONVERT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('CLOUDCONVERT_WEBHOOK_SECRET environment variable is required');
  }

  // HMAC-SHA256 signature verification
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Cancel a running CloudConvert job
 * Used when quota rollback is needed or user cancels operation
 *
 * @param client - CloudConvert client instance
 * @param jobId - CloudConvert job ID
 */
export async function cancelJob(
  client: CloudConvert,
  jobId: string
): Promise<void> {
  try {
    await client.jobs.cancel(jobId);
  } catch (error) {
    // Log but don't throw - cancellation is best-effort
    console.error(`Failed to cancel CloudConvert job ${jobId}:`, error);
  }
}
