/**
 * Event Model
 * Purpose: Type definitions and validation for events table
 * Feature: 003-ora-facciamo-il
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

export const EventVisibility = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

export type EventVisibility = typeof EventVisibility[keyof typeof EventVisibility];

export const EventStatus = {
  UPCOMING: 'upcoming',
  PAST: 'past',
  ARCHIVED: 'archived',
} as const;

export type EventStatus = typeof EventStatus[keyof typeof EventStatus];

export const RetentionPolicy = {
  KEEP_FOREVER: 'keep_forever',
  ARCHIVE_1YEAR: 'archive_1year',
  DELETE_2YEARS: 'delete_2years',
} as const;

export type RetentionPolicy = typeof RetentionPolicy[keyof typeof RetentionPolicy];

// =============================================================================
// INTERFACE
// =============================================================================

export interface Event {
  // Identity
  id: string;
  tenant_id: string;
  slug: string;

  // Core attributes
  name: string;
  date: string; // ISO date format (YYYY-MM-DD)
  description?: string;

  // Visibility & Status
  visibility: EventVisibility;
  status: EventStatus;

  // Token configuration (for private events)
  token_expiration_date?: string; // ISO timestamp

  // Data retention
  retention_policy: RetentionPolicy;

  // Audit
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  created_by?: string; // admin ID
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Slug validation: lowercase alphanumeric with hyphens
 */
const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
  .min(3, 'Slug must be at least 3 characters')
  .max(100, 'Slug must be at most 100 characters');

/**
 * Date validation: ISO date format, not before 2020-01-01
 */
const eventDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (date) => {
      const d = new Date(date);
      return d >= new Date('2020-01-01');
    },
    { message: 'Date must be on or after 2020-01-01' }
  );

/**
 * Schema for creating a new event
 */
export const createEventSchema = z
  .object({
    slug: slugSchema,
    name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
    date: eventDateSchema,
    description: z.string().optional(),
    visibility: z.enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE]),
    token_expiration_date: z.string().datetime().optional(),
    retention_policy: z
      .enum([
        RetentionPolicy.KEEP_FOREVER,
        RetentionPolicy.ARCHIVE_1YEAR,
        RetentionPolicy.DELETE_2YEARS,
      ])
      .default(RetentionPolicy.KEEP_FOREVER),
    created_by: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      // Private events MUST have token_expiration_date
      if (data.visibility === EventVisibility.PRIVATE) {
        return !!data.token_expiration_date;
      }
      // Public events MUST NOT have token_expiration_date
      return !data.token_expiration_date;
    },
    {
      message: 'Private events require token_expiration_date, public events must not have it',
      path: ['token_expiration_date'],
    }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Schema for updating an existing event
 */
export const updateEventSchema = z
  .object({
    slug: slugSchema.optional(),
    name: z.string().min(1).max(200).optional(),
    date: eventDateSchema.optional(),
    description: z.string().optional(),
    visibility: z.enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE]).optional(),
    token_expiration_date: z.string().datetime().optional(),
    retention_policy: z
      .enum([
        RetentionPolicy.KEEP_FOREVER,
        RetentionPolicy.ARCHIVE_1YEAR,
        RetentionPolicy.DELETE_2YEARS,
      ])
      .optional(),
    status: z.enum([EventStatus.UPCOMING, EventStatus.PAST, EventStatus.ARCHIVED]).optional(),
  })
  .refine(
    (data) => {
      // If visibility is being updated to private, token_expiration_date required
      if (data.visibility === EventVisibility.PRIVATE && !data.token_expiration_date) {
        return false;
      }
      return true;
    },
    {
      message: 'Private events require token_expiration_date',
      path: ['token_expiration_date'],
    }
  );

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Schema for event list filters
 */
export const eventFiltersSchema = z.object({
  status: z.enum([EventStatus.UPCOMING, EventStatus.PAST, EventStatus.ARCHIVED]).optional(),
  visibility: z.enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE]).optional(),
  search: z.string().optional(), // Search by name or slug
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type EventFilters = z.infer<typeof eventFiltersSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if event is past based on date
 */
export function isEventPast(event: Event): boolean {
  const eventDate = new Date(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Compare dates only, ignore time
  return eventDate < today;
}

/**
 * Check if event is archived based on date and retention policy
 */
export function shouldEventBeArchived(event: Event): boolean {
  const eventDate = new Date(event.date);
  const today = new Date();

  if (event.retention_policy === RetentionPolicy.ARCHIVE_1YEAR) {
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    return eventDate < oneYearAgo;
  }

  return false;
}

/**
 * Check if event should be deleted based on date and retention policy
 */
export function shouldEventBeDeleted(event: Event): boolean {
  const eventDate = new Date(event.date);
  const today = new Date();

  if (event.retention_policy === RetentionPolicy.DELETE_2YEARS) {
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);
    return eventDate < twoYearsAgo;
  }

  return false;
}

/**
 * Generate slug from event name (basic implementation)
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Trim hyphens from start/end
}
