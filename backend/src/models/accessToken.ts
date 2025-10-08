/**
 * AccessToken Model
 * Purpose: Type definitions and validation for access_tokens table
 * Feature: 003-ora-facciamo-il
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

export const TokenType = {
  ORGANIZER: 'organizer',
  PARTICIPANT: 'participant',
} as const;

export type TokenType = typeof TokenType[keyof typeof TokenType];

// =============================================================================
// INTERFACE
// =============================================================================

export interface AccessToken {
  // Identity
  id: string;
  event_id: string;

  // Token attributes
  token: string; // 21-character nanoid
  type: TokenType;
  expires_at: string; // ISO timestamp

  // Usage tracking
  created_at: string; // ISO timestamp
  last_used_at?: string; // ISO timestamp
  use_count: number;

  // Feature 005: QR Code and revocation
  qr_code_data_url?: string; // PNG data URL
  revoked_at?: string; // ISO timestamp
  revoked_by?: string; // Admin UUID
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Token validation: exactly 21 characters (nanoid format)
 */
const tokenSchema = z
  .string()
  .length(21, 'Token must be exactly 21 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'Token must be alphanumeric with hyphens/underscores');

/**
 * Schema for creating a new access token
 */
export const createAccessTokenSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  token: tokenSchema,
  type: z.enum([TokenType.ORGANIZER, TokenType.PARTICIPANT]),
  expires_at: z.string().datetime(),
});

export type CreateAccessTokenInput = z.infer<typeof createAccessTokenSchema>;

/**
 * Schema for validating a token
 */
export const validateTokenSchema = z.object({
  token: tokenSchema,
  event_id: z.string().uuid('Invalid event ID').optional(),
});

export type ValidateTokenInput = z.infer<typeof validateTokenSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if token is expired
 */
export function isTokenExpired(token: AccessToken): boolean {
  const now = new Date();
  const expiresAt = new Date(token.expires_at);
  return expiresAt <= now;
}

/**
 * Check if token is valid (not expired)
 */
export function isTokenValid(token: AccessToken): boolean {
  return !isTokenExpired(token);
}

/**
 * Get time remaining until token expiration
 * Returns object with days, hours, minutes
 */
export function getTimeUntilExpiration(token: AccessToken): {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
} {
  const now = new Date();
  const expiresAt = new Date(token.expires_at);
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, totalMinutes: 0 };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { expired: false, days, hours, minutes, totalMinutes };
}

/**
 * Format expiration time for display
 * e.g., "2 days", "3 hours", "45 minutes", "Expired"
 */
export function formatExpirationTime(token: AccessToken): string {
  const { expired, days, hours, minutes } = getTimeUntilExpiration(token);

  if (expired) {
    return 'Expired';
  }

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Check if token has organizer permissions
 */
export function hasOrganizerPermissions(token: AccessToken): boolean {
  return token.type === TokenType.ORGANIZER;
}

/**
 * Check if token has participant permissions (read-only)
 */
export function hasParticipantPermissions(token: AccessToken): boolean {
  return token.type === TokenType.PARTICIPANT;
}

/**
 * Get permission level for display
 */
export function getPermissionLabel(token: AccessToken): string {
  return token.type === TokenType.ORGANIZER ? 'Full Access (Organizer)' : 'Read-Only (Participant)';
}

/**
 * Calculate expiration date from now + duration
 * @param durationDays Number of days until expiration
 */
export function calculateExpirationDate(durationDays: number): Date {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(now.getDate() + durationDays);
  return expiresAt;
}

/**
 * Validate token format (21-char nanoid)
 */
export function isValidTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{21}$/.test(token);
}

/**
 * Increment use count (for tracking purposes)
 * Note: This is done in the database, this is just for type reference
 */
export interface TokenUsageUpdate {
  last_used_at: string;
  use_count: number;
}

/**
 * Create token usage update object
 */
export function createTokenUsageUpdate(currentUseCount: number): TokenUsageUpdate {
  return {
    last_used_at: new Date().toISOString(),
    use_count: currentUseCount + 1,
  };
}
