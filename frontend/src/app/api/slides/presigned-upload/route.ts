/**
 * POST /api/slides/presigned-upload
 * Generate presigned R2 upload URL for direct client → R2 upload
 *
 * Feature: 008-voglio-implementare-la - Serverless Architecture with R2 Storage
 * Contract: specs/008-voglio-implementare-la/contracts/presigned-upload.yml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import R2 from '@/lib/r2';
import type { SlideUploadRequest, SlideUploadResponse } from '@/types/slide';

// =============================================================================
// Request Validation Schema
// =============================================================================

const uploadRequestSchema = z.object({
  speech_id: z.string().uuid({ message: 'speech_id must be a valid UUID' }),
  filename: z
    .string()
    .min(1, 'filename is required')
    .max(255, 'filename must not exceed 255 characters'),
  file_size: z
    .number()
    .int()
    .positive()
    .max(R2.MAX_FILE_SIZE, `file_size must not exceed 1GB (${R2.MAX_FILE_SIZE} bytes)`),
  mime_type: z
    .string()
    .refine((type) => R2.validateFileType(type), {
      message: 'mime_type must be one of: PDF, PPT, PPTX, JPEG, PNG',
    }),
});

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
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

    const userId = session.user.id;

    // -------------------------------------------------------------------------
    // Step 2: Parse and validate request body
    // -------------------------------------------------------------------------
    let body: SlideUploadRequest;

    try {
      const rawBody = await request.json();
      body = uploadRequestSchema.parse(rawBody);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = (error as any).errors[0];
        return NextResponse.json(
          {
            error: 'MISSING_REQUIRED_FIELD',
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

    const { speech_id, filename, file_size, mime_type } = body;

    // -------------------------------------------------------------------------
    // Step 3: Additional validation
    // -------------------------------------------------------------------------
    if (!R2.validateFileSize(file_size)) {
      return NextResponse.json(
        {
          error: 'FILE_SIZE_EXCEEDS_LIMIT',
          message: R2.getFileSizeError(file_size),
          field: 'file_size',
        },
        { status: 400 }
      );
    }

    if (!R2.validateFileType(mime_type)) {
      return NextResponse.json(
        {
          error: 'INVALID_FILE_TYPE',
          message: R2.getFileTypeError(mime_type),
          field: 'mime_type',
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Verify speech exists and belongs to user's tenant (via RLS)
    // -------------------------------------------------------------------------
    // RLS policies automatically enforce tenant isolation
    const { data: speechData, error: speechError } = await supabase
      .from('speeches')
      .select('id, session_id, tenant_id, sessions(event_id)')
      .eq('id', speech_id)
      .single();

    if (speechError || !speechData) {
      return NextResponse.json(
        {
          error: 'INVALID_SPEECH',
          message: 'Speech not found or access denied',
          field: 'speech_id',
        },
        { status: 400 }
      );
    }

    const tenant_id = speechData.tenant_id;
    const event_id = (speechData.sessions as any)?.event_id;

    // -------------------------------------------------------------------------
    // Step 5: Generate unique slide ID
    // -------------------------------------------------------------------------
    const slideId = crypto.randomUUID();

    // -------------------------------------------------------------------------
    // Step 6: Generate R2 key
    // -------------------------------------------------------------------------
    const r2Key = R2.generateKey(tenant_id, event_id, slideId, filename);

    // -------------------------------------------------------------------------
    // Step 6.5: Calculate next display_order atomically
    // -------------------------------------------------------------------------
    // Use PostgreSQL function with row-level locking to prevent race conditions
    const { data: displayOrderResult, error: displayOrderError } = await supabase.rpc(
      'get_next_display_order',
      { p_speech_id: speech_id }
    );

    console.log('[DEBUG] Display order calculation:', {
      speech_id,
      displayOrderResult,
      displayOrderError,
    });

    if (displayOrderError || displayOrderResult === null) {
      console.error('Failed to get next display_order:', displayOrderError);
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to calculate slide order',
        },
        { status: 500 }
      );
    }

    const nextDisplayOrder = displayOrderResult;
    console.log('[DEBUG] Using display_order:', nextDisplayOrder);

    // -------------------------------------------------------------------------
    // Step 7: Create slide metadata in database
    // -------------------------------------------------------------------------
    const { data: slide, error: insertError } = await supabase
      .from('slides')
      .insert({
        id: slideId,
        speech_id: speech_id,
        tenant_id: tenant_id,
        filename: filename,
        file_size: file_size,
        mime_type: mime_type,
        r2_key: r2Key,
        uploaded_by: `admin:${userId}`,
        uploaded_at: new Date().toISOString(),
        storage_path: null, // R2 only, no Supabase Storage
        deleted_at: null,
        thumbnail_status: 'pending', // Initialize thumbnail generation status
        display_order: nextDisplayOrder, // Set unique display order
      })
      .select('id, r2_key, uploaded_at')
      .single();

    if (insertError || !slide) {
      console.error('Failed to create slide metadata:', insertError);
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to create slide metadata',
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 8: Generate presigned upload URL
    // -------------------------------------------------------------------------
    let uploadUrl: string;
    try {
      uploadUrl = await R2.generateUploadUrl(r2Key, mime_type);
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);

      // Rollback: Delete the metadata record since upload URL failed
      await supabase.from('slides').delete().eq('id', slideId);

      return NextResponse.json(
        {
          error: 'R2_CONNECTION_FAILED',
          message: 'Failed to generate upload URL. Please try again.',
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 9: Calculate expiry timestamp
    // -------------------------------------------------------------------------
    const expiresAt = R2.calculateExpiry(R2.PRESIGNED_URL_EXPIRY);

    // -------------------------------------------------------------------------
    // Step 10: Return response
    // -------------------------------------------------------------------------
    const response: SlideUploadResponse = {
      upload_url: uploadUrl,
      slide_id: slideId,
      r2_key: r2Key,
      expires_at: expiresAt,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in presigned-upload:', error);
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
// Export runtime configuration (optional - use Edge Runtime for faster cold starts)
// =============================================================================
export const runtime = 'nodejs'; // Use Node.js runtime for AWS SDK compatibility
