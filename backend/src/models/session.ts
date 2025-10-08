/**
 * Session Model
 * Purpose: Type definitions and validation for sessions table
 * Feature: 003-ora-facciamo-il
 */

import { z } from 'zod';

// =============================================================================
// INTERFACE
// =============================================================================

export interface Session {
  // Identity
  id: string;
  event_id: string;
  tenant_id: string;

  // Attributes
  title: string;
  description?: string;
  start_time?: string; // ISO timestamp

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
 * Schema for creating a new session
 */
export const createSessionSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .nullable(),
  start_time: z.string().datetime().optional().nullable(),
  display_order: z
    .number()
    .int()
    .nonnegative('Display order must be non-negative')
    .optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

/**
 * Schema for updating an existing session
 */
export const updateSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  display_order: z.number().int().nonnegative().optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

/**
 * Schema for reordering sessions (array of session IDs in new order)
 */
export const reorderSessionsSchema = z.object({
  session_ids: z.array(z.string().uuid()).min(1, 'At least one session ID required'),
});

export type ReorderSessionsInput = z.infer<typeof reorderSessionsSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate display_order uniqueness within an event
 * Note: This is enforced by database constraint, this helper is for client-side validation
 */
export function validateDisplayOrderUnique(
  sessions: Session[],
  newOrder: number,
  excludeSessionId?: string
): boolean {
  return !sessions.some(
    (s) => s.display_order === newOrder && s.id !== excludeSessionId
  );
}

/**
 * Get next available display_order for an event's sessions
 */
export function getNextDisplayOrder(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  return Math.max(...sessions.map((s) => s.display_order)) + 1;
}

/**
 * Sort sessions by display_order (ascending)
 */
export function sortSessionsByOrder(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Reorder sessions based on new ID order
 * Returns updated sessions with new display_order values
 */
export function reorderSessions(
  sessions: Session[],
  newOrder: string[]
): Partial<Session>[] {
  return newOrder.map((sessionId, index) => ({
    id: sessionId,
    display_order: index,
  }));
}
