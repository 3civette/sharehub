/**
 * GET /api/slides/[id]/download
 * Generate presigned R2 download URL for direct client → R2 download
 *
 * Feature: 008-voglio-implementare-la - Serverless Architecture with R2 Storage
 * Contract: specs/008-voglio-implementare-la/contracts/presigned-download.yml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import R2 from '@/lib/r2';
import type { SlideDownloadResponse } from '@/types/slide';

// =============================================================================
// Path Parameter Validation
// =============================================================================

const uuidSchema = z.string().uuid({ message: 'Invalid slide ID format' });

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // -------------------------------------------------------------------------
    // Step 1: Authenticate user
    // -------------------------------------------------------------------------
    const supabase = createRouteHandlerClient({ cookies });
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
    // Step 2: Validate slide ID parameter
    // -------------------------------------------------------------------------
    const slideIdValidation = uuidSchema.safeParse(params.id);

    if (!slideIdValidation.success) {
      return NextResponse.json(
        {
          error: 'INVALID_SLIDE_ID',
          message: 'Slide ID must be a valid UUID',
        },
        { status: 400 }
      );
    }

    const slideId = slideIdValidation.data;

    // -------------------------------------------------------------------------
    // Step 3: Fetch slide metadata from database
    // -------------------------------------------------------------------------
    // RLS policies automatically enforce tenant isolation
    const { data: slide, error: fetchError } = await supabase
      .from('slides')
      .select('id, filename, file_size, mime_type, r2_key, storage_path, deleted_at, tenant_id')
      .eq('id', slideId)
      .single();

    if (fetchError || !slide) {
      return NextResponse.json(
        {
          error: 'SLIDE_NOT_FOUND',
          message: 'Slide not found',
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Check if slide has been deleted
    // -------------------------------------------------------------------------
    if (slide.deleted_at) {
      return NextResponse.json(
        {
          error: 'FILE_EXPIRED',
          message: 'File has been automatically deleted after 48-hour retention period',
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 5: Check storage type (R2 vs legacy Supabase Storage)
    // -------------------------------------------------------------------------
    if (!slide.r2_key) {
      // Legacy slide (Supabase Storage)
      // TODO: Implement fallback to legacy storage if needed
      // For now, return error indicating migration needed
      return NextResponse.json(
        {
          error: 'LEGACY_STORAGE',
          message: 'This file uses legacy storage. Migration to R2 required.',
        },
        { status: 501 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 6: Generate presigned download URL
    // -------------------------------------------------------------------------
    let downloadUrl: string;
    try {
      downloadUrl = await R2.generateDownloadUrl(slide.r2_key);
    } catch (error) {
      console.error('Failed to generate presigned download URL:', error);
      return NextResponse.json(
        {
          error: 'R2_CONNECTION_FAILED',
          message: 'Failed to generate download URL. Please try again.',
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 7: Calculate expiry timestamp
    // -------------------------------------------------------------------------
    const expiresAt = R2.calculateExpiry(R2.PRESIGNED_URL_EXPIRY);

    // -------------------------------------------------------------------------
    // Step 8: Return response
    // -------------------------------------------------------------------------
    const response: SlideDownloadResponse = {
      download_url: downloadUrl,
      filename: slide.filename,
      file_size: slide.file_size,
      mime_type: slide.mime_type,
      expires_at: expiresAt,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in download route:', error);
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
// Export runtime configuration
// =============================================================================
export const runtime = 'nodejs'; // Use Node.js runtime for AWS SDK compatibility
