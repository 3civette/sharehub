// Feature 004: Public Event Service
// Date: 2025-10-07
// Service for retrieving public event data with full hierarchy

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PublicEventResponse {
  event: {
    id: string;
    slug: string;
    name: string;
    date: string;
    description: string | null;
    status: 'upcoming' | 'past' | 'archived';
    visibility: 'public' | 'private';
  };
  sessions: {
    id: string;
    title: string;
    description: string | null;
    scheduled_time: string | null;
    speeches: {
      id: string;
      title: string;
      speaker_name: string;
      duration_minutes: number | null;
      description: string | null;
      slides: {
        id: string;
        filename: string;
        file_size: number;
        mime_type: string;
        download_url: string;
      }[];
    }[];
  }[];
  metrics: {
    page_views: number;
    total_slide_downloads: number;
  };
}

/**
 * Get public event by slug with full hierarchy (sessions → speeches → slides)
 * @param slug Event slug
 * @param tokenId Optional validated token ID for private events
 * @returns PublicEventResponse
 * @throws Error if event not found or access denied
 */
export async function getPublicEvent(
  slug: string,
  tokenId?: string
): Promise<PublicEventResponse> {
  // 1. Fetch event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, slug, name, date, description, status, visibility, tenant_id')
    .eq('slug', slug)
    .single();

  if (eventError || !event) {
    throw new Error('Event not found');
  }

  // 2. Check access for private events
  if (event.visibility === 'private') {
    if (!tokenId) {
      const error: any = new Error('This is a private event. Please provide a valid access token.');
      error.status = 403;
      throw error;
    }

    // Verify token is valid for this event
    const { data: token, error: tokenError } = await supabase
      .from('access_tokens')
      .select('id, expires_at')
      .eq('id', tokenId)
      .eq('event_id', event.id)
      .single();

    if (tokenError || !token || new Date(token.expires_at) < new Date()) {
      const error: any = new Error('Invalid or expired token');
      error.status = 403;
      throw error;
    }
  }

  // 3. Fetch sessions, speeches, slides, and metrics in parallel
  const [
    { data: sessions },
    { data: metrics }
  ] = await Promise.all([
    supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        scheduled_time,
        display_order
      `)
      .eq('event_id', event.id)
      .order('display_order', { ascending: true }),

    supabase
      .from('event_metrics')
      .select('page_views, total_slide_downloads')
      .eq('event_id', event.id)
      .single()
  ]);

  if (!sessions || sessions.length === 0) {
    return {
      event: {
        id: event.id,
        slug: event.slug,
        name: event.name,
        date: event.date,
        description: event.description,
        status: event.status,
        visibility: event.visibility
      },
      sessions: [],
      metrics: metrics || { page_views: 0, total_slide_downloads: 0 }
    };
  }

  // 4. Fetch speeches for all sessions
  const { data: speeches } = await supabase
    .from('speeches')
    .select(`
      id,
      session_id,
      title,
      speaker_name,
      duration_minutes,
      description,
      display_order
    `)
    .in('session_id', sessions.map(s => s.id))
    .order('display_order', { ascending: true });

  // 5. Fetch slides for all speeches
  const speechIds = speeches?.map(sp => sp.id) || [];
  const { data: slides } = speechIds.length > 0
    ? await supabase
        .from('slides')
        .select(`
          id,
          speech_id,
          filename,
          storage_path,
          file_size,
          mime_type,
          display_order
        `)
        .in('speech_id', speechIds)
        .order('display_order', { ascending: true })
    : { data: [] };

  // 6. Generate signed URLs for slides
  const slidesWithUrls = await Promise.all(
    (slides || []).map(async (slide) => {
      const { data: signedUrl } = await supabase.storage
        .from('slides')
        .createSignedUrl(slide.storage_path, 60); // 60 seconds expiry

      return {
        id: slide.id,
        speech_id: slide.speech_id,
        filename: slide.filename,
        file_size: slide.file_size,
        mime_type: slide.mime_type,
        download_url: signedUrl?.signedUrl || ''
      };
    })
  );

  // 7. Build hierarchical structure
  const sessionsWithSpeeches = sessions.map(session => {
    const sessionSpeeches = (speeches || [])
      .filter(sp => sp.session_id === session.id)
      .map(speech => {
        const speechSlides = slidesWithUrls
          .filter(sl => sl.speech_id === speech.id)
          .map(({ speech_id, ...slide }) => slide); // Remove speech_id from response

        return {
          id: speech.id,
          title: speech.title,
          speaker_name: speech.speaker_name,
          duration_minutes: speech.duration_minutes,
          description: speech.description,
          slides: speechSlides
        };
      });

    return {
      id: session.id,
      title: session.title,
      description: session.description,
      scheduled_time: session.scheduled_time,
      speeches: sessionSpeeches
    };
  });

  // 8. Increment page_views (fire and forget)
  supabase
    .from('event_metrics')
    .update({ page_views: (metrics?.page_views || 0) + 1 })
    .eq('event_id', event.id)
    .then(); // Don't await

  return {
    event: {
      id: event.id,
      slug: event.slug,
      name: event.name,
      date: event.date,
      description: event.description,
      status: event.status,
      visibility: event.visibility
    },
    sessions: sessionsWithSpeeches,
    metrics: metrics || { page_views: 0, total_slide_downloads: 0 }
  };
}

/**
 * Get public metrics for event (page_views and total_slide_downloads only)
 * @param slug Event slug
 * @returns Public metrics
 * @throws Error if event not found
 */
export async function getPublicMetrics(slug: string): Promise<{
  page_views: number;
  total_slide_downloads: number;
}> {
  // Get event ID from slug
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single();

  if (eventError || !event) {
    throw new Error('Event not found');
  }

  // Get public metrics (exclude premium field)
  const { data: metrics, error: metricsError } = await supabase
    .from('event_metrics')
    .select('page_views, total_slide_downloads')
    .eq('event_id', event.id)
    .single();

  if (metricsError || !metrics) {
    return { page_views: 0, total_slide_downloads: 0 };
  }

  return {
    page_views: metrics.page_views || 0,
    total_slide_downloads: metrics.total_slide_downloads || 0
  };
}

/**
 * Validate access token for private event
 * @param slug Event slug
 * @param token Access token (21 characters)
 * @returns Token validation result
 */
export async function validateToken(slug: string, token: string): Promise<{
  valid: boolean;
  token_type: string | null;
  expires_at: string | null;
  message?: string;
  token_id?: string;
}> {
  // Validate token format
  if (!token || token.length !== 21) {
    return {
      valid: false,
      token_type: null,
      expires_at: null,
      message: 'Token must be exactly 21 characters'
    };
  }

  // Get event ID from slug
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single();

  if (eventError || !event) {
    return {
      valid: false,
      token_type: null,
      expires_at: null,
      message: 'Event not found'
    };
  }

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('access_tokens')
    .select('id, token_type, expires_at')
    .eq('token', token)
    .eq('event_id', event.id)
    .single();

  if (tokenError || !tokenData) {
    return {
      valid: false,
      token_type: null,
      expires_at: null,
      message: 'Token not found or does not match this event'
    };
  }

  // Check expiration
  if (new Date(tokenData.expires_at) < new Date()) {
    return {
      valid: false,
      token_type: null,
      expires_at: null,
      message: 'Token expired'
    };
  }

  // Update last_used_at and use_count
  await supabase
    .from('access_tokens')
    .update({
      last_used_at: new Date().toISOString(),
      use_count: supabase.rpc('increment', { row_id: tokenData.id })
    })
    .eq('id', tokenData.id);

  return {
    valid: true,
    token_type: tokenData.token_type,
    expires_at: tokenData.expires_at,
    token_id: tokenData.id
  };
}
