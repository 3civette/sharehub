/**
 * Cloudflare R2 Client Wrapper
 * Feature: 008-voglio-implementare-la - Serverless Architecture with R2 Storage
 *
 * This module provides a wrapper around AWS SDK v3 for interacting with Cloudflare R2.
 * R2 is S3-compatible, so we use @aws-sdk/client-s3 with R2 endpoints.
 *
 * Key Features:
 * - Presigned URL generation for uploads (client → R2 direct)
 * - Presigned URL generation for downloads (client → R2 direct)
 * - R2 key generation with tenant/event isolation
 * - File type validation
 * - 48-hour retention support
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// =============================================================================
// Configuration
// =============================================================================

const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.R2_BUCKET_NAME || 'sharehub-slides',
  // R2 endpoint format: https://{accountId}.r2.cloudflarestorage.com
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto', // R2 requires 'auto' as the region
};

// Allowed MIME types for slide uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
] as const;

// Max file size: 1GB (in bytes)
const MAX_FILE_SIZE = 1073741824; // 1 * 1024 * 1024 * 1024

// Presigned URL expiry: 1 hour (in seconds)
const PRESIGNED_URL_EXPIRY = 3600;

// =============================================================================
// R2 Client Initialization
// =============================================================================

let r2Client: S3Client | null = null;

/**
 * Initialize R2 client (singleton pattern)
 * Validates environment variables and creates S3Client instance
 */
export function getR2Client(): S3Client {
  if (r2Client) {
    return r2Client;
  }

  // Validate required environment variables
  if (!R2_CONFIG.accountId) {
    throw new Error('R2_ACCOUNT_ID environment variable is required');
  }
  if (!R2_CONFIG.accessKeyId) {
    throw new Error('R2_ACCESS_KEY_ID environment variable is required');
  }
  if (!R2_CONFIG.secretAccessKey) {
    throw new Error('R2_SECRET_ACCESS_KEY environment variable is required');
  }

  // Create S3Client configured for R2
  r2Client = new S3Client({
    region: R2_CONFIG.region,
    endpoint: R2_CONFIG.endpoint,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
  });

  return r2Client;
}

// =============================================================================
// R2 Key Generation
// =============================================================================

/**
 * Generate R2 object key with tenant/event/slide hierarchy
 *
 * Format: tenant-{tenantId}/event-{eventId}/slide-{slideId}.{extension}
 * Example: tenant-550e8400-e29b-41d4-a716-446655440000/event-6ba7b810/slide-f47ac10b.pdf
 *
 * @param tenantId - UUID of the tenant
 * @param eventId - UUID of the event
 * @param slideId - UUID of the slide
 * @param filename - Original filename (to extract extension)
 * @returns R2 object key
 */
export function generateR2Key(
  tenantId: string,
  eventId: string,
  slideId: string,
  filename: string
): string {
  // Extract file extension from filename
  const extension = filename.split('.').pop()?.toLowerCase() || 'bin';

  // Generate hierarchical key
  const r2Key = `tenant-${tenantId}/event-${eventId}/slide-${slideId}.${extension}`;

  return r2Key;
}

// =============================================================================
// File Validation
// =============================================================================

/**
 * Validate file type against allowed MIME types
 *
 * @param mimeType - MIME type to validate
 * @returns true if valid, false otherwise
 */
export function validateFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

/**
 * Validate file size against maximum allowed
 *
 * @param fileSize - Size in bytes
 * @returns true if valid, false otherwise
 */
export function validateFileSize(fileSize: number): boolean {
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE;
}

/**
 * Get human-readable error message for invalid file type
 *
 * @param mimeType - Invalid MIME type
 * @returns Error message
 */
export function getFileTypeError(mimeType: string): string {
  return `File type "${mimeType}" is not allowed. Allowed types: PDF, PPT, PPTX, JPEG, PNG.`;
}

/**
 * Get human-readable error message for invalid file size
 *
 * @param fileSize - Invalid file size in bytes
 * @returns Error message
 */
export function getFileSizeError(fileSize: number): string {
  const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  return `File size ${sizeMB}MB exceeds maximum allowed size of 1GB.`;
}

// =============================================================================
// Presigned URL Generation
// =============================================================================

/**
 * Generate presigned upload URL for direct client → R2 upload
 *
 * @param r2Key - R2 object key (from generateR2Key)
 * @param contentType - MIME type of the file
 * @param expirySeconds - URL expiry in seconds (default: 1 hour)
 * @returns Presigned upload URL
 * @throws {R2UploadError} If URL generation fails
 */
export async function generatePresignedUploadUrl(
  r2Key: string,
  contentType: string,
  expirySeconds: number = PRESIGNED_URL_EXPIRY
): Promise<string> {
  try {
    const client = getR2Client();

    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: r2Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: expirySeconds,
    });

    return uploadUrl;
  } catch (error) {
    // Handle specific AWS SDK errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Network errors
      if (errorMessage.includes('network') || errorMessage.includes('enotfound') || errorMessage.includes('econnrefused')) {
        throw new R2UploadError(`Network error: Unable to connect to R2. Please check your internet connection.`);
      }

      // Credentials errors
      if (errorMessage.includes('credentials') || errorMessage.includes('access denied') || errorMessage.includes('InvalidAccessKeyId')) {
        throw new R2UploadError(`Authentication failed: Invalid R2 credentials. Please check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.`);
      }

      // Bucket errors
      if (errorMessage.includes('bucket') || errorMessage.includes('NoSuchBucket')) {
        throw new R2UploadError(`Bucket error: R2 bucket "${R2_CONFIG.bucketName}" not found. Please check R2_BUCKET_NAME configuration.`);
      }

      // Quota errors
      if (errorMessage.includes('quota') || errorMessage.includes('storage limit')) {
        throw new R2UploadError(`Storage quota exceeded: R2 bucket has reached its storage limit. Please contact support.`);
      }

      // Generic error
      throw new R2UploadError(`Failed to generate upload URL: ${error.message}`);
    }

    throw new R2UploadError('Failed to generate upload URL: Unknown error');
  }
}

