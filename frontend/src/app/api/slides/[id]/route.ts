/**
 * GET /api/slides/[id]
 * Retrieve slide metadata without generating download URL
 *
 * Feature: 008-voglio-implementare-la - Serverless Architecture with R2 Storage
 * Contract: specs/008-voglio-implementare-la/contracts/slide-metadata.yml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { SlideMetadata } from '@/types/slide';

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
      .select(
        `
        id,
        session_id,
        speech_id,
        filename,
        file_size,
        mime_type,
        r2_key,
        storage_path,
        display_order,
        uploaded_by,
        uploaded_at,
        deleted_at
      `
      )
      .eq('id', slideId)
      .single();

    if (fetchError || !slide) {
      // RLS might block access (403) or row doesn't exist (404)
      // Both cases should return 404 for consistency
      if (fetchError.code === 'PGRST116') {
        // PostgreSQL error: no rows returned
        return NextResponse.json(
          {
            error: 'SLIDE_NOT_FOUND',
            message: 'Slide not found',
          },
          { status: 404 }
        );
      }

      // RLS access denied or other error
      return NextResponse.json(
        {
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to access this slide',
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Return metadata
    // -------------------------------------------------------------------------
    // Return all fields including storage location and deletion status
    // Client can check these fields to determine file availability
    const response = {
      id: slide.id,
      session_id: slide.session_id,
      speech_id: slide.speech_id,
      filename: slide.filename,
      file_size: slide.file_size,
      mime_type: slide.mime_type,
      uploaded_at: slide.uploaded_at,
      deleted_at: slide.deleted_at,
      r2_key: slide.r2_key,
      storage_path: slide.storage_path,
      display_order: slide.display_order,
      uploaded_by: slide.uploaded_by,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in metadata route:', error);
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
export const runtime = 'nodejs';
