/**
 * Event Photo Service
 * Feature: 005-ora-bisogna-implementare
 * Purpose: Manage event photos with cover image logic and Supabase Storage integration
 */

import { createClient } from '@supabase/supabase-js';
import { EventPhoto, EventPhotoCreateInput, validatePhotoInput } from '../models/eventPhoto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class EventPhotoService {
  /**
   * Upload photo to Supabase Storage and create database record
   */
  async uploadPhoto(
    eventId: string,
    tenantId: string,
    file: Express.Multer.File,
    isCover: boolean = false
  ): Promise<EventPhoto> {
    // Generate storage path
    const timestamp = Date.now();
    const storagePath = `event-photos/${tenantId}/${eventId}/${timestamp}-${file.originalname}`;

    // Validate input
    const input: EventPhotoCreateInput = {
      event_id: eventId,
      tenant_id: tenantId,
      storage_path: storagePath,
      filename: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      is_cover: isCover
    };

    const validation = validatePhotoInput(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Get next display_order
    const { data: existingPhotos } = await supabase
      .from('event_photos')
      .select('display_order')
      .eq('event_id', eventId)
      .order('display_order', { ascending: false })
      .limit(1);

    const displayOrder = isCover ? 0 : (existingPhotos && existingPhotos.length > 0 ? existingPhotos[0].display_order + 1 : 1);

    // If setting as cover, unset previous cover
    if (isCover) {
      await supabase
        .from('event_photos')
        .update({ is_cover: false })
        .eq('event_id', eventId)
        .eq('is_cover', true);
    }

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('event-photos')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('event-photos')
      .getPublicUrl(storagePath);

    // Create database record
    const { data, error } = await supabase
      .from('event_photos')
      .insert({
        event_id: eventId,
        tenant_id: tenantId,
        storage_path: storagePath,
        filename: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        is_cover: isCover,
        display_order: displayOrder
      })
      .select()
      .single();

    if (error) {
      // Cleanup: delete uploaded file if DB insert fails
      await supabase.storage.from('event-photos').remove([storagePath]);
      throw new Error(`Database insert failed: ${error.message}`);
    }

    return { ...data, url: urlData.publicUrl } as EventPhoto & { url: string };
  }

  /**
   * List all photos for an event (ordered by display_order)
   */
  async listPhotos(eventId: string): Promise<{ photos: EventPhoto[]; cover: EventPhoto | null; total: number }> {
    const { data, error } = await supabase
      .from('event_photos')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list photos: ${error.message}`);
    }

    const photos = data || [];
    const cover = photos.find(p => p.is_cover) || null;

    // Add public URLs
    const photosWithUrls = photos.map(photo => {
      const { data: urlData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(photo.storage_path);
      return { ...photo, url: urlData.publicUrl };
    });

    return {
      photos: photosWithUrls,
      cover: cover ? { ...cover, url: supabase.storage.from('event-photos').getPublicUrl(cover.storage_path).data.publicUrl } : null,
      total: photos.length
    };
  }

  /**
   * Set a photo as cover (and unset previous cover)
   */
  async setCover(photoId: string, eventId: string): Promise<{ photo: EventPhoto; previous_cover: EventPhoto | null }> {
    // Get the photo to be set as cover
    const { data: newCover, error: fetchError } = await supabase
      .from('event_photos')
      .select('*')
      .eq('id', photoId)
      .eq('event_id', eventId)
      .single();

    if (fetchError || !newCover) {
      throw new Error('Photo not found');
    }

    // Get previous cover
    const { data: previousCover } = await supabase
      .from('event_photos')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_cover', true)
      .single();

    // Unset previous cover
    if (previousCover) {
      await supabase
        .from('event_photos')
        .update({ is_cover: false, display_order: 1 })
        .eq('id', previousCover.id);
    }

    // Set new cover
    const { data: updatedPhoto, error: updateError } = await supabase
      .from('event_photos')
      .update({ is_cover: true, display_order: 0 })
      .eq('id', photoId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update cover: ${updateError.message}`);
    }

    return {
      photo: updatedPhoto,
      previous_cover: previousCover || null
    };
  }

  /**
   * Delete a photo (remove from storage and database)
   */
  async deletePhoto(photoId: string, eventId: string): Promise<{ deleted: { id: string; filename: string } }> {
    // Check if this is the cover and if there are other gallery photos
    const { data: photo, error: fetchError } = await supabase
      .from('event_photos')
      .select('*')
      .eq('id', photoId)
      .eq('event_id', eventId)
      .single();

    if (fetchError || !photo) {
      throw new Error('Photo not found');
    }

    // If deleting cover, check if there are gallery photos
    if (photo.is_cover) {
      const { data: galleryPhotos } = await supabase
        .from('event_photos')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_cover', false);

      if (galleryPhotos && galleryPhotos.length > 0) {
        throw new Error('Cannot delete cover image while gallery photos exist. Set another photo as cover first.');
      }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('event-photos')
      .remove([photo.storage_path]);

    if (storageError) {
      console.error('Storage deletion failed:', storageError);
      // Continue with DB deletion even if storage fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('event_photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      throw new Error(`Database deletion failed: ${deleteError.message}`);
    }

    return {
      deleted: {
        id: photo.id,
        filename: photo.filename
      }
    };
  }

  /**
   * Reorder photos
   */
  async reorderPhotos(eventId: string, photoIds: string[]): Promise<EventPhoto[]> {
    // Update display_order for each photo
    const updates = photoIds.map((photoId, index) =>
      supabase
        .from('event_photos')
        .update({ display_order: index + 1 }) // Start from 1 (0 is reserved for cover)
        .eq('id', photoId)
        .eq('event_id', eventId)
    );

    await Promise.all(updates);

    // Return updated photos
    const { data } = await supabase
      .from('event_photos')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    return data || [];
  }
}

export const eventPhotoService = new EventPhotoService();
