/**
 * GET /api/public/events/[slug]/banners - Public banner access for event pages
 *
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 * Contract: specs/010-ok-now-i/contracts/banners.yml
 *
 * PUBLIC ENDPOINT - No authentication required
 * Only returns active banners for public events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

type Banner = Database['public']['Tables']['banners']['Row'];

interface PublicBannerResponse {
  id: string;
  event_id: string;
  slot_number: number;
  filename: string;
  click_url: string | null;
  image_url: string; // Signed URL for banner image
  created_at: string;
}

// =============================================================================
// GET Handler - Public Banner Access
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const eventSlug = params.slug;

    // -------------------------------------------------------------------------
    // Step 1: Create Supabase client (no auth required for public access)
    // -------------------------------------------------------------------------
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // -------------------------------------------------------------------------
    // Step 2: Fetch event by slug and verify it's public
    // -------------------------------------------------------------------------
    // RLS policy "events_public_read" automatically enforces visibility='public'
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, visibility')
      .eq('slug', eventSlug)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(
        {
          error: 'EVENT_NOT_PUBLIC',
          message: 'Event not found or not publicly accessible',
        },
        { status: 404 }
      );
    }

    // Double-check visibility (defense in depth)
    if (eventData.visibility !== 'public') {
      return NextResponse.json(
        {
          error: 'EVENT_NOT_PUBLIC',
          message: 'Event is not publicly accessible',
        },
        { status: 404 }
      );
    }

    const eventId = eventData.id;

    // -------------------------------------------------------------------------
    // Step 3: Fetch active banners for public event
    // -------------------------------------------------------------------------
    // RLS policy "banners_public_read" automatically filters:
    // - Only banners for public events
    // - Only active banners (is_active = true)
    // - Only non-deleted banners (deleted_at IS NULL)
    const { data: banners, error: bannersError } = await supabase
      .from('banners')
      .select('id, event_id, slot_number, filename, storage_path, click_url, created_at')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('slot_number', { ascending: true });

    if (bannersError) {
      console.error('Failed to fetch public banners:', bannersError);
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch banners',
        },
        { status: 500 }
      );
    }

    // If no banners, return empty array (not an error)
    if (!banners || banners.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // -------------------------------------------------------------------------
    // Step 4: Generate signed URLs for banner images
    // -------------------------------------------------------------------------
    const bannersWithUrls: PublicBannerResponse[] = await Promise.all(
      banners.map(async (banner) => {
        // Generate signed URL valid for 1 hour
        const { data: signedUrlData } = await supabase.storage
          .from('banners')
          .createSignedUrl(banner.storage_path, 3600); // 1 hour expiry

        return {
          id: banner.id,
          event_id: banner.event_id,
          slot_number: banner.slot_number,
          filename: banner.filename,
          click_url: banner.click_url,
          image_url: signedUrlData?.signedUrl || '',
          created_at: banner.created_at,
        };
      })
    );

    // -------------------------------------------------------------------------
    // Step 5: Return banners with CORS headers for public access
    // -------------------------------------------------------------------------
    return NextResponse.json(bannersWithUrls, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow all origins for public data
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/public/events/[slug]/banners:', error);
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
// OPTIONS Handler - CORS Preflight
// =============================================================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

// =============================================================================
// Runtime Configuration
// =============================================================================
export const runtime = 'nodejs';
