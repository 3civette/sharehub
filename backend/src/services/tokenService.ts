/**
 * Token Service
 * Purpose: Token generation, validation, and usage tracking
 * Feature: 003-ora-facciamo-il
 */

import { nanoid } from 'nanoid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AccessToken } from '../models/accessToken';
import { isTokenValid, isTokenExpired } from '../models/accessToken';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class TokenService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate a unique 21-character token using nanoid
   * @returns 21-character alphanumeric string
   */
  generateToken(): string {
    return nanoid(21);
  }

  /**
   * Validate token and check expiration
   * @param token - Token string to validate
   * @param eventId - Optional event ID to verify token belongs to event
   * @returns Token data if valid, null if invalid/expired
   */
  async validateToken(
    token: string,
    eventId?: string
  ): Promise<{
    valid: boolean;
    token?: AccessToken;
    error?: string;
  }> {
    try {
      // Query token from database
      let query = this.supabase
        .from('access_tokens')
        .select('*')
        .eq('token', token);

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return {
          valid: false,
          error: 'Token not found',
        };
      }

      const accessToken = data as AccessToken;

      // Check expiration
      if (isTokenExpired(accessToken)) {
        return {
          valid: false,
          error: 'Token has expired',
        };
      }

      return {
        valid: true,
        token: accessToken,
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Token validation failed',
      };
    }
  }

  /**
   * Update last_used_at and increment use_count for a token
   * @param tokenId - Token UUID
   * @returns Success boolean
   */
  async updateLastUsed(tokenId: string): Promise<boolean> {
    try {
      // First get current use_count
      const { data: current } = await this.supabase
        .from('access_tokens')
        .select('use_count')
        .eq('id', tokenId)
        .single();

      const newCount = (current?.use_count || 0) + 1;

      const { error } = await this.supabase
        .from('access_tokens')
        .update({
          last_used_at: new Date().toISOString(),
          use_count: newCount,
        })
        .eq('id', tokenId);

      return !error;
    } catch (err) {
      console.error('Failed to update token usage:', err);
      return false;
    }
  }

  /**
   * Create tokens for a private event
   * @param eventId - Event UUID
   * @param expiresAt - Expiration timestamp
   * @returns Object with organizer and participant tokens
   */
  async createTokensForEvent(
    eventId: string,
    expiresAt: string
  ): Promise<{
    organizer: string;
    participant: string;
  }> {
    const organizerToken = this.generateToken();
    const participantToken = this.generateToken();

    // Insert organizer token
    const { error: orgError } = await this.supabase
      .from('access_tokens')
      .insert({
        event_id: eventId,
        token: organizerToken,
        type: 'organizer',
        expires_at: expiresAt,
      });

    if (orgError) {
      throw new Error(`Failed to create organizer token: ${orgError.message}`);
    }

    // Insert participant token
    const { error: partError } = await this.supabase
      .from('access_tokens')
      .insert({
        event_id: eventId,
        token: participantToken,
        type: 'participant',
        expires_at: expiresAt,
      });

    if (partError) {
      throw new Error(`Failed to create participant token: ${partError.message}`);
    }

    return {
      organizer: organizerToken,
      participant: participantToken,
    };
  }

  /**
   * Get all tokens for an event
   * @param eventId - Event UUID
   * @returns Array of access tokens
   */
  async getTokensForEvent(eventId: string): Promise<AccessToken[]> {
    const { data, error } = await this.supabase
      .from('access_tokens')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get tokens: ${error.message}`);
    }

    return data as AccessToken[];
  }

  /**
   * Delete all tokens for an event (when event is deleted)
   * @param eventId - Event UUID
   * @returns Success boolean
   */
  async deleteTokensForEvent(eventId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('access_tokens')
        .delete()
        .eq('event_id', eventId);

      return !error;
    } catch (err) {
      console.error('Failed to delete tokens:', err);
      return false;
    }
  }

  /**
   * Check if token has organizer permissions
   * @param token - Token string
   * @returns Boolean indicating organizer status
   */
  async isOrganizerToken(token: string): Promise<boolean> {
    const validation = await this.validateToken(token);
    return validation.valid && validation.token?.type === 'organizer';
  }

  /**
   * Check if token is valid and belongs to specific event
   * @param token - Token string
   * @param eventId - Event UUID
   * @returns Validation result with token data
   */
  async validateTokenForEvent(
    token: string,
    eventId: string
  ): Promise<{
    valid: boolean;
    token?: AccessToken;
    error?: string;
  }> {
    return this.validateToken(token, eventId);
  }
}

// Export singleton instance
export const tokenService = new TokenService();
