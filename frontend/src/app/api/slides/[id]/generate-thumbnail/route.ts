/**
 * POST /api/slides/[id]/generate-thumbnail
 * Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
 * Purpose: Initiate async thumbnail generation using CloudConvert API
 *
 * Replaces feature 008 local implementation with CloudConvert service
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initiateThumbnailGeneration } from '@/services/cloudConvertService';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST Handler - Generate Thumbnail
 * Initiates CloudConvert job for thumbnail generation
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate slide exists and get event context
 * 3. Call cloudConvertService.initiateThumbnailGeneration()
 * 4. Return 202 Accepted with job ID and quota status
 *
 * Responses:
 * - 202: Thumbnail generation started
 * - 200: Thumbnail already exists
 * - 400: Generation disabled or unsupported file type
 * - 401: Not authenticated
 * - 403: Quota exhausted
 * - 404: Slide not found
 * - 500: Internal server error
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const slideId = params.id;

    // Step 1: Authenticate user
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Step 2: Get slide context (tenant_id, event_id)
    const { data: slide, error: slideError } = await supabase
      .from('slides')
      .select(
        `
        id,
        tenant_id,
        speech_id,
        speeches!inner (
          session_id,
          sessions!inner (
            event_id
          )
        )
      `
      )
      .eq('id', slideId)
      .is('deleted_at', null)
      .single();

    if (slideError || !slide) {
      return NextResponse.json(
        {
          error: 'SLIDE_NOT_FOUND',
          message: 'Slide not found or access denied',
        },
        { status: 404 }
      );
    }

    // Extract event_id from nested relations
    const eventId = (slide.speeches as any).sessions.event_id;

    // Step 3: Verify user has access to this tenant
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', session.user.id)
      .eq('tenant_id', slide.tenant_id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'You do not have access to this tenant',
        },
        { status: 403 }
      );
    }

    // Step 4: Initiate thumbnail generation (handles all business logic)
    const result = await initiateThumbnailGeneration({
      slideId: slide.id,
      tenantId: slide.tenant_id,
      eventId,
    });

    // Step 5: Return appropriate response based on result
    if (!result.success) {
      // Log the error for debugging
      console.error('[ERROR] Thumbnail generation failed:', {
        slideId,
        status: result.status,
        message: result.message,
        quota: result.quota,
      });

      // Map status to HTTP status code
      let httpStatus = 400;
      if (result.status === 'quota_exhausted') {
        httpStatus = 403;
      } else if (result.status === 'failed') {
        httpStatus = 500;
      }

      return NextResponse.json(
        {
          error: result.status.toUpperCase(),
          message: result.message,
          quota: result.quota,
          ...(result.upgradeUrl && { upgrade_url: result.upgradeUrl }),
        },
        { status: httpStatus }
      );
    }

    // Success case
    if (result.status === 'completed') {
      // Thumbnail already exists
      return NextResponse.json(
        {
          message: result.message,
          status: result.status,
          slide_id: slideId,
          quota: result.quota,
        },
        { status: 200 }
      );
    }

    // Thumbnail generation started
    return NextResponse.json(
      {
        message: result.message,
        status: result.status,
        slide_id: slideId,
        job_id: result.jobId,
        quota: result.quota,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Unexpected error in generate-thumbnail:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Export runtime configuration
 * Use Node.js runtime for CloudConvert SDK compatibility
 */
export const runtime = 'nodejs';

/**
 * Disable Next.js static optimization
 * This route needs dynamic behavior (database queries, API calls)
 */
export const dynamic = 'force-dynamic';
