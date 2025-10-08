/**
 * Speech Service
 * Purpose: Business logic for speech management within sessions
 * Feature: 003-ora-facciamo-il
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Speech, CreateSpeechInput, UpdateSpeechInput } from '../models/speech';
import { getNextDisplayOrder } from '../models/speech';

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
   * @param tenantId - Tenant UUID
   * @param input - Speech creation data
   * @returns Created speech
   */
  async createSpeech(tenantId: string, input: CreateSpeechInput): Promise<Speech> {
    await this.setTenantContext(tenantId);

    // If display_order not provided, get next available
    let displayOrder = input.display_order;
    if (displayOrder === undefined || displayOrder === null) {
      const existing = await this.listSpeeches(input.session_id, tenantId);
      displayOrder = getNextDisplayOrder(existing);
    }

    const { data, error} = await this.supabase
      .from('speeches')
      .insert({
        session_id: input.session_id,
        tenant_id: tenantId,
        title: input.title,
        speaker_name: input.speaker_name,
        // duration: input.duration, // TODO: Re-enable after migration applied
        description: input.description,
        display_order: displayOrder,
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
   * Delete speech (cascades to slides)
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @returns Slide count and success boolean
   */
  async deleteSpeech(
    speechId: string,
    tenantId: string
  ): Promise<{ slideCount: number; success: boolean }> {
    await this.setTenantContext(tenantId);

    // Get slide count before deletion
    const { data: slides } = await this.supabase
      .from('slides')
      .select('id')
      .eq('speech_id', speechId);

    const slideCount = slides?.length || 0;

    const { error } = await this.supabase.from('speeches').delete().eq('id', speechId);

    if (error) {
      throw new Error(`Failed to delete speech: ${error.message}`);
    }

    return { slideCount, success: true };
  }

  /**
   * List speeches for a session
   * @param sessionId - Session UUID
   * @param tenantId - Tenant UUID
   * @returns Array of speeches ordered by display_order
   */
  async listSpeeches(sessionId: string, tenantId: string): Promise<Speech[]> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('speeches')
      .select('*')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list speeches: ${error.message}`);
    }

    return (data || []) as Speech[];
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
   * Get speech with slides
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @returns Speech with nested slides
   */
  async getSpeechWithSlides(speechId: string, tenantId: string): Promise<any> {
    await this.setTenantContext(tenantId);

    const { data: speech, error: speechError } = await this.supabase
      .from('speeches')
      .select('*')
      .eq('id', speechId)
      .single();

    if (speechError || !speech) {
      throw new Error('Speech not found');
    }

    // Get slides
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
    };
  }
}

// Export singleton instance
export const speechService = new SpeechService();
