// Feature 005-ora-facciamo-la: Event Management Dashboard
// Service: Dashboard API client

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
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/dashboard`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 403) {
    throw new Error('You do not have access to this event');
  }

  if (response.status === 404) {
    throw new Error('Event not found');
  }

  if (!response.ok) {
    throw new Error('Failed to load dashboard data');
  }

  return response.json();
}

/**
 * Download QR code PNG for a participant token
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
}
