/**
 * Event Flow Service
 * Purpose: Business logic for event flow management (feature 003)
 * Feature: 003-ora-facciamo-il
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Event, CreateEventInput, UpdateEventInput, EventFilters } from '../models/event';
import { generateSlug, isEventPast } from '../models/event';
import { tokenService } from './tokenService';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class EventFlowService {
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
   * Create a new event
   * @param tenantId - Tenant UUID
   * @param input - Event creation data
   * @param createdBy - Admin ID creating the event
   * @returns Created event with tokens if private
   */
  async createEvent(
    tenantId: string,
    input: CreateEventInput,
    createdBy?: string
  ): Promise<{
    event: Event;
    tokens?: { organizer: string; participant: string };
  }> {
    await this.setTenantContext(tenantId);

    // Generate slug if not provided
    const slug = input.slug || generateSlug(input.name);

    // Determine status based on date
    const eventDate = new Date(input.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const status = eventDate < today ? 'past' : 'upcoming';

    // Insert event
    const { data: event, error } = await this.supabase
      .from('events')
      .insert({
        tenant_id: tenantId,
        slug,
        name: input.name,
        date: input.date,
        description: input.description,
        visibility: input.visibility,
        status,
        token_expiration_date: input.token_expiration_date,
        retention_policy: input.retention_policy || 'keep_forever',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }

    // Initialize metrics for the event
    await this.supabase.from('event_metrics').insert({
      event_id: event.id,
      tenant_id: tenantId,
    });

    // Generate tokens for private events
    let tokens: { organizer: string; participant: string } | undefined;
    if (input.visibility === 'private' && input.token_expiration_date) {
      tokens = await tokenService.createTokensForEvent(
        event.id,
        input.token_expiration_date
      );
    }

    return { event: event as Event, tokens };
  }

  /**
   * Get event by ID with full hierarchy
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID for RLS
   * @returns Event with sessions, speeches, and slides
   */
  async getEventWithHierarchy(eventId: string, tenantId: string): Promise<any> {
    await this.setTenantContext(tenantId);

    // Get event
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Get sessions with speeches and slides
    const { data: sessions, error: sessionsError } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    if (sessionsError) {
      throw new Error(`Failed to load sessions: ${sessionsError.message}`);
    }

    // For each session, get speeches
    const sessionsWithContent = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: speeches } = await this.supabase
          .from('speeches')
          .select('*')
          .eq('session_id', session.id)
          .order('display_order', { ascending: true });

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
      })
    );

    return {
      event,
      sessions: sessionsWithContent,
    };
  }

  /**
   * List events with filters and pagination
   * @param tenantId - Tenant UUID
   * @param filters - Filter criteria
   * @returns Events array and pagination info
   */
  async listEvents(
    tenantId: string,
    filters: EventFilters
  ): Promise<{
    events: Event[];
    pagination: { page: number; limit: number; total: number };
  }> {
    await this.setTenantContext(tenantId);

    let query = this.supabase.from('events').select('*', { count: 'exact' });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.visibility) {
      query = query.eq('visibility', filters.visibility);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
    }

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1).order('date', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list events: ${error.message}`);
    }

    return {
      events: (data || []) as Event[],
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: count || 0,
      },
    };
  }

  /**
   * Update event
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @param input - Update data
   * @param confirmPastEvent - Required for updating past events
   * @returns Updated event
   */
  async updateEvent(
    eventId: string,
    tenantId: string,
    input: UpdateEventInput,
    confirmPastEvent: boolean = false
  ): Promise<Event> {
    await this.setTenantContext(tenantId);

    // Get existing event
    const { data: existing, error: fetchError } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !existing) {
      throw new Error('Event not found');
    }

    const existingEvent = existing as Event;

    // Check if event is past and confirmation is required
    if (isEventPast(existingEvent) && !confirmPastEvent) {
      throw new Error('Confirmation required to edit past events');
    }

    // Update event
    const { data: updated, error: updateError } = await this.supabase
      .from('events')
      .update(input)
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    return updated as Event;
  }

  /**
   * Delete event (cascade deletes sessions, speeches, slides)
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @returns Success boolean
   */
  async deleteEvent(eventId: string, tenantId: string): Promise<boolean> {
    await this.setTenantContext(tenantId);

    const { error } = await this.supabase.from('events').delete().eq('id', eventId);

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }

    return true;
  }

  /**
   * Get event by slug
   * @param slug - Event slug
   * @param tenantId - Tenant UUID
   * @returns Event or null
   */
  async getEventBySlug(slug: string, tenantId: string): Promise<Event | null> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      return null;
    }

    return data as Event;
  }

  /**
   * Check if slug is available for tenant
   * @param slug - Slug to check
   * @param tenantId - Tenant UUID
   * @param excludeEventId - Event ID to exclude (for updates)
   * @returns Boolean indicating availability
   */
  async isSlugAvailable(
    slug: string,
    tenantId: string,
    excludeEventId?: string
  ): Promise<boolean> {
    await this.setTenantContext(tenantId);

    let query = this.supabase.from('events').select('id').eq('slug', slug);

    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }

    const { data } = await query;

    return !data || data.length === 0;
  }
}

// Export singleton instance
export const eventFlowService = new EventFlowService();
