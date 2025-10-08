/**
 * Speech Service
 * Purpose: Business logic for speech management within sessions
 * Feature: 003-ora-facciamo-il (enhanced by 005-ora-bisogna-implementare)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Speech, SpeechWithSlides, CreateSpeechInput, UpdateSpeechInput } from '../models/speech';
import { getNextDisplayOrder, sortSpeechesSmart } from '../models/speech';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class SpeechService {
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
   * Create a new speech
   * Feature 005: Supports scheduled_time, duration_minutes, nullable display_order
   * @param tenantId - Tenant UUID
   * @param input - Speech creation data
   * @returns Created speech
   */
  async createSpeech(tenantId: string, input: CreateSpeechInput): Promise<Speech> {
    await this.setTenantContext(tenantId);

    // Feature 005: display_order is nullable for chronological auto-ordering
    // If not provided, keep as null (will be ordered by scheduled_time)
    let displayOrder = input.display_order;

    // Legacy behavior: if explicitly requesting next order, calculate it
    if (displayOrder === undefined && !input.scheduled_time) {
      const existing = await this.listSpeeches(input.session_id, tenantId);
      displayOrder = getNextDisplayOrder(existing);
    }

    const { data, error } = await this.supabase
      .from('speeches')
      .insert({
        session_id: input.session_id,
        tenant_id: tenantId,
        title: input.title,
        speaker_name: input.speaker_name,
        duration: input.duration, // Feature 003 legacy
        duration_minutes: input.duration_minutes, // Feature 005 preferred
        description: input.description,
        scheduled_time: input.scheduled_time, // Feature 005
        display_order: displayOrder ?? null, // Feature 005: nullable
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create speech: ${error.message}`);
    }

    return data as Speech;
  }

  /**
   * Update speech
   * Feature 005: Auto-clears display_order if scheduled_time changes (trigger handles this)
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @param input - Update data
   * @returns Updated speech
   */
  async updateSpeech(
    speechId: string,
    tenantId: string,
    input: UpdateSpeechInput
  ): Promise<Speech> {
    await this.setTenantContext(tenantId);

    // Feature 005: If scheduled_time is being updated, database trigger will auto-clear display_order
    const { data, error } = await this.supabase
      .from('speeches')
      .update(input)
      .eq('id', speechId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update speech: ${error.message}`);
    }

    return data as Speech;
  }

  /**
   * Delete speech
   * Feature 005: Returns slide count with confirmation message (cascade deletion still active)
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @returns Slide count and success boolean
   */
  async deleteSpeech(
    speechId: string,
    tenantId: string
  ): Promise<{ deleted: boolean; slide_count: number }> {
    await this.setTenantContext(tenantId);

    // Feature 005: Get slide count before deletion (for confirmation message)
    const { data: slides } = await this.supabase
      .from('slides')
      .select('id')
      .eq('speech_id', speechId);

    const slideCount = slides?.length || 0;

    // Delete speech (slides cascade automatically via ON DELETE CASCADE)
    const { error } = await this.supabase.from('speeches').delete().eq('id', speechId);

    if (error) {
      throw new Error(`Failed to delete speech: ${error.message}`);
    }

    return { deleted: true, slide_count: slideCount };
  }

  /**
   * List speeches for a session
   * Feature 005: Smart ordering using sortSpeechesSmart helper
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @returns Array of speeches ordered by smart logic (manual display_order or scheduled_time)
   */
  async listSpeeches(sessionId: string, tenantId: string): Promise<Speech[]> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('speeches')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      throw new Error(`Failed to list speeches: ${error.message}`);
    }

    // Feature 005: Use smart ordering logic from model helper
    return sortSpeechesSmart((data || []) as Speech[]);
  }

  /**
   * Get speech by ID
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @returns Speech or null
   */
  async getSpeech(speechId: string, tenantId: string): Promise<Speech | null> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('speeches')
      .select('*')
      .eq('id', speechId)
      .single();

    if (error) {
      return null;
    }

    return data as Speech;
  }

  /**
   * Reorder speeches
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @param speechIds - Array of speech IDs in new order
   * @returns Updated speeches
   */
  async reorderSpeeches(
    sessionId: string,
    tenantId: string,
    speechIds: string[]
  ): Promise<Speech[]> {
    await this.setTenantContext(tenantId);

    // Update display_order for each speech
    const updates = speechIds.map((speechId, index) =>
      this.supabase
        .from('speeches')
        .update({ display_order: index })
        .eq('id', speechId)
        .eq('session_id', sessionId)
    );

    await Promise.all(updates);

    // Return updated list
    return this.listSpeeches(sessionId, tenantId);
  }

  /**
   * Get speech with slides (hierarchical query)
   * Feature 005: Uses SpeechWithSlides type
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @returns Speech with nested slides and count
   */
  async getSpeechWithSlides(speechId: string, tenantId: string): Promise<SpeechWithSlides> {
    await this.setTenantContext(tenantId);

    const { data: speech, error: speechError } = await this.supabase
      .from('speeches')
      .select('*')
      .eq('id', speechId)
      .single();

    if (speechError || !speech) {
      throw new Error('Speech not found');
    }

    // Get slides ordered by display_order
    const { data: slides, error: slidesError } = await this.supabase
      .from('slides')
      .select('*')
      .eq('speech_id', speechId)
      .order('display_order', { ascending: true });

    if (slidesError) {
      throw new Error(`Failed to load slides: ${slidesError.message}`);
    }

    return {
      ...speech,
      slides: slides || [],
      slide_count: slides?.length || 0
    } as SpeechWithSlides;
  }
}

// Export singleton instance
export const speechService = new SpeechService();
