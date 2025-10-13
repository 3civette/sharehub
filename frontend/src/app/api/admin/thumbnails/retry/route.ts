/**
 * POST /api/admin/thumbnails/retry
 * Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
 * Purpose: Retry thumbnail generation for failed slides
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { retryThumbnailGeneration } from '@/services/cloudConvertService';

/**
 * POST Handler - Retry Thumbnail Generation
 * Allows admins to manually retry failed thumbnail generation
 *
 * Request Body:
 * ```json
 * {
 *   "slide_id": "uuid"
 * }
 * ```
 *
 * Response (Success):
 * ```json
 * {
 *   "message": "Thumbnail generation restarted",
 *   "status": "processing",
 *   "slide_id": "uuid",
 *   "job_id": "cloudconvert-job-id",
 *   "quota": {
 *     "used": 4,
 *     "total": 5,
 *     "remaining": 1
 *   }
 * }
 * ```
 *
 * HTTP Status Codes:
 * - 202: Retry initiated successfully
 * - 400: Invalid request or disabled
 * - 401: Not authenticated
 * - 403: Quota exhausted or no access
 * - 404: Slide not found
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse request body
    const body = await request.json();
    const { slide_id } = body;

    if (!slide_id || typeof slide_id !== 'string') {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'slide_id is required',
        },
        { status: 400 }
      );
    }

    // Step 2: Authenticate user
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

    // Step 3: Verify admin has access to this slide
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('tenant_id')
      .eq('id', session.user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Admin account not found',
        },
        { status: 403 }
      );
    }

    // Verify slide belongs to admin's tenant
    const { data: slide, error: slideError } = await supabase
      .from('slides')
      .select('id, tenant_id')
      .eq('id', slide_id)
      .eq('tenant_id', admin.tenant_id)
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

    // Step 4: Retry thumbnail generation
    const result = await retryThumbnailGeneration(slide_id);

    // Step 5: Return response based on result
    if (!result.success) {
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

    // Success
    return NextResponse.json(
      {
        message: 'Thumbnail generation restarted',
        status: result.status,
        slide_id,
        job_id: result.jobId,
        quota: result.quota,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error retrying thumbnail generation:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to retry thumbnail generation',
      },
      { status: 500 }
    );
  }
}

/**
 * Export runtime configuration
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
