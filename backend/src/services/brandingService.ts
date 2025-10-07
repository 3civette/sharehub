// Admin Branding Service
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)

import { createClient } from '@supabase/supabase-js';
import { Branding, BrandingUpdateInput, DEFAULT_BRANDING } from '../models/admin';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Get tenant branding configuration
 * @param tenantId Tenant UUID
 * @returns Branding configuration
 * @throws Error if tenant not found or database error
 */
export async function getBranding(tenantId: string): Promise<Branding> {
  const { data, error } = await supabase
    .from('tenants')
    .select('branding')
    .eq('id', tenantId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch branding: ${error.message}`);
  }

  if (!data) {
    throw new Error('Tenant not found');
  }

  // Return branding or default values
  return data.branding || DEFAULT_BRANDING;
}

/**
 * Update tenant branding colors
 * @param tenantId Tenant UUID
 * @param input Branding update input (colors only)
 * @returns Updated branding configuration
 * @throws Error if validation fails or database error
 */
export async function updateBranding(
  tenantId: string,
  input: BrandingUpdateInput
): Promise<Branding> {
  // Validate hex color format
  if (input.primary_color && !isValidHexColor(input.primary_color)) {
    throw new Error('Primary color must be a valid hex color (#RRGGBB)');
  }

  if (input.secondary_color && !isValidHexColor(input.secondary_color)) {
    throw new Error('Secondary color must be a valid hex color (#RRGGBB)');
  }

  // Get current branding
  const currentBranding = await getBranding(tenantId);

  // Merge with new values
  const updatedBranding: Branding = {
    primary_color: input.primary_color || currentBranding.primary_color,
    secondary_color: input.secondary_color || currentBranding.secondary_color,
    logo_url: currentBranding.logo_url // Logo not updated via this endpoint
  };

  // Update in database
  const { data, error } = await supabase
    .from('tenants')
    .update({ branding: updatedBranding })
    .eq('id', tenantId)
    .select('branding')
    .single();

  if (error) {
    throw new Error(`Failed to update branding: ${error.message}`);
  }

  return data.branding;
}

/**
 * Upload tenant logo to Supabase Storage
 * @param tenantId Tenant UUID
 * @param file Multer file object
 * @returns Public URL of uploaded logo
 * @throws Error if upload fails or validation error
 */
export async function uploadLogo(
  tenantId: string,
  file: Express.Multer.File
): Promise<string> {
  // Validate file type
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only PNG, JPG, and SVG are allowed');
  }

  // Validate file size (2MB max)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 2MB limit');
  }

  // Get current branding to check if logo exists
  const currentBranding = await getBranding(tenantId);

  // Delete old logo if exists
  if (currentBranding.logo_url) {
    const oldPath = extractStoragePath(currentBranding.logo_url);
    if (oldPath) {
      await supabase.storage.from('logos').remove([oldPath]);
    }
  }

  // Upload new logo
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${tenantId}/${Date.now()}.${fileExtension}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('logos')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Failed to upload logo: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('logos')
    .getPublicUrl(fileName);

  const logoUrl = urlData.publicUrl;

  // Update branding with new logo URL
  const updatedBranding: Branding = {
    ...currentBranding,
    logo_url: logoUrl
  };

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ branding: updatedBranding })
    .eq('id', tenantId);

  if (updateError) {
    // Rollback: delete uploaded file
    await supabase.storage.from('logos').remove([fileName]);
    throw new Error(`Failed to update branding with logo URL: ${updateError.message}`);
  }

  return logoUrl;
}

/**
 * Delete tenant logo
 * @param tenantId Tenant UUID
 * @throws Error if deletion fails
 */
export async function deleteLogo(tenantId: string): Promise<void> {
  const currentBranding = await getBranding(tenantId);

  if (!currentBranding.logo_url) {
    throw new Error('No logo to delete');
  }

  // Extract storage path from URL
  const storagePath = extractStoragePath(currentBranding.logo_url);

  if (storagePath) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('logos')
      .remove([storagePath]);

    if (storageError) {
      console.error('Failed to delete logo from storage:', storageError);
      // Continue anyway to update database
    }
  }

  // Update branding to remove logo URL
  const updatedBranding: Branding = {
    ...currentBranding,
    logo_url: null
  };

  const { error } = await supabase
    .from('tenants')
    .update({ branding: updatedBranding })
    .eq('id', tenantId);

  if (error) {
    throw new Error(`Failed to remove logo URL from branding: ${error.message}`);
  }
}

/**
 * Reset branding to default values
 * @param tenantId Tenant UUID
 * @returns Default branding configuration
 * @throws Error if reset fails
 */
export async function resetBranding(tenantId: string): Promise<Branding> {
  const currentBranding = await getBranding(tenantId);

  // Delete logo if exists
  if (currentBranding.logo_url) {
    try {
      await deleteLogo(tenantId);
    } catch (error) {
      console.error('Failed to delete logo during reset:', error);
      // Continue with reset
    }
  }

  // Update branding to defaults
  const { data, error } = await supabase
    .from('tenants')
    .update({ branding: DEFAULT_BRANDING })
    .eq('id', tenantId)
    .select('branding')
    .single();

  if (error) {
    throw new Error(`Failed to reset branding: ${error.message}`);
  }

  return data.branding;
}

/**
 * Extract storage path from Supabase public URL
 * @param publicUrl Full public URL from Supabase Storage
 * @returns Storage path (e.g., "tenant-id/filename.png") or null if invalid
 */
function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const pathMatch = url.pathname.match(/\/logos\/(.+)$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}
