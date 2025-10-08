/**
 * EventPhoto Model
 * Feature: 005-ora-bisogna-implementare
 * Purpose: Type definitions and validation for event photos
 */

export interface EventPhoto {
  id: string;
  event_id: string;
  tenant_id: string;
  storage_path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  is_cover: boolean;
  display_order: number;
  uploaded_at: string;
  uploaded_by: string | null;
}

export interface EventPhotoCreateInput {
  event_id: string;
  tenant_id: string;
  storage_path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  is_cover?: boolean;
  display_order?: number;
  uploaded_by?: string;
}

export interface EventPhotoUpdateInput {
  is_cover?: boolean;
  display_order?: number;
}

/**
 * Validation functions
 */
export const validateEventPhoto = {
  /**
   * Validate storage path format
   * Expected: event-photos/{tenantId}/{eventId}/{timestamp}-{filename}
   */
  storagePath: (path: string): boolean => {
    const regex = /^event-photos\/[a-f0-9-]+\/[a-f0-9-]+\/\d+-[\w.-]+$/i;
    return regex.test(path);
  },

  /**
   * Validate file size (max 50MB)
   */
  fileSize: (size: number): boolean => {
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    return size > 0 && size <= MAX_SIZE;
  },

  /**
   * Validate mime type
   */
  mimeType: (type: string): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    return allowedTypes.includes(type);
  },

  /**
   * Validate filename
   */
  filename: (name: string): boolean => {
    return name.length > 0 && name.length <= 255;
  },

  /**
   * Validate display order
   */
  displayOrder: (order: number): boolean => {
    return Number.isInteger(order) && order >= 0;
  }
};

/**
 * Helper to validate complete photo input
 */
export const validatePhotoInput = (input: EventPhotoCreateInput): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!validateEventPhoto.storagePath(input.storage_path)) {
    errors.push('Invalid storage path format');
  }

  if (!validateEventPhoto.fileSize(input.file_size)) {
    errors.push('File size must be between 1 byte and 50MB');
  }

  if (!validateEventPhoto.mimeType(input.mime_type)) {
    errors.push('Invalid file type. Allowed: JPEG, PNG, WebP');
  }

  if (!validateEventPhoto.filename(input.filename)) {
    errors.push('Filename must be between 1 and 255 characters');
  }

  if (input.display_order !== undefined && !validateEventPhoto.displayOrder(input.display_order)) {
    errors.push('Display order must be a non-negative integer');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
