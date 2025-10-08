// Feature 005: Event Details Management - Speeches Service
// Date: 2025-10-08
// Service for managing speeches (admin operations)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Speech {
  id: string;
  session_id: string;
  tenant_id: string;
  title: string;
  speaker_name: string;
  speaker_bio: string | null;
  description: string | null;
  duration_minutes: number | null;
  scheduled_time: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface SpeechWithSlides extends Speech {
  slides: {
    id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    display_order: number;
    uploaded_at: string;
  }[];
}

export interface CreateSpeechInput {
  title: string;
  speaker_name: string;
  speaker_bio?: string | null;
  description?: string | null;
  duration_minutes?: number | null;
  scheduled_time?: string | null;
  display_order?: number | null;
}

export interface UpdateSpeechInput {
  title?: string;
  speaker_name?: string;
  speaker_bio?: string | null;
  description?: string | null;
  duration_minutes?: number | null;
  scheduled_time?: string | null;
  display_order?: number | null;
}

export interface DeleteSpeechResponse {
  message: string;
  deleted: {
    id: string;
    title: string;
  };
  slides_deleted: number;
}

export interface ReorderSpeechesResponse {
  message: string;
  speeches: Speech[];
}

/**
 * Create a new speech
 * @param sessionId Session UUID
 * @param data Speech creation data
 * @param token Admin auth token
 * @returns Created speech
 */
export async function createSpeech(
  sessionId: string,
  data: CreateSpeechInput,
  token: string
): Promise<Speech> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/speeches`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Creation failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to create speech');
  }

  return response.json();
}

/**
 * List all speeches for a session
 * @param sessionId Session UUID
 * @param token Admin auth token
 * @returns Array of speeches ordered by smart ordering
 */
export async function listSpeeches(
  sessionId: string,
  token: string
): Promise<Speech[]> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/speeches`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to list speeches');
  }

  return response.json();
}

/**
 * Get speech details
 * @param speechId Speech UUID
 * @param token Admin auth token
 * @returns Speech object
 */
export async function getSpeech(
  speechId: string,
  token: string
): Promise<Speech> {
  const response = await fetch(`${API_BASE_URL}/api/speeches/${speechId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to get speech');
  }

  return response.json();
}

/**
 * Get speech with all slides
 * @param speechId Speech UUID
 * @param token Admin auth token
 * @returns Speech with nested slides
 */
export async function getSpeechWithSlides(
  speechId: string,
  token: string
): Promise<SpeechWithSlides> {
  const response = await fetch(
    `${API_BASE_URL}/api/speeches/${speechId}/with-slides`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to get speech with slides');
  }

  return response.json();
}

/**
 * Update speech details
 * @param speechId Speech UUID
 * @param data Speech update data
 * @param token Admin auth token
 * @returns Updated speech
 */
export async function updateSpeech(
  speechId: string,
  data: UpdateSpeechInput,
  token: string
): Promise<Speech> {
  const response = await fetch(`${API_BASE_URL}/api/speeches/${speechId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Update failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to update speech');
  }

  return response.json();
}

/**
 * Delete a speech (cascades to slides)
 * @param speechId Speech UUID
 * @param token Admin auth token
 * @returns Deletion confirmation with slide count
 */
export async function deleteSpeech(
  speechId: string,
  token: string
): Promise<DeleteSpeechResponse> {
  const response = await fetch(`${API_BASE_URL}/api/speeches/${speechId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Deletion failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to delete speech');
  }

  return response.json();
}

/**
 * Reorder speeches within a session
 * @param sessionId Session UUID
 * @param speechIds Array of speech UUIDs in new order
 * @param token Admin auth token
 * @returns Updated speeches with new display orders
 */
export async function reorderSpeeches(
  sessionId: string,
  speechIds: string[],
  token: string
): Promise<ReorderSpeechesResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/sessions/${sessionId}/speeches/reorder`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ speech_ids: speechIds }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Reorder failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to reorder speeches');
  }

  return response.json();
}
