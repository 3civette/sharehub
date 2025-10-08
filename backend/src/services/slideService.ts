/**
 * Slide Service
 * Purpose: Business logic for slide file management with Supabase Storage
 * Feature: 003-ora-facciamo-il
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Response } from 'express';
import archiver from 'archiver';
import type { Slide, CreateSlideInput } from '../models/slide';
import { generateStoragePath, getNextDisplayOrder, formatUploadedBy } from '../models/slide';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class SlideService {
  private supabase: SupabaseClient;
  private readonly STORAGE_BUCKET = 'slides';

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
   * Upload slide file to Supabase Storage
   * @param tenantId - Tenant UUID
   * @param eventId - Event UUID
   * @param speechId - Speech UUID
   * @param file - File buffer and metadata
   * @param uploadedBy - Actor info (e.g., "organizer:token_id")
   * @returns Created slide record
   */
  async uploadSlide(
    tenantId: string,
    eventId: string,
    speechId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    uploadedBy: string,
    displayOrder?: number
  ): Promise<Slide> {
    await this.setTenantContext(tenantId);

    // Generate storage path
    const storagePath = generateStoragePath(tenantId, eventId, speechId, file.originalname);

    // Upload to Supabase Storage
    const { error: uploadError } = await this.supabase.storage
      .from(this.STORAGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get next display_order if not provided
    let order = displayOrder;
    if (order === undefined || order === null) {
      const existing = await this.listSlides(speechId, tenantId);
      order = getNextDisplayOrder(existing);
    }

    // Create slide record
    const { data, error } = await this.supabase
      .from('slides')
      .insert({
        speech_id: speechId,
        tenant_id: tenantId,
        filename: file.originalname,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.mimetype,
        display_order: order,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) {
      // Rollback storage upload if DB insert fails
      await this.supabase.storage.from(this.STORAGE_BUCKET).remove([storagePath]);
      throw new Error(`Failed to create slide record: ${error.message}`);
    }

    return data as Slide;
  }

  /**
   * Get download URL for slide (signed URL, 1 hour expiry)
   * @param slideId - Slide UUID
   * @param tenantId - Tenant UUID
   * @returns Signed download URL
   */
  async getDownloadUrl(slideId: string, tenantId: string): Promise<string> {
    await this.setTenantContext(tenantId);

    // Get slide record
    const { data: slide, error } = await this.supabase
      .from('slides')
      .select('storage_path')
      .eq('id', slideId)
      .single();

    if (error || !slide) {
      throw new Error('Slide not found');
    }

    // Generate signed URL (1 hour expiry)
    const { data: urlData, error: urlError } = await this.supabase.storage
      .from(this.STORAGE_BUCKET)
      .createSignedUrl(slide.storage_path, 3600); // 1 hour

    if (urlError || !urlData) {
      throw new Error(`Failed to generate download URL: ${urlError?.message}`);
    }

    return urlData.signedUrl;
  }

  /**
   * Delete slide (removes from storage and database)
   * @param slideId - Slide UUID
   * @param tenantId - Tenant UUID
   * @returns Success boolean
   */
  async deleteSlide(slideId: string, tenantId: string): Promise<boolean> {
    await this.setTenantContext(tenantId);

    // Get slide record
    const { data: slide, error: fetchError } = await this.supabase
      .from('slides')
      .select('storage_path')
      .eq('id', slideId)
      .single();

    if (fetchError || !slide) {
      throw new Error('Slide not found');
    }

    // Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from(this.STORAGE_BUCKET)
      .remove([slide.storage_path]);

    if (storageError) {
      console.error('Failed to delete from storage:', storageError);
      // Continue with DB deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await this.supabase
      .from('slides')
      .delete()
      .eq('id', slideId);

    if (dbError) {
      throw new Error(`Failed to delete slide: ${dbError.message}`);
    }

    return true;
  }

  /**
   * List slides for a speech
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @returns Array of slides ordered by display_order
   */
  async listSlides(speechId: string, tenantId: string): Promise<Slide[]> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('slides')
      .select('*')
      .eq('speech_id', speechId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list slides: ${error.message}`);
    }

    return (data || []) as Slide[];
  }

  /**
   * Feature 005: Get slides with enriched metadata (speaker name, speech title)
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @returns Array of slides with speaker and speech metadata
   */
  async getSlidesWithSpeechData(speechId: string, tenantId: string): Promise<any[]> {
    await this.setTenantContext(tenantId);

    // Use the slides_with_metadata view created in migration
    const { data, error } = await this.supabase
      .from('slides_with_metadata')
      .select('*')
      .eq('speech_id', speechId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list slides with metadata: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Generate ZIP file for event slides (hierarchical structure)
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @param res - Express response object for streaming
   * @returns Promise that resolves when streaming completes
   */
  async generateZIP(eventId: string, tenantId: string, res: Response): Promise<void> {
    await this.setTenantContext(tenantId);

    // Get event with full hierarchy
    const { data: event } = await this.supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    if (!event) {
      throw new Error('Event not found');
    }

    // Get sessions
    const { data: sessions } = await this.supabase
      .from('sessions')
      .select('id, title, display_order')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Pipe archive to response
    archive.pipe(res);

    // For each session, get speeches and slides
    for (const session of sessions || []) {
      const { data: speeches } = await this.supabase
        .from('speeches')
        .select('id, title, display_order')
        .eq('session_id', session.id)
        .order('display_order', { ascending: true });

      for (const speech of speeches || []) {
        const { data: slides } = await this.supabase
          .from('slides')
          .select('*')
          .eq('speech_id', speech.id)
          .order('display_order', { ascending: true });

        for (const slide of slides || []) {
          // Download file from storage
          const { data: fileData } = await this.supabase.storage
            .from(this.STORAGE_BUCKET)
            .download(slide.storage_path);

          if (fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const folderPath = `${session.title}/${speech.title}/${slide.filename}`;
            archive.append(buffer, { name: folderPath });
          }
        }
      }
    }

    // Finalize archive
    await archive.finalize();
  }

  /**
   * Get slide by ID
   * @param slideId - Slide UUID
   * @param tenantId - Tenant UUID
   * @returns Slide or null
   */
  async getSlide(slideId: string, tenantId: string): Promise<Slide | null> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('slides')
      .select('*')
      .eq('id', slideId)
      .single();

    if (error) {
      return null;
    }

    return data as Slide;
  }

  /**
   * Reorder slides
   * @param speechId - Speech UUID
   * @param tenantId - Tenant UUID
   * @param slideIds - Array of slide IDs in new order
   * @returns Updated slides
   */
  async reorderSlides(
    speechId: string,
    tenantId: string,
    slideIds: string[]
  ): Promise<Slide[]> {
    await this.setTenantContext(tenantId);

    // Update display_order for each slide
    const updates = slideIds.map((slideId, index) =>
      this.supabase
        .from('slides')
        .update({ display_order: index })
        .eq('id', slideId)
        .eq('speech_id', speechId)
    );

    await Promise.all(updates);

    // Return updated list
    return this.listSlides(speechId, tenantId);
  }
}

// Export singleton instance
export const slideService = new SlideService();