/**
 * Generate presigned download URL for direct client → R2 download
 *
 * @param r2Key - R2 object key
 * @param expirySeconds - URL expiry in seconds (default: 1 hour)
 * @returns Presigned download URL
 * @throws {R2DownloadError} If URL generation fails
 */
export async function generatePresignedDownloadUrl(
  r2Key: string,
  expirySeconds: number = PRESIGNED_URL_EXPIRY
): Promise<string> {
  try {
    const client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: r2Key,
    });

    const downloadUrl = await getSignedUrl(client, command, {
      expiresIn: expirySeconds,
    });

    return downloadUrl;
  } catch (error) {
    // Handle specific AWS SDK errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Network errors
      if (errorMessage.includes('network') || errorMessage.includes('enotfound') || errorMessage.includes('econnrefused')) {
        throw new R2DownloadError(`Network error: Unable to connect to R2. Please check your internet connection.`);
      }

      // Credentials errors
      if (errorMessage.includes('credentials') || errorMessage.includes('access denied') || errorMessage.includes('InvalidAccessKeyId')) {
        throw new R2DownloadError(`Authentication failed: Invalid R2 credentials. Please check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.`);
      }

      // Object not found
      if (errorMessage.includes('NoSuchKey') || errorMessage.includes('not found')) {
        throw new R2DownloadError(`File not found: The requested file no longer exists in R2 storage. It may have been deleted.`);
      }

      // Bucket errors
      if (errorMessage.includes('bucket') || errorMessage.includes('NoSuchBucket')) {
        throw new R2DownloadError(`Bucket error: R2 bucket "${R2_CONFIG.bucketName}" not found. Please check R2_BUCKET_NAME configuration.`);
      }

      // Generic error
      throw new R2DownloadError(`Failed to generate download URL: ${error.message}`);
    }

    throw new R2DownloadError('Failed to generate download URL: Unknown error');
  }
}

// =============================================================================
// R2 Object Deletion (for cleanup job)
// =============================================================================

/**
 * Delete object from R2 bucket
 *
 * @param r2Key - R2 object key to delete
 * @returns Promise<void>
 * @throws {R2DeleteError} If deletion fails
 */
export async function deleteR2Object(r2Key: string): Promise<void> {
  try {
    const client = getR2Client();

    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: r2Key,
    });

    await client.send(command);
  } catch (error) {
    // Handle specific AWS SDK errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Network errors
      if (errorMessage.includes('network') || errorMessage.includes('enotfound') || errorMessage.includes('econnrefused')) {
        throw new R2DeleteError(`Network error: Unable to connect to R2 for deletion. Please check your internet connection.`);
      }

      // Credentials errors
      if (errorMessage.includes('credentials') || errorMessage.includes('access denied') || errorMessage.includes('InvalidAccessKeyId')) {
        throw new R2DeleteError(`Authentication failed: Invalid R2 credentials. Please check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.`);
      }

      // Permission errors (delete requires write access)
      if (errorMessage.includes('AccessDenied') || errorMessage.includes('permission')) {
        throw new R2DeleteError(`Permission denied: R2 credentials do not have delete permissions. Please check your R2 API token permissions.`);
      }

      // Bucket errors
      if (errorMessage.includes('bucket') || errorMessage.includes('NoSuchBucket')) {
        throw new R2DeleteError(`Bucket error: R2 bucket "${R2_CONFIG.bucketName}" not found. Please check R2_BUCKET_NAME configuration.`);
      }

      // Generic error
      throw new R2DeleteError(`Failed to delete object "${r2Key}": ${error.message}`);
    }

    throw new R2DeleteError(`Failed to delete object "${r2Key}": Unknown error`);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate expiry timestamp for presigned URL
 *
 * @param expirySeconds - Expiry in seconds
 * @returns ISO timestamp
 */
export function calculateExpiryTimestamp(expirySeconds: number = PRESIGNED_URL_EXPIRY): string {
  const expiryDate = new Date(Date.now() + expirySeconds * 1000);
  return expiryDate.toISOString();
}

/**
 * Get file extension from filename
 *
 * @param filename - Original filename
 * @returns File extension (lowercase, without dot)
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// =============================================================================
// Error Classes
// =============================================================================

export class R2ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2ConfigError';
  }
}

export class R2UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2UploadError';
  }
}

export class R2DownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2DownloadError';
  }
}

export class R2DeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2DeleteError';
  }
}

// =============================================================================
// Exports
// =============================================================================

export const R2 = {
  // Client
  getClient: getR2Client,

  // Key generation
  generateKey: generateR2Key,

  // Validation
  validateFileType,
  validateFileSize,
  getFileTypeError,
  getFileSizeError,

  // Presigned URLs
  generateUploadUrl: generatePresignedUploadUrl,
  generateDownloadUrl: generatePresignedDownloadUrl,

  // Deletion
  deleteObject: deleteR2Object,

  // Utilities
  calculateExpiry: calculateExpiryTimestamp,
  getExtension: getFileExtension,

  // Constants
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  PRESIGNED_URL_EXPIRY,
};

export default R2;
