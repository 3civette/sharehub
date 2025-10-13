/**
 * GET /api/admin/thumbnails/quota
 * Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
 * Purpose: Get current thumbnail quota status for authenticated tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getQuotaStatus } from '@/services/thumbnailQuotaService';

/**
 * GET Handler - Fetch Thumbnail Quota Status
 * Returns current quota usage for the authenticated user's tenant
 *
 * Response:
 * ```json
 * {
 *   "quota": {
 *     "available": true,
 *     "used": 3,
 *     "total": 5,
 *     "remaining": 2
 *   },
 *   "usage_percent": 60,
 *   "upgrade_url": "/admin/settings/billing?upgrade=thumbnail-quota"
 * }
 * ```
 *
 * HTTP Status Codes:
 * - 200: Quota fetched successfully
 * - 401: Not authenticated
 * - 403: Not authorized (not an admin)
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
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

    // Step 2: Get admin's tenant_id
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

    // Step 3: Fetch quota status
    const quota = await getQuotaStatus(admin.tenant_id);

    // Step 4: Calculate usage percentage
    const usagePercent = Math.round((quota.used / quota.total) * 100);

    // Step 5: Return quota data
    return NextResponse.json(
      {
        quota: {
          available: quota.available,
          used: quota.used,
          total: quota.total,
          remaining: quota.remaining,
        },
        usage_percent: usagePercent,
        upgrade_url: '/admin/settings/billing?upgrade=thumbnail-quota',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching thumbnail quota:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch quota status',
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
