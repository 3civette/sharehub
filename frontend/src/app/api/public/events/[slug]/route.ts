/**
 * Public Event API Route
 * Feature: 011-il-momento-di - Public Event Page
 *
 * GET /api/public/events/[slug]
 *
 * Returns complete event data including sessions, speeches, slides, photos, and metrics.
 * Handles both public and private event visibility with token validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePresignedDownloadUrl } from '@/lib/r2';
import type { Database } from '@/types/database.types';

// Initialize Supabase client for API route
// Using service role key to bypass RLS for initial event fetch, then validate access separately
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const { slug } = params;

    // =========================================================================
    // Step 1: Fetch event by slug
    // =========================================================================
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (eventError || !event) {
      console.error(`Event not found: ${slug}`, eventError);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // =========================================================================
    // Step 2: Check visibility and validate token if private
    // =========================================================================
    if (event.visibility === 'private') {
      if (!token) {
        return NextResponse.json(
          { error: 'This is a private event. Please provide a valid access token.' },
          { status: 403 }
        );
      }

      // Validate token using database function
      const { data: tokenValidation, error: tokenError } = await supabase
        .rpc('validate_token_access', {
          p_event_id: event.id,
          p_token: token
        });

      if (tokenError || !tokenValidation || tokenValidation.length === 0 || !tokenValidation[0].is_valid) {
        console.error('Token validation failed:', tokenError);
        return NextResponse.json(
          { error: 'Invalid or expired access token' },
          { status: 403 }
        );
      }

      // Update token usage tracking
      // First, get current use_count
      const { data: tokenData } = await supabase
        .from('access_tokens')
        .select('use_count')
        .eq('id', tokenValidation[0].token_id)
        .single();

      const currentCount = tokenData?.use_count || 0;

      // Then update with incremented value
      await supabase
        .from('access_tokens')
        .update({
          last_used_at: new Date().toISOString(),
          use_count: currentCount + 1
        })
        .eq('id', tokenValidation[0].token_id);
    }

    // =========================================================================
    // Step 3: Fetch sessions with speeches and slides (hierarchical data)
    // =========================================================================
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        room,
        display_order,
        speeches:speeches(
          id,
          title,
          description,
          speaker_name,
          scheduled_time,
          duration_minutes,
          display_order,
          slides:slides!inner(
            id,
            filename,
            mime_type,
            file_size,
            r2_key,
            storage_path,
            display_order,
            deleted_at
          )
        )
      `)
      .eq('event_id', event.id)
      .order('display_order', { ascending: true });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch event sessions' },
        { status: 500 }
      );
    }

    // =========================================================================
    // Step 4: Generate R2 presigned URLs for slides
    // =========================================================================
    const sessionsWithDownloadUrls = await Promise.all(
      (sessions || []).map(async (session: any) => {
        const speechesWithUrls = await Promise.all(
          (session.speeches || []).map(async (speech: any) => {
            const slidesWithUrls = await Promise.all(
              (speech.slides || [])
                .filter((slide: any) => !slide.deleted_at && slide.r2_key) // Only include active slides with R2 keys
                .map(async (slide: any) => {
                  try {
                    // Generate presigned download URL (1 hour expiry)
                    const downloadUrl = await generatePresignedDownloadUrl(slide.r2_key, 3600);

                    return {
                      id: slide.id,
                      filename: slide.filename,
                      mime_type: slide.mime_type, // Full MIME type (e.g., "application/pdf")
                      file_size: slide.file_size,
                      download_url: downloadUrl
                    };
                  } catch (error) {
                    console.error(`Failed to generate presigned URL for slide ${slide.id}:`, error);
                    // Return slide without download URL if R2 fails
                    return {
                      id: slide.id,
                      filename: slide.filename,
                      mime_type: slide.mime_type,
                      file_size: slide.file_size,
                      download_url: null // Will be handled gracefully on frontend
                    };
                  }
                })
            );

            return {
              id: speech.id,
              speaker_name: speech.speaker_name,
              title: speech.title,
              description: speech.description,
              duration_minutes: speech.duration_minutes,
              slides: slidesWithUrls
            };
          })
        );

        return {
          id: session.id,
          title: session.title,
          scheduled_time: session.start_time,
          description: session.description,
          speeches: speechesWithUrls
        };
      })
    );

    // =========================================================================
    // Step 5: Fetch event photos
    // =========================================================================
    const { data: photos, error: photosError } = await supabase
      .from('event_photos')
      .select('id, filename, storage_path, is_cover')
      .eq('event_id', event.id)
      .order('display_order', { ascending: true });

    if (photosError) {
      console.error('Error fetching photos:', photosError);
    }

    // Generate public URLs for photos from Supabase Storage
    const photosWithUrls = (photos || []).map((photo: any) => {
      const { data: publicUrl } = supabase.storage
        .from('event-photos')
        .getPublicUrl(photo.storage_path);

      return {
        id: photo.id,
        image_url: publicUrl.publicUrl,
        caption: photo.filename,
        alt_text: `Photo from ${event.name}`
      };
    });

    // =========================================================================
    // Step 6: Calculate metrics (total downloads)
    // =========================================================================
    const { data: metricsData, error: metricsError } = await supabase
      .from('event_metrics')
      .select('total_slide_downloads, page_views')
      .eq('event_id', event.id)
      .single();

    const metrics = {
      total_downloads: metricsData?.total_slide_downloads || 0,
      page_views: metricsData?.page_views || 0
    };

    // =========================================================================
    // Step 7: Return complete event data
    // =========================================================================
    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        title: event.title,
        organizer: event.organizer,
        slug: event.slug,
        description: event.description,
        date: event.date,
        event_date: event.date,
        status: event.status as 'upcoming' | 'past' | 'archived',
        visibility: event.visibility as 'public' | 'private',
        photos: photosWithUrls
      },
      sessions: sessionsWithDownloadUrls,
      metrics
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/public/events/[slug]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cache configuration: 5 minutes for public events, no cache for private
export const revalidate = 300;
