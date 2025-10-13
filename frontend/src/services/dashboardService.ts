// Feature 005-ora-facciamo-la: Event Management Dashboard
// Service: Dashboard API client

import { createClient } from '@supabase/supabase-js';
import { Event, AccessToken } from '@/types/admin';

interface Session {
  id: string;
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  room: string | null;
  created_at: string;
  updated_at: string;
}

interface Speech {
  id: string;
  session_id: string;
  event_id: string;
  title: string;
  speaker_name: string;
  description: string | null;
  duration: number | null;
  slide_count: number;
  session: {
    title: string;
  };
  created_at: string;
  updated_at: string;
}

interface EventPhoto {
  id: string;
  event_id: string;
  storage_path: string;
  caption: string | null;
  uploaded_at: string;
}

interface MetricsSummary {
  pageViews: number;
  slideDownloads: number;
  participantCount: number;
  lastRefreshed: string;
}

export interface DashboardData {
  event: Event;
  tokens: AccessToken[];
  sessions: Session[];
  speeches: Speech[];
  photos: EventPhoto[];
  metrics: MetricsSummary;
}

/**
 * Fetch complete dashboard data for an event
 * @param eventId - Event UUID
 * @param token - Supabase auth token
 * @returns Dashboard data with all related resources
 */
export async function fetchDashboardData(
  eventId: string,
  token: string
): Promise<DashboardData> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) {
    if (eventError.code === 'PGRST116') {
      throw new Error('Event not found');
    }
    throw new Error('You do not have access to this event');
  }

  // Fetch access tokens
  const { data: tokens } = await supabase
    .from('access_tokens')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  // Fetch sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('event_id', eventId)
    .order('start_time', { ascending: true });

  // Fetch speeches with session info
  const { data: speeches } = await supabase
    .from('speeches')
    .select(`
      *,
      session:sessions!inner(title)
    `)
    .eq('session.event_id', eventId)
    .order('created_at', { ascending: true });

  // Fetch photos
  const { data: photos } = await supabase
    .from('event_photos')
    .select('*')
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false });

  // Calculate metrics (placeholder - can be enhanced with actual analytics)
  const metrics: MetricsSummary = {
    pageViews: 0,
    slideDownloads: speeches?.reduce((sum, s) => sum + (s.slide_count || 0), 0) || 0,
    participantCount: tokens?.length || 0,
    lastRefreshed: new Date().toISOString(),
  };

  return {
    event,
    tokens: tokens || [],
    sessions: sessions || [],
    speeches: speeches || [],
    photos: photos || [],
    metrics,
  };
}

/**
 * Download QR code PNG for a participant token
 * TODO: Migrate to Next.js API route at /api/admin/tokens/[id]/qr
 * @param eventId - Event UUID
 * @param tokenId - Token UUID
 * @param token - Supabase auth token
 * @returns Triggers browser download
 */
export async function downloadTokenQR(
  eventId: string,
  tokenId: string,
  token: string
): Promise<void> {
  // This function will need a dedicated Next.js API route
  // Create /app/api/admin/tokens/[id]/qr/route.ts
  throw new Error('QR code download needs migration to Next.js API route');

  /* Original implementation - to be moved to API route:
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/tokens/${tokenId}/qr`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate QR code');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `token-qr-${tokenId}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  */
}
