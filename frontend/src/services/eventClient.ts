// Feature 004: Public Event Page - Client Service
// Date: 2025-10-07
// Service for fetching public event data from backend API

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    total_slide_downloads: number;
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
  total_slide_downloads: number;
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
  const url = new URL(`/api/public/events/${slug}`, API_BASE_URL);
  if (token) {
    url.searchParams.set('token', token);
  }

  const response = await fetch(url.toString(), {
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
  const url = new URL(`/api/public/events/${slug}/validate-token`, API_BASE_URL);

  const response = await fetch(url.toString(), {
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
  const url = new URL(`/api/public/events/${slug}/metrics`, API_BASE_URL);

  const response = await fetch(url.toString(), {
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
 * @deprecated Since Feature 008: Use Next.js API route /api/slides/[id]/download directly
 * @see SlideDownload component for the new implementation with presigned R2 URLs
 */
export function getSlideDownloadUrl(slideId: string): string {
  // DEPRECATED: This function points to the old backend
  // New implementation uses Next.js API route: /api/slides/[id]/download
  // which generates presigned R2 download URLs
  return `${API_BASE_URL}/api/public/slides/${slideId}/download`;
}

/**
 * Get download URL for speech ZIP
 * @param speechId Speech UUID
 * @returns ZIP download URL
 */
export function getSpeechZipUrl(speechId: string): string {
  return `${API_BASE_URL}/api/public/speeches/${speechId}/download-all`;
}

/**
 * Get download URL for session ZIP
 * @param sessionId Session UUID
 * @returns ZIP download URL
 */
export function getSessionZipUrl(sessionId: string): string {
  return `${API_BASE_URL}/api/public/sessions/${sessionId}/download-all`;
}
