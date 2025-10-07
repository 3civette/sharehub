/**
 * Slide Model
 * Purpose: Type definitions and validation for slides table
 * Feature: 003-ora-facciamo-il
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum file size: 100MB in bytes
 */
export const MAX_FILE_SIZE = 104857600; // 100 * 1024 * 1024

/**
 * Allowed MIME types for slide uploads
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.apple.keynote', // .key
  'application/vnd.oasis.opendocument.presentation', // .odp
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

/**
 * File extension to MIME type mapping
 */
export const FILE_EXTENSION_MAP: Record<string, AllowedMimeType> = {
  '.pdf': 'application/pdf',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.key': 'application/vnd.apple.keynote',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
};

// =============================================================================
// INTERFACE
// =============================================================================

export interface Slide {
  // Identity
  id: string;
  speech_id: string;
  tenant_id: string;

  // File attributes
  filename: string;
  storage_path: string; // Unique path in Supabase Storage
  file_size: number; // bytes
  mime_type: AllowedMimeType;

  // Ordering
  display_order: number;

  // Audit
  uploaded_by?: string; // Format: "organizer:{token_id}" or "admin:{admin_id}"
  uploaded_at: string; // ISO timestamp
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Filename validation: alphanumeric with allowed special chars
 */
const filenameSchema = z
  .string()
  .min(1, 'Filename is required')
  .max(255, 'Filename must be at most 255 characters')
  .regex(
    /^[a-zA-Z0-9_\-. ()]+\.(pdf|ppt|pptx|key|odp)$/,
    'Filename must be alphanumeric with allowed extensions: .pdf, .ppt, .pptx, .key, .odp'
  );

/**
 * File size validation: 1 byte to 100MB
 */
const fileSizeSchema = z
  .number()
  .int()
  .min(1, 'File size must be greater than 0')
  .max(MAX_FILE_SIZE, `File size must be at most ${MAX_FILE_SIZE / 1024 / 1024}MB`);

/**
 * Schema for creating a new slide
 */
export const createSlideSchema = z.object({
  speech_id: z.string().uuid('Invalid speech ID'),
  filename: filenameSchema,
  storage_path: z.string().min(1, 'Storage path is required'),
  file_size: fileSizeSchema,
  mime_type: z.enum([...ALLOWED_MIME_TYPES] as [string, ...string[]])
    .describe(`MIME type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`),
  display_order: z
    .number()
    .int()
    .nonnegative('Display order must be non-negative')
    .default(0),
  uploaded_by: z.string().optional(),
});

export type CreateSlideInput = z.infer<typeof createSlideSchema>;

/**
 * Schema for updating an existing slide (only display_order can be updated)
 */
export const updateSlideSchema = z.object({
  display_order: z.number().int().nonnegative().optional(),
});

export type UpdateSlideInput = z.infer<typeof updateSlideSchema>;

/**
 * Schema for reordering slides (array of slide IDs in new order)
 */
export const reorderSlidesSchema = z.object({
  slide_ids: z.array(z.string().uuid()).min(1, 'At least one slide ID required'),
});

export type ReorderSlidesInput = z.infer<typeof reorderSlidesSchema>;

/**
 * Schema for file upload validation (client-side)
 */
export const uploadFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'File is empty')
    .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be at most ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    .refine(
      (file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return Object.keys(FILE_EXTENSION_MAP).includes(ext);
      },
      'File must be .pdf, .ppt, .pptx, .key, or .odp'
    ),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate display_order uniqueness within a speech
 * Note: This is enforced by database constraint, this helper is for client-side validation
 */
export function validateDisplayOrderUnique(
  slides: Slide[],
  newOrder: number,
  excludeSlideId?: string
): boolean {
  return !slides.some(
    (s) => s.display_order === newOrder && s.id !== excludeSlideId
  );
}

/**
 * Get next available display_order for a speech's slides
 */
export function getNextDisplayOrder(slides: Slide[]): number {
  if (slides.length === 0) return 0;
  return Math.max(...slides.map((s) => s.display_order)) + 1;
}

/**
 * Sort slides by display_order (ascending)
 */
export function sortSlidesByOrder(slides: Slide[]): Slide[] {
  return [...slides].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Reorder slides based on new ID order
 * Returns updated slides with new display_order values
 */
export function reorderSlides(
  slides: Slide[],
  newOrder: string[]
): Partial<Slide>[] {
  return newOrder.map((slideId, index) => ({
    id: slideId,
    display_order: index,
  }));
}

/**
 * Generate storage path for Supabase Storage
 * Format: slides/{tenant_id}/{event_id}/{speech_id}/{filename}
 */
export function generateStoragePath(
  tenantId: string,
  eventId: string,
  speechId: string,
  filename: string
): string {
  // Sanitize filename to avoid path traversal
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_\-. ()]/g, '_');
  return `slides/${tenantId}/${eventId}/${speechId}/${sanitizedFilename}`;
}

/**
 * Format file size for display (e.g., "1.5 MB", "250 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1);
    return `${kb} KB`;
  }

  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${mb} MB`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
}

/**
 * Get MIME type from filename
 */
export function getMimeTypeFromFilename(filename: string): AllowedMimeType | null {
  const ext = getFileExtension(filename);
  return FILE_EXTENSION_MAP[ext] || null;
}

/**
 * Validate file is an allowed type
 */
export function isAllowedFileType(filename: string): boolean {
  const ext = getFileExtension(filename);
  return Object.keys(FILE_EXTENSION_MAP).includes(ext);
}

/**
 * Parse uploaded_by string to get actor type and ID
 */
export function parseUploadedBy(uploadedBy?: string): {
  actorType: 'organizer' | 'admin' | 'unknown';
  actorId?: string;
} {
  if (!uploadedBy) return { actorType: 'unknown' };

  const [type, id] = uploadedBy.split(':');
  if (type === 'organizer' || type === 'admin') {
    return { actorType: type, actorId: id };
  }

  return { actorType: 'unknown' };
}

/**
 * Format uploaded_by string
 */
export function formatUploadedBy(actorType: 'organizer' | 'admin', actorId: string): string {
  return `${actorType}:${actorId}`;
}
