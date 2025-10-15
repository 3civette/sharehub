// Feature 004: Public Event Page - Client Service
// Date: 2025-10-07
// Updated: Feature 011 - Migrated to Next.js internal API routes (serverless)
// Service for fetching public event data from internal Next.js API routes

export interface PublicEventResponse {
  event: {
    id: string;
    slug: string;
    name: string;
    title: string;
    organizer?: string;
    date: string;
    description: string | null;
    status: 'upcoming' | 'past' | 'archived';
    visibility: 'public' | 'private';
    photos?: {
      id: string;
      filename: string;
      url: string;
      is_cover: boolean;
      display_order: number;
    }[];
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
    total_downloads: number;
  };
}

export interface TokenValidationResponse {
  valid: boolean;
  token_type?: string | null;
  expires_at?: string | null;
  message?: string;
  token_id?: string;
}

export interface PublicMetrics {
  page_views: number;
  total_downloads: number;
}

/**
 * Fetch public event by slug
 * @param slug Event slug
 * @param token Optional access token for private events
 * @returns PublicEventResponse
 * @throws Error if request fails
 */
export async function fetchPublicEvent(
  slug: string,
  token?: string
): Promise<PublicEventResponse> {
  // Use absolute URL for server-side rendering, relative for client-side
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer ? 'http://localhost:3000' : '';
  const params = token ? `?token=${encodeURIComponent(token)}` : '';
  const url = `${baseUrl}/api/public/events/${slug}${params}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Always fetch fresh data
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed',
      message: response.statusText,
    }));
    throw new Error(error.message || 'Failed to fetch event');
  }

  return response.json();
}

/**
 * Validate access token for private event
 * @param slug Event slug
 * @param token Access token (21 characters)
 * @returns TokenValidationResponse
 */
export async function validateToken(
  slug: string,
  token: string
): Promise<TokenValidationResponse> {
  // Use relative URL for internal Next.js API route
  const url = `/api/public/events/${slug}/validate-token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok && response.status !== 403) {
    const error = await response.json().catch(() => ({
      error: 'Validation failed',
      message: response.statusText,
    }));
    throw new Error(error.message || 'Failed to validate token');
  }

  return response.json();
}

/**
 * Fetch public metrics for event
 * @param slug Event slug
 * @returns PublicMetrics
 */
export async function fetchPublicMetrics(slug: string): Promise<PublicMetrics> {
  // Use relative URL for internal Next.js API route
  const url = `/api/public/events/${slug}/metrics`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed',
      message: response.statusText,
    }));
    throw new Error(error.message || 'Failed to fetch metrics');
  }

  return response.json();
}

/**
 * Get download URL for single slide
 * @param slideId Slide UUID
 * @returns Download URL
 * @deprecated Since Feature 008: Slides now have presigned R2 URLs in the event response
 * @see fetchPublicEvent response which includes download_url for each slide
 */
export function getSlideDownloadUrl(slideId: string): string {
  // DEPRECATED: Slides now have download URLs included in the fetchPublicEvent response
  // Each slide object contains a download_url field with a presigned R2 URL
  // This function is kept for backward compatibility but should not be used
  return `/api/public/slides/${slideId}/download`;
}

/**
 * Get download URL for speech ZIP
 * @param speechId Speech UUID
 * @returns ZIP download URL (relative path for internal Next.js API route)
 */
export function getSpeechZipUrl(speechId: string): string {
  return `/api/public/speeches/${speechId}/download-all`;
}

/**
 * Get download URL for session ZIP
 * @param sessionId Session UUID
 * @returns ZIP download URL (relative path for internal Next.js API route)
 */
export function getSessionZipUrl(sessionId: string): string {
  return `/api/public/sessions/${sessionId}/download-all`;
}
