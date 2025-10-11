/**
 * ActivityLog Model
 * Purpose: Type definitions and validation for activity_logs table
 * Feature: 003-ora-facciamo-il
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

export const ActorType = {
  ORGANIZER: 'organizer',
  PARTICIPANT: 'participant',
  ANONYMOUS: 'anonymous',
  ADMIN: 'admin',
} as const;

export type ActorType = typeof ActorType[keyof typeof ActorType];

export const ActionType = {
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  VIEW: 'view',
  EDIT: 'edit',
  DELETE: 'delete',
} as const;

export type ActionType = typeof ActionType[keyof typeof ActionType];

// =============================================================================
// INTERFACE
// =============================================================================

export interface ActivityLog {
  // Identity
  id: string;
  event_id: string;
  tenant_id: string;

  // Event details
  timestamp: string; // ISO timestamp
  actor_type: ActorType;
  action_type: ActionType;

  // File context (nullable - deleted items set to NULL)
  filename?: string;
  file_size?: number; // bytes
  slide_id?: string;
  speech_id?: string;
  session_id?: string;

  // Retention configuration
  retention_days: number; // -1 for indefinite, or 30/90/365

  // Additional metadata
  metadata?: Record<string, any>; // JSONB field
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Retention days validation: -1 (indefinite) or positive number
 */
const retentionDaysSchema = z
  .number()
  .int()
  .refine(
    (val) => val === -1 || val > 0,
    'Retention days must be -1 (indefinite) or a positive number'
  );

/**
 * Schema for creating a new activity log
 */
export const createActivityLogSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  tenant_id: z.string().uuid('Invalid tenant ID'),
  actor_type: z.enum([
    ActorType.ORGANIZER,
    ActorType.PARTICIPANT,
    ActorType.ANONYMOUS,
    ActorType.ADMIN,
  ]),
  action_type: z.enum([
    ActionType.UPLOAD,
    ActionType.DOWNLOAD,
    ActionType.VIEW,
    ActionType.EDIT,
    ActionType.DELETE,
  ]),
  filename: z.string().max(255).optional(),
  file_size: z.number().int().positive().optional(),
  slide_id: z.string().uuid().optional(),
  speech_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  retention_days: retentionDaysSchema.default(90),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateActivityLogInput = z.infer<typeof createActivityLogSchema>;

/**
 * Schema for activity log filters
 */
export const activityLogFiltersSchema = z.object({
  event_id: z.string().uuid().optional(),
  actor_type: z
    .enum([ActorType.ORGANIZER, ActorType.PARTICIPANT, ActorType.ANONYMOUS, ActorType.ADMIN])
    .optional(),
  action_type: z
    .enum([ActionType.UPLOAD, ActionType.DOWNLOAD, ActionType.VIEW, ActionType.EDIT, ActionType.DELETE])
    .optional(),
  slide_id: z.string().uuid().optional(),
  speech_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type ActivityLogFilters = z.infer<typeof activityLogFiltersSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if log has expired based on retention policy
 */
export function isLogExpired(log: ActivityLog): boolean {
  // Indefinite retention
  if (log.retention_days === -1) {
    return false;
  }

  const logDate = new Date(log.timestamp);
  const expirationDate = new Date(logDate);
  expirationDate.setDate(logDate.getDate() + log.retention_days);

  const now = new Date();
  return now > expirationDate;
}

/**
 * Get expiration date for a log
 */
export function getLogExpirationDate(log: ActivityLog): Date | null {
  if (log.retention_days === -1) {
    return null; // Indefinite
  }

  const logDate = new Date(log.timestamp);
  const expirationDate = new Date(logDate);
  expirationDate.setDate(logDate.getDate() + log.retention_days);

  return expirationDate;
}

/**
 * Format retention policy for display
 */
export function formatRetentionPolicy(retentionDays: number): string {
  if (retentionDays === -1) {
    return 'Indefinite';
  }

  if (retentionDays === 30) {
    return '30 days';
  }

  if (retentionDays === 90) {
    return '90 days';
  }

  if (retentionDays === 365) {
    return '1 year';
  }

  return `${retentionDays} days`;
}

/**
 * Get context breadcrumb for log (e.g., "Session > Speech > Slide")
 */
export function getContextBreadcrumb(log: ActivityLog): string {
  const parts: string[] = [];

  if (log.session_id) parts.push('Session');
  if (log.speech_id) parts.push('Speech');
  if (log.slide_id) parts.push('Slide');

  return parts.length > 0 ? parts.join(' > ') : 'Event';
}

/**
 * Get action display label with icon
 */
export function getActionLabel(actionType: ActionType): {
  label: string;
  icon: string;
} {
  const labels = {
    [ActionType.UPLOAD]: { label: 'Uploaded', icon: '⬆️' },
    [ActionType.DOWNLOAD]: { label: 'Downloaded', icon: '⬇️' },
    [ActionType.VIEW]: { label: 'Viewed', icon: '👁️' },
    [ActionType.EDIT]: { label: 'Edited', icon: '✏️' },
    [ActionType.DELETE]: { label: 'Deleted', icon: '🗑️' },
  };

  return labels[actionType];
}

/**
 * Get actor display label
 */
export function getActorLabel(actorType: ActorType): string {
  const labels = {
    [ActorType.ORGANIZER]: 'Organizer',
    [ActorType.PARTICIPANT]: 'Participant',
    [ActorType.ANONYMOUS]: 'Anonymous User',
    [ActorType.ADMIN]: 'Admin',
  };

  return labels[actorType];
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';

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
 * Format timestamp for display (relative or absolute)
 */
export function formatLogTimestamp(timestamp: string, relative: boolean = true): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (relative && diffMinutes < 60) {
    if (diffMinutes < 1) return 'Just now';
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }

  if (relative && diffMinutes < 60 * 24) {
    const hours = Math.floor(diffMinutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  if (relative && diffMinutes < 60 * 24 * 7) {
    const days = Math.floor(diffMinutes / (60 * 24));
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  // Absolute format
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Group logs by date (for timeline display)
 */
export function groupLogsByDate(logs: ActivityLog[]): Record<string, ActivityLog[]> {
  const grouped: Record<string, ActivityLog[]> = {};

  logs.forEach((log) => {
    const date = new Date(log.timestamp);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(log);
  });

  return grouped;
}

/**
 * Sort logs by timestamp (descending - most recent first)
 */
export function sortLogsByTimestamp(logs: ActivityLog[]): ActivityLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Filter logs by date range
 */
export function filterLogsByDateRange(
  logs: ActivityLog[],
  startDate?: string,
  endDate?: string
): ActivityLog[] {
  return logs.filter((log) => {
    const logDate = new Date(log.timestamp);

    if (startDate && logDate < new Date(startDate)) {
      return false;
    }

    if (endDate && logDate > new Date(endDate)) {
      return false;
    }

    return true;
  });
}
