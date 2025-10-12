/**
 * Slide Type Definitions
 * Feature: 008-voglio-implementare-la - Serverless Architecture with R2 Storage
 *
 * Updated slide types to support both legacy Supabase Storage and new R2 storage
 */

// =============================================================================
// Core Slide Type
// =============================================================================

interface Slide {
  // Identity
  id: string;
  speech_id: string;
  session_id?: string; // Optional - for slides linked directly to sessions
  tenant_id: string;

  // File attributes
  filename: string;
  file_size: number; // Size in bytes (max 1GB = 1073741824)
  mime_type: string;

  // Storage location (mutually exclusive)
  storage_path?: string | null; // Legacy: Supabase Storage path
  r2_key?: string | null; // New: Cloudflare R2 object key

  // Ordering
  display_order?: number;

  // Audit
  uploaded_by?: string | null;
  uploaded_at: string; // ISO timestamp
  deleted_at?: string | null; // ISO timestamp (soft delete)

  // Metadata
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// Input Types for API
// =============================================================================

/**
 * Input for requesting presigned upload URL
 */
interface SlideUploadRequest {
  speech_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
}

/**
 * Response from presigned upload URL generation
 */
interface SlideUploadResponse {
  upload_url: string; // Presigned R2 URL (valid 1 hour)
  slide_id: string; // UUID of created metadata record
  r2_key: string; // R2 object key
  expires_at: string; // ISO timestamp when URL expires
}

/**
 * Response from presigned download URL generation
 */
interface SlideDownloadResponse {
  download_url: string; // Presigned R2 URL (valid 1 hour)
  filename: string;
  file_size: number;
  mime_type: string;
  expires_at: string; // ISO timestamp when URL expires
}

// =============================================================================
// Metadata Type
// =============================================================================

/**
 * Slide metadata without download URL
 * Used for listing slides
 */
interface SlideMetadata {
  id: string;
  session_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  deleted_at: string | null;
  r2_key: string | null;
}

// =============================================================================
// Enhanced View Type (from database view)
// =============================================================================

/**
 * Slide with joined metadata from speeches/sessions/events
 * Matches slides_with_metadata database view
 */
interface SlideWithMetadata extends Slide {
  speech_title?: string | null;
  speaker_name?: string | null;
  session_title?: string | null;
  event_name?: string | null;
  storage_type?: 'r2' | 'supabase' | 'unknown';
  file_status?: 'active' | 'expiring_soon' | 'deleted';
}

// =============================================================================
// Cleanup Types
// =============================================================================

/**
 * Response from cleanup job
 */
interface CleanupResponse {
  deleted_count: number;
  processed_count: number;
  errors: CleanupError[];
  execution_time_ms: number;
  next_run: string; // ISO timestamp
}

/**
 * Error details from cleanup job
 */
interface CleanupError {
  slide_id: string;
  r2_key: string;
  error: string;
}

// =============================================================================
// Validation Constants
// =============================================================================

const SLIDE_CONSTANTS = {
  // File size limits
  MAX_FILE_SIZE: 1073741824, // 1GB in bytes
  MAX_FILE_SIZE_MB: 1024,

  // Retention
  RETENTION_HOURS: 48,

  // Allowed MIME types
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
  ] as const,

  // Presigned URL expiry
  PRESIGNED_URL_EXPIRY_SECONDS: 3600, // 1 hour
} as const;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if slide uses R2 storage
 */
function isR2Slide(slide: Slide): boolean {
  return slide.r2_key !== null && slide.r2_key !== undefined;
}

/**
 * Check if slide uses legacy Supabase storage
 */
function isLegacySlide(slide: Slide): boolean {
  return slide.storage_path !== null && slide.storage_path !== undefined;
}

/**
 * Check if slide is soft-deleted
 */
function isDeletedSlide(slide: Slide): boolean {
  return slide.deleted_at !== null && slide.deleted_at !== undefined;
}

/**
 * Check if slide is active (not deleted)
 */
function isActiveSlide(slide: Slide): boolean {
  return !isDeletedSlide(slide);
}

/**
 * Check if slide is eligible for cleanup (older than 48 hours)
 */
function isExpiredSlide(slide: Slide): boolean {
  if (!isActiveSlide(slide) || !isR2Slide(slide)) {
    return false;
  }

  const uploadedAt = new Date(slide.uploaded_at).getTime();
  const expiryTime = uploadedAt + SLIDE_CONSTANTS.RETENTION_HOURS * 60 * 60 * 1000;
  return Date.now() > expiryTime;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get human-readable file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Get storage type display name
 */
function getStorageType(slide: Slide): 'R2' | 'Supabase Storage' | 'Unknown' {
  if (isR2Slide(slide)) return 'R2';
  if (isLegacySlide(slide)) return 'Supabase Storage';
  return 'Unknown';
}

/**
 * Get time until slide expires
 */
function getTimeUntilExpiry(slide: Slide): number {
  const uploadedAt = new Date(slide.uploaded_at).getTime();
  const expiryTime = uploadedAt + SLIDE_CONSTANTS.RETENTION_HOURS * 60 * 60 * 1000;
  return Math.max(0, expiryTime - Date.now());
}

/**
 * Format time remaining until expiry
 */
function formatTimeUntilExpiry(slide: Slide): string {
  const ms = getTimeUntilExpiry(slide);
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

// =============================================================================
// Exports
// =============================================================================

export type {
  Slide,
  SlideUploadRequest,
  SlideUploadResponse,
  SlideDownloadResponse,
  SlideMetadata,
  SlideWithMetadata,
  CleanupResponse,
  CleanupError,
};

export {
  SLIDE_CONSTANTS,
  isR2Slide,
  isLegacySlide,
  isDeletedSlide,
  isActiveSlide,
  isExpiredSlide,
  formatFileSize,
  getStorageType,
  getTimeUntilExpiry,
  formatTimeUntilExpiry,
};
