/**
 * Event Metrics API Route
 * Feature: 011-il-momento-di - Public Event Page
 *
 * GET /api/public/events/[slug]/metrics
 *
 * Returns event metrics including total downloads and page views.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Initialize Supabase client for API route
// Using service role key to bypass RLS
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // =========================================================================
    // Step 1: Fetch event by slug
    // =========================================================================
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
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
    // Step 2: Fetch metrics from event_metrics table
    // =========================================================================
    const { data: metricsData, error: metricsError } = await supabase
      .from('event_metrics')
      .select('total_slide_downloads, page_views')
      .eq('event_id', event.id)
      .single();

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);

      // If no metrics record exists yet, return zeros
      if (metricsError.code === 'PGRST116') {
        return NextResponse.json({
          event_id: event.id,
          total_downloads: 0,
          page_views: 0
        });
      }

      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }

    // =========================================================================
    // Step 3: Return metrics
    // =========================================================================
    return NextResponse.json({
      event_id: event.id,
      total_downloads: metricsData?.total_slide_downloads || 0,
      page_views: metricsData?.page_views || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/public/events/[slug]/metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cache metrics for 1 minute (frequently updated data)
export const revalidate = 60;
