/**
 * PATCH /api/banners/[bannerId] - Update banner properties
 * DELETE /api/banners/[bannerId] - Soft delete banner
 *
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 * Contract: specs/010-ok-now-i/contracts/banners.yml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import BannerValidation from '@/lib/banners';
import type { Database } from '@/types/database.types';

// =============================================================================
// Request Validation Schemas
// =============================================================================

const updateBannerSchema = z.object({
  is_active: z.boolean().optional(),
  click_url: z
    .string()
    .nullable()
    .optional()
    .refine((url) => BannerValidation.validateClickUrl(url), {
      message: 'Invalid URL format. URL must start with http:// or https://',
    }),
});

// Immutable fields that cannot be updated
const IMMUTABLE_FIELDS = [
  'id',
  'tenant_id',
  'event_id',
  'slot_number',
  'storage_path',
  'filename',
  'file_size',
  'mime_type',
  'created_at',
  'deleted_at',
];

// =============================================================================
// PATCH Handler - Update Banner
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { bannerId: string } }
) {
  try {
    const bannerId = params.bannerId;

    // -------------------------------------------------------------------------
    // Step 1: Authenticate user
    // -------------------------------------------------------------------------
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 2: Parse and validate request body
    // -------------------------------------------------------------------------
    let body: z.infer<typeof updateBannerSchema>;

    try {
      const rawBody = await request.json();

      // Check for immutable field attempts
      const attemptedFields = Object.keys(rawBody);
      const immutableAttempt = attemptedFields.find((field) =>
        IMMUTABLE_FIELDS.includes(field)
      );

      if (immutableAttempt) {
        return NextResponse.json(
          {
            error: 'IMMUTABLE_FIELD',
            message: `Field '${immutableAttempt}' cannot be modified`,
            field: immutableAttempt,
          },
          { status: 400 }
        );
      }

      body = updateBannerSchema.parse(rawBody);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return NextResponse.json(
          {
            error: 'INVALID_URL_FORMAT',
            message: firstError.message,
            field: firstError.path[0],
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'Invalid request body',
        },
        { status: 400 }
      );
    }

    // Check if any update fields provided
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        {
          error: 'NO_FIELDS_TO_UPDATE',
          message: 'No valid fields provided for update',
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 3: Verify banner exists and belongs to user's tenant (via RLS)
    // -------------------------------------------------------------------------
    const { data: existingBanner, error: fetchError } = await supabase
      .from('banners')
      .select('*')
      .eq('id', bannerId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingBanner) {
      return NextResponse.json(
        {
          error: 'BANNER_NOT_FOUND',
          message: 'Banner not found or access denied',
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Update banner in database
    // -------------------------------------------------------------------------
    const { data: updatedBanner, error: updateError } = await supabase
      .from('banners')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bannerId)
      .select('*')
      .single();

    if (updateError || !updatedBanner) {
      console.error('Failed to update banner:', updateError);
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to update banner',
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 5: Return updated banner
    // -------------------------------------------------------------------------
    return NextResponse.json(updatedBanner, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/banners/[bannerId]:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE Handler - Soft Delete Banner
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { bannerId: string } }
) {
  try {
    const bannerId = params.bannerId;

    // -------------------------------------------------------------------------
    // Step 1: Authenticate user
    // -------------------------------------------------------------------------
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 2: Verify banner exists and belongs to user's tenant (via RLS)
    // -------------------------------------------------------------------------
    const { data: existingBanner, error: fetchError } = await supabase
      .from('banners')
      .select('*')
      .eq('id', bannerId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingBanner) {
      return NextResponse.json(
        {
          error: 'BANNER_NOT_FOUND',
          message: 'Banner not found or access denied',
        },
        { status: 404 }
      );
    }

    const storagePath = existingBanner.storage_path;

    // -------------------------------------------------------------------------
    // Step 3: Soft delete banner in database
    // -------------------------------------------------------------------------
    const now = new Date().toISOString();

    const { data: deletedBanner, error: deleteError } = await supabase
      .from('banners')
      .update({
        deleted_at: now,
        updated_at: now,
        is_active: false, // Also deactivate
      })
      .eq('id', bannerId)
      .select('*')
      .single();

    if (deleteError || !deletedBanner) {
      console.error('Failed to soft delete banner:', deleteError);
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to delete banner',
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Delete file from Supabase Storage
    // -------------------------------------------------------------------------
    // Note: We do this after soft delete to ensure metadata is preserved
    // even if storage deletion fails
    const { error: storageError } = await supabase.storage
      .from('banners')
      .remove([storagePath]);

    if (storageError) {
      console.warn('Failed to delete banner file from storage:', storageError);
      // Don't fail the request - soft delete succeeded
    }

    // -------------------------------------------------------------------------
    // Step 5: Return success response
    // -------------------------------------------------------------------------
    return NextResponse.json(
      {
        message: 'Banner deleted successfully',
        id: bannerId,
        deleted_at: now,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/banners/[bannerId]:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Runtime Configuration
// =============================================================================
export const runtime = 'nodejs';
