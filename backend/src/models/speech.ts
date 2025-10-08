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
  duration?: number; // minutes (1-600) - Feature 003 legacy
  duration_minutes?: number; // Feature 005 - replaces duration
  description?: string;

  // Feature 005: Smart ordering
  scheduled_time?: string; // ISO timestamp

  // Ordering (Feature 005: nullable for smart ordering)
  display_order: number | null;

  // Audit
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Feature 005: Speech with slides for hierarchical queries
export interface SpeechWithSlides extends Speech {
  slides: any[]; // Will be typed with Slide[] when circular dep resolved
  slide_count: number;
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
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'), // Feature 005: increased to 255
  speaker_name: z
    .string()
    .min(1, 'Speaker name is required') // Feature 005: required
    .max(255, 'Speaker name must be at most 255 characters'), // Feature 005: increased to 255
  duration: durationSchema.optional().nullable(), // Feature 003 legacy
  duration_minutes: z.number().int().min(1).max(480).optional().nullable(), // Feature 005: max 8 hours
  description: z.string().max(1000).optional().nullable(), // Feature 005: max 1000 chars
  scheduled_time: z.string().datetime().optional().nullable(), // Feature 005
  display_order: z
    .number()
    .int()
    .nonnegative('Display order must be non-negative')
    .optional()
    .nullable() // Feature 005: nullable for auto-ordering
    .default(null),
});

export type CreateSpeechInput = z.infer<typeof createSpeechSchema>;

/**
 * Schema for updating an existing speech
 */
export const updateSpeechSchema = z.object({
  title: z.string().min(1).max(255).optional(), // Feature 005: increased to 255
  speaker_name: z.string().max(255).optional(), // Feature 005: increased to 255
  duration: durationSchema.optional().nullable(), // Feature 003 legacy
  duration_minutes: z.number().int().min(1).max(480).optional().nullable(), // Feature 005
  description: z.string().max(1000).optional().nullable(), // Feature 005: max 1000 chars
  scheduled_time: z.string().datetime().optional().nullable(), // Feature 005
  display_order: z.number().int().nonnegative().optional().nullable(), // Feature 005: nullable
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
  const orders = speeches.map((s) => s.display_order ?? 0);
  return Math.max(...orders) + 1;
}

/**
 * Sort speeches by display_order (ascending)
 * Feature 005: Handles nullable display_order
 */
export function sortSpeechesByOrder(speeches: Speech[]): Speech[] {
  return [...speeches].sort((a, b) => {
    const orderA = a.display_order ?? 999999;
    const orderB = b.display_order ?? 999999;
    return orderA - orderB;
  });
}

/**
 * Feature 005: Determine ordering mode (chronological vs manual)
 */
export function getOrderingMode(speeches: Speech[]): 'chronological' | 'manual' {
  const hasManualOrder = speeches.some(s => s.display_order !== null);
  return hasManualOrder ? 'manual' : 'chronological';
}

/**
 * Feature 005: Sort speeches by smart ordering logic
 * - If display_order is set (manual): use display_order
 * - If display_order is null (auto): use scheduled_time chronologically
 */
export function sortSpeechesSmart(speeches: Speech[]): Speech[] {
  return [...speeches].sort((a, b) => {
    const orderA = a.display_order ?? (a.scheduled_time ? new Date(a.scheduled_time).getTime() / 1000 : 999999);
    const orderB = b.display_order ?? (b.scheduled_time ? new Date(b.scheduled_time).getTime() / 1000 : 999999);
    return orderA - orderB;
  });
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
