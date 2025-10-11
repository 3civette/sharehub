/**
 * Session Service
 * Purpose: Business logic for session management within events
 * Feature: 003-ora-facciamo-il (enhanced by 005-ora-bisogna-implementare)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Session, SessionWithSpeeches, CreateSessionInput, UpdateSessionInput } from '../models/session';
import { getNextDisplayOrder, sortSessionsSmart } from '../models/session';

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
   * Feature 005: Supports scheduled_time with nullable display_order for auto-ordering
   * @param tenantId - Tenant UUID
   * @param input - Session creation data
   * @returns Created session
   */
  async createSession(tenantId: string, input: CreateSessionInput): Promise<Session> {
    await this.setTenantContext(tenantId);

    // Feature 005: display_order is nullable for chronological auto-ordering
    // If not provided, keep as null (will be ordered by scheduled_time)
    let displayOrder = input.display_order;
    console.log('Input display_order:', displayOrder, 'type:', typeof displayOrder);
    if (displayOrder === undefined || displayOrder === null) {
      const existing = await this.listSessions(tenantId, input.event_id);
      console.log('Existing sessions count:', existing.length, 'orders:', existing.map(s => s.display_order));
      displayOrder = getNextDisplayOrder(existing);
      console.log('Calculated next display_order:', displayOrder);
    }

    const { data, error } = await this.supabase
      .from('sessions')
      .insert({
        event_id: input.event_id,
        tenant_id: tenantId,
        title: input.title,
        description: input.description,
        start_time: input.start_time, // Feature 003 legacy
        scheduled_time: input.scheduled_time, // Feature 005 preferred
        display_order: displayOrder ?? null, // Feature 005: nullable
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
   * Feature 005: Auto-clears display_order if scheduled_time changes (trigger handles this)
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

    // Feature 005: If scheduled_time is being updated, database trigger will auto-clear display_order
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
   * Delete session
   * Feature 005: Checks for speeches first, throws error if any exist (safeguard)
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @returns Success boolean with speech count
   */
  async deleteSession(sessionId: string, tenantId: string): Promise<{ deleted: boolean; speech_count: number }> {
    await this.setTenantContext(tenantId);

    // Feature 005: Check for speeches first (delete safeguard)
    const { data: speeches, error: speechError } = await this.supabase
      .from('speeches')
      .select('id')
      .eq('session_id', sessionId);

    if (speechError) {
      throw new Error(`Failed to check speeches: ${speechError.message}`);
    }

    const speechCount = speeches?.length || 0;

    if (speechCount > 0) {
      throw new Error(`Cannot delete session with ${speechCount} speeches. Delete speeches first.`);
    }

    const { error } = await this.supabase.from('sessions').delete().eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }

    return { deleted: true, speech_count: speechCount };
  }

  /**
   * List sessions for an event
   * @param tenantId - Tenant UUID
   * @param eventId - Event UUID
   * @returns Array of sessions ordered by display_order
   */
  async listSessions(tenantId: string, eventId: string): Promise<Session[]> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      throw new Error(`Failed to list sessions: ${error.message}`);
    }

    // Feature 005: Use smart ordering logic from model helper
    return sortSessionsSmart((data || []) as Session[]);
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
   * @param tenantId - Tenant UUID
   * @param eventId - Event UUID
   * @param sessionIds - Array of session IDs in new order
   * @returns Updated sessions
   */
  async reorderSessions(
    tenantId: string,
    eventId: string,
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
    return this.listSessions(tenantId, eventId);
  }

  /**
   * Get session with speeches (hierarchical query)
   * Feature 005: Uses SessionWithSpeeches type, applies smart ordering to speeches
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @returns Session with nested speeches and slide count
   */
  async getSessionWithContent(sessionId: string, tenantId: string): Promise<SessionWithSpeeches> {
    await this.setTenantContext(tenantId);

    const { data: session, error: sessionError } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Get speeches with slide counts
    const { data: speeches, error: speechesError } = await this.supabase
      .from('speeches')
      .select(`
        *,
        slides:slides(count)
      `)
      .eq('session_id', sessionId);

    if (speechesError) {
      throw new Error(`Failed to load speeches: ${speechesError.message}`);
    }

    // Feature 005: Apply smart ordering to speeches (will use sortSpeechesSmart in SpeechService)
    const sortedSpeeches = (speeches || []).map(speech => ({
      ...speech,
      slide_count: speech.slides?.[0]?.count || 0
    }));

    return {
      ...session,
      speeches: sortedSpeeches,
      speech_count: sortedSpeeches.length
    } as SessionWithSpeeches;
  }
}

// Export singleton instance
export const sessionService = new SessionService();
