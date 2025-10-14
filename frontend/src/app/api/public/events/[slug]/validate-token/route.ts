/**
 * Token Validation API Route
 * Feature: 011-il-momento-di - Public Event Page
 *
 * POST /api/public/events/[slug]/validate-token
 *
 * Validates access token for private events.
 * Returns token validity status and token ID if valid.
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

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Parse request body
    const body = await request.json();
    const { token } = body;

    // =========================================================================
    // Step 1: Validate token format (must be exactly 21 characters)
    // =========================================================================
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (token.length !== 21) {
      return NextResponse.json(
        { error: 'Token must be exactly 21 characters' },
        { status: 400 }
      );
    }

    // =========================================================================
    // Step 2: Fetch event by slug
    // =========================================================================
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, visibility')
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
    // Step 3: Validate token using database function
    // =========================================================================
    const { data: tokenValidation, error: validationError } = await supabase
      .rpc('validate_token_access', {
        p_event_id: event.id,
        p_token: token
      });

    if (validationError) {
      console.error('Token validation error:', validationError);
      return NextResponse.json(
        { error: 'Token validation failed' },
        { status: 500 }
      );
    }

    // Check if token is valid
    if (!tokenValidation || tokenValidation.length === 0 || !tokenValidation[0].is_valid) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid or expired token'
      });
    }

    // =========================================================================
    // Step 4: Return valid token response with token ID
    // =========================================================================
    return NextResponse.json({
      valid: true,
      token_id: tokenValidation[0].token_id
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/public/events/[slug]/validate-token:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// No caching for token validation (always fresh check)
export const dynamic = 'force-dynamic';
