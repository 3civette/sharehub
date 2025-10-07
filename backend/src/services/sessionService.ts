/**
 * Session Service
 * Purpose: Business logic for session management within events
 * Feature: 003-ora-facciamo-il
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Session, CreateSessionInput, UpdateSessionInput } from '../models/session';
import { getNextDisplayOrder } from '../models/session';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class SessionService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Set tenant context for RLS policies
   */
  private async setTenantContext(tenantId: string): Promise<void> {
    await this.supabase.rpc('set_config', {
      setting: 'app.current_tenant_id',
      value: tenantId,
      is_local: true,
    });
  }

  /**
   * Create a new session
   * @param tenantId - Tenant UUID
   * @param input - Session creation data
   * @returns Created session
   */
  async createSession(tenantId: string, input: CreateSessionInput): Promise<Session> {
    await this.setTenantContext(tenantId);

    // If display_order not provided, get next available
    let displayOrder = input.display_order;
    if (displayOrder === undefined || displayOrder === null) {
      const existing = await this.listSessions(input.event_id, tenantId);
      displayOrder = getNextDisplayOrder(existing);
    }

    const { data, error } = await this.supabase
      .from('sessions')
      .insert({
        event_id: input.event_id,
        tenant_id: tenantId,
        title: input.title,
        description: input.description,
        start_time: input.start_time,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return data as Session;
  }

  /**
   * Update session
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @param input - Update data
   * @returns Updated session
   */
  async updateSession(
    sessionId: string,
    tenantId: string,
    input: UpdateSessionInput
  ): Promise<Session> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('sessions')
      .update(input)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return data as Session;
  }

  /**
   * Delete session (cascades to speeches and slides)
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @returns Success boolean
   */
  async deleteSession(sessionId: string, tenantId: string): Promise<boolean> {
    await this.setTenantContext(tenantId);

    const { error } = await this.supabase.from('sessions').delete().eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }

    return true;
  }

  /**
   * List sessions for an event
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @returns Array of sessions ordered by display_order
   */
  async listSessions(eventId: string, tenantId: string): Promise<Session[]> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list sessions: ${error.message}`);
    }

    return (data || []) as Session[];
  }

  /**
   * Get session by ID
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @returns Session or null
   */
  async getSession(sessionId: string, tenantId: string): Promise<Session | null> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      return null;
    }

    return data as Session;
  }

  /**
   * Reorder sessions
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @param sessionIds - Array of session IDs in new order
   * @returns Updated sessions
   */
  async reorderSessions(
    eventId: string,
    tenantId: string,
    sessionIds: string[]
  ): Promise<Session[]> {
    await this.setTenantContext(tenantId);

    // Update display_order for each session
    const updates = sessionIds.map((sessionId, index) =>
      this.supabase
        .from('sessions')
        .update({ display_order: index })
        .eq('id', sessionId)
        .eq('event_id', eventId)
    );

    await Promise.all(updates);

    // Return updated list
    return this.listSessions(eventId, tenantId);
  }

  /**
   * Get session with speeches and slides
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @returns Session with nested speeches and slides
   */
  async getSessionWithContent(sessionId: string, tenantId: string): Promise<any> {
    await this.setTenantContext(tenantId);

    const { data: session, error: sessionError } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Get speeches
    const { data: speeches, error: speechesError } = await this.supabase
      .from('speeches')
      .select('*')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: true });

    if (speechesError) {
      throw new Error(`Failed to load speeches: ${speechesError.message}`);
    }

    // For each speech, get slides
    const speechesWithSlides = await Promise.all(
      (speeches || []).map(async (speech) => {
        const { data: slides } = await this.supabase
          .from('slides')
          .select('*')
          .eq('speech_id', speech.id)
          .order('display_order', { ascending: true });

        return {
          ...speech,
          slides: slides || [],
        };
      })
    );

    return {
      ...session,
      speeches: speechesWithSlides,
    };
  }
}

// Export singleton instance
export const sessionService = new SessionService();
