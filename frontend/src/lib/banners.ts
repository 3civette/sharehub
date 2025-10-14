/**
 * Banner Validation Utilities
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 *
 * Provides validation helpers for banner file uploads
 * - File size validation (max 5MB)
 * - MIME type validation (JPEG, PNG, WebP only)
 * - Slot number validation (1-5)
 * - Click URL validation
 */

// =============================================================================
// Constants
// =============================================================================

export const BANNER_CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MIN_SLOT: 1,
  MAX_SLOT: 5,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp'] as const,
} as const;

export type AllowedBannerMimeType = typeof BANNER_CONSTANTS.ALLOWED_MIME_TYPES[number];

// =============================================================================
// Slot Configuration
// =============================================================================

export interface BannerSlotConfig {
  slotNumber: number;
  width: number;
  height: number;
  position: 'header' | 'sidebar' | 'footer' | 'content';
  description: string;
}

/**
 * Banner slot configurations with predefined dimensions
 * Each slot has unique positioning and dimensions for optimal ad placement
 */
export const BANNER_SLOTS: Record<number, BannerSlotConfig> = {
  1: {
    slotNumber: 1,
    width: 728,
    height: 90,
    position: 'header',
    description: 'Leaderboard - Top header banner',
  },
  2: {
    slotNumber: 2,
    width: 300,
    height: 250,
    position: 'sidebar',
    description: 'Medium Rectangle - Right sidebar',
  },
  3: {
    slotNumber: 3,
    width: 160,
    height: 600,
    position: 'sidebar',
    description: 'Wide Skyscraper - Left sidebar',
  },
  4: {
    slotNumber: 4,
    width: 468,
    height: 60,
    position: 'content',
    description: 'Banner - In-content placement',
  },
  5: {
    slotNumber: 5,
    width: 320,
    height: 50,
    position: 'footer',
    description: 'Mobile Banner - Footer',
  },
};

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate file size is within allowed limit
 */
export function validateFileSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= BANNER_CONSTANTS.MAX_FILE_SIZE;
}

/**
 * Validate MIME type is allowed
 */
export function validateMimeType(mimeType: string): mimeType is AllowedBannerMimeType {
  return BANNER_CONSTANTS.ALLOWED_MIME_TYPES.includes(mimeType as any);
}

/**
 * Validate slot number is within valid range
 */
export function validateSlotNumber(slotNumber: number): boolean {
  return (
    Number.isInteger(slotNumber) &&
    slotNumber >= BANNER_CONSTANTS.MIN_SLOT &&
    slotNumber <= BANNER_CONSTANTS.MAX_SLOT
  );
}

/**
 * Validate click URL format (optional field)
 */
export function validateClickUrl(url: string | null | undefined): boolean {
  if (!url) return true; // null/undefined is valid (optional field)

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate file extension matches MIME type
 */
export function validateFileExtension(filename: string, mimeType: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return false;

  const mimeToExt: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
  };

  const allowedExtensions = mimeToExt[mimeType];
  return allowedExtensions ? allowedExtensions.includes(extension) : false;
}

// =============================================================================
// Error Message Generators
// =============================================================================

export function getFileSizeError(sizeInBytes: number): string {
  const sizeMB = (sizeInBytes / 1024 / 1024).toFixed(2);
  const maxMB = (BANNER_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
  return `File size ${sizeMB}MB exceeds maximum allowed size of ${maxMB}MB`;
}

export function getMimeTypeError(mimeType: string): string {
  const allowed = BANNER_CONSTANTS.ALLOWED_MIME_TYPES.join(', ');
  return `File type '${mimeType}' is not allowed. Allowed types: ${allowed}`;
}

export function getSlotNumberError(slotNumber: number): string {
  return `Invalid slot number ${slotNumber}. Must be between ${BANNER_CONSTANTS.MIN_SLOT} and ${BANNER_CONSTANTS.MAX_SLOT}`;
}

export function getClickUrlError(url: string): string {
  return `Invalid URL format '${url}'. URL must start with http:// or https://`;
}

// =============================================================================
// Storage Path Generators
// =============================================================================

/**
 * Generate Supabase Storage path for banner file
 * Format: tenant-{tenant_id}/event-{event_id}/banner-{banner_id}-slot-{slot}.{ext}
 */
export function generateBannerStoragePath(
  tenantId: string,
  eventId: string,
  bannerId: string,
  slotNumber: number,
  filename: string
): string {
  const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
  return `tenant-${tenantId}/event-${eventId}/banner-${bannerId}-slot-${slotNumber}.${extension}`;
}

/**
 * Generate public-accessible banner filename for download
 */
export function generateBannerFilename(slotNumber: number, originalFilename: string): string {
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  const slot = BANNER_SLOTS[slotNumber];
  const sanitizedDescription = slot.description.toLowerCase().replace(/\s+/g, '-');
  return `banner-slot-${slotNumber}-${sanitizedDescription}.${extension}`;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isValidBannerSlot(slot: number): slot is 1 | 2 | 3 | 4 | 5 {
  return validateSlotNumber(slot);
}

// =============================================================================
// Exports
// =============================================================================

export const BannerValidation = {
  validateFileSize,
  validateMimeType,
  validateSlotNumber,
  validateClickUrl,
  validateFileExtension,
  getFileSizeError,
  getMimeTypeError,
  getSlotNumberError,
  getClickUrlError,
  generateBannerStoragePath,
  generateBannerFilename,
  isValidBannerSlot,
  CONSTANTS: BANNER_CONSTANTS,
  SLOTS: BANNER_SLOTS,
};

export default BannerValidation;
