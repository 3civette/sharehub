/**
 * Token Service
 * Purpose: Token generation, validation, and usage tracking
 * Feature: 003-ora-facciamo-il (enhanced by 005-ora-bisogna-implementare)
 */

import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
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
   * Feature 005: Also checks for revoked status
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

      // Feature 005: Check if token is revoked
      if (accessToken.revoked_at) {
        return {
          valid: false,
          error: 'Token has been revoked',
        };
      }

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

  /**
   * Feature 005: Generate QR code for token
   * @param token - Token string
   * @param eventSlug - Event slug for URL construction
   * @param format - QR code format (PNG data URL or SVG string)
   * @param size - QR code size in pixels (default 300)
   * @returns QR code as data URL or SVG string
   */
  async generateQRCode(
    token: string,
    eventSlug: string,
    format: 'png' | 'svg' = 'png',
    size: number = 300
  ): Promise<string> {
    const publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventSlug}?token=${token}`;

    try {
      if (format === 'svg') {
        return await QRCode.toString(publicUrl, {
          type: 'svg',
          width: size,
          margin: 2,
        });
      } else {
        // PNG data URL
        return await QRCode.toDataURL(publicUrl, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      }
    } catch (err) {
      throw new Error(`QR code generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Feature 005: Store QR code data URL in token record
   * @param tokenId - Token UUID
   * @param qrCodeDataUrl - QR code data URL (PNG)
   * @returns Success boolean
   */
  async saveQRCode(tokenId: string, qrCodeDataUrl: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('access_tokens')
        .update({ qr_code_data_url: qrCodeDataUrl })
        .eq('id', tokenId);

      return !error;
    } catch (err) {
      console.error('Failed to save QR code:', err);
      return false;
    }
  }

  /**
   * Feature 005: Revoke a token (soft delete with audit trail)
   * @param tokenId - Token UUID
   * @param revokedBy - Admin ID who revoked the token
   * @returns Revoked token data
   */
  async revokeToken(tokenId: string, revokedBy: string): Promise<AccessToken> {
    const { data, error } = await this.supabase
      .from('access_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
      })
      .eq('id', tokenId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to revoke token: ${error.message}`);
    }

    return data as AccessToken;
  }

  /**
   * Feature 005: Get tokens with status filter (active/revoked/expired)
   * @param eventId - Event UUID
   * @param status - Filter by token status
   * @returns Filtered array of access tokens
   */
  async getTokensByStatus(
    eventId: string,
    status?: 'active' | 'revoked' | 'expired' | 'all'
  ): Promise<AccessToken[]> {
    let query = this.supabase
      .from('access_tokens')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (status === 'revoked') {
      query = query.not('revoked_at', 'is', null);
    } else if (status === 'active') {
      query = query.is('revoked_at', null).gte('expires_at', new Date().toISOString());
    } else if (status === 'expired') {
      query = query.is('revoked_at', null).lt('expires_at', new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get tokens: ${error.message}`);
    }

    return data as AccessToken[];
  }

  /**
   * Feature 005: Format token URL for copy-to-clipboard
   * @param token - Token string
   * @param eventSlug - Event slug
   * @returns Full public URL with token parameter
   */
  formatTokenUrl(token: string, eventSlug: string): string {
    return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventSlug}?token=${token}`;
  }
}

// Export singleton instance
export const tokenService = new TokenService();
