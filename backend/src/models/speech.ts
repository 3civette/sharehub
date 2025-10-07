/**
 * Speech Model
 * Purpose: Type definitions and validation for speeches table
 * Feature: 003-ora-facciamo-il
 */

import { z } from 'zod';

// =============================================================================
// INTERFACE
// =============================================================================

export interface Speech {
  // Identity
  id: string;
  session_id: string;
  tenant_id: string;

  // Attributes
  title: string;
  speaker_name?: string;
  duration?: number; // minutes (1-600)
  description?: string;

  // Ordering
  display_order: number;

  // Audit
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Duration validation: 1-600 minutes (10 hours max)
 */
const durationSchema = z
  .number()
  .int()
  .min(1, 'Duration must be at least 1 minute')
  .max(600, 'Duration must be at most 600 minutes (10 hours)');

/**
 * Schema for creating a new speech
 */
export const createSpeechSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  title: z.string().min(1, 'Title is required').max(150, 'Title must be at most 150 characters'),
  speaker_name: z
    .string()
    .max(100, 'Speaker name must be at most 100 characters')
    .optional()
    .nullable(),
  duration: durationSchema.optional().nullable(),
  description: z.string().optional().nullable(),
  display_order: z
    .number()
    .int()
    .nonnegative('Display order must be non-negative')
    .default(0),
});

export type CreateSpeechInput = z.infer<typeof createSpeechSchema>;

/**
 * Schema for updating an existing speech
 */
export const updateSpeechSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  speaker_name: z.string().max(100).optional().nullable(),
  duration: durationSchema.optional().nullable(),
  description: z.string().optional().nullable(),
  display_order: z.number().int().nonnegative().optional(),
});

export type UpdateSpeechInput = z.infer<typeof updateSpeechSchema>;

/**
 * Schema for reordering speeches (array of speech IDs in new order)
 */
export const reorderSpeechesSchema = z.object({
  speech_ids: z.array(z.string().uuid()).min(1, 'At least one speech ID required'),
});

export type ReorderSpeechesInput = z.infer<typeof reorderSpeechesSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate display_order uniqueness within a session
 * Note: This is enforced by database constraint, this helper is for client-side validation
 */
export function validateDisplayOrderUnique(
  speeches: Speech[],
  newOrder: number,
  excludeSpeechId?: string
): boolean {
  return !speeches.some(
    (s) => s.display_order === newOrder && s.id !== excludeSpeechId
  );
}

/**
 * Get next available display_order for a session's speeches
 */
export function getNextDisplayOrder(speeches: Speech[]): number {
  if (speeches.length === 0) return 0;
  return Math.max(...speeches.map((s) => s.display_order)) + 1;
}

/**
 * Sort speeches by display_order (ascending)
 */
export function sortSpeechesByOrder(speeches: Speech[]): Speech[] {
  return [...speeches].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Reorder speeches based on new ID order
 * Returns updated speeches with new display_order values
 */
export function reorderSpeeches(
  speeches: Speech[],
  newOrder: string[]
): Partial<Speech>[] {
  return newOrder.map((speechId, index) => ({
    id: speechId,
    display_order: index,
  }));
}

/**
 * Format duration for display (e.g., "45 min", "2h 30min")
 */
export function formatDuration(minutes?: number): string {
  if (!minutes) return 'Duration not specified';

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Validate duration is within acceptable range (1-600 minutes)
 */
export function isValidDuration(minutes: number): boolean {
  return minutes >= 1 && minutes <= 600;
}
