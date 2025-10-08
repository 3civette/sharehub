// Feature 005: Event Details Management - Sessions Service
// Date: 2025-10-08
// Service for managing event sessions (admin operations)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Session {
  id: string;
  event_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  scheduled_time: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface SessionWithContent extends Session {
  speeches: {
    id: string;
    title: string;
    speaker_name: string;
    duration_minutes: number | null;
    description: string | null;
    display_order: number | null;
  }[];
}

export interface CreateSessionInput {
  title: string;
  description?: string | null;
  scheduled_time?: string | null;
  display_order?: number | null;
}

export interface UpdateSessionInput {
  title?: string;
  description?: string | null;
  scheduled_time?: string | null;
  display_order?: number | null;
}

export interface DeleteSessionResponse {
  message: string;
  deleted: {
    id: string;
    title: string;
  };
  speeches_deleted?: number;
}

export interface ReorderSessionsResponse {
  message: string;
  sessions: Session[];
}

/**
 * Create a new session
 * @param eventId Event UUID
 * @param data Session creation data
 * @param token Admin auth token
 * @returns Created session
 */
export async function createSession(
  eventId: string,
  data: CreateSessionInput,
  token: string
): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/sessions`, {
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
    throw new Error(error.message || error.error || 'Failed to create session');
  }

  return response.json();
}

/**
 * List all sessions for an event
 * @param eventId Event UUID
 * @param token Admin auth token
 * @returns Array of sessions ordered by smart ordering
 */
export async function listSessions(
  eventId: string,
  token: string
): Promise<Session[]> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/sessions`, {
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
    throw new Error(error.message || error.error || 'Failed to list sessions');
  }

  return response.json();
}

/**
 * Get session details
 * @param sessionId Session UUID
 * @param token Admin auth token
 * @returns Session object
 */
export async function getSession(
  sessionId: string,
  token: string
): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
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
    throw new Error(error.message || error.error || 'Failed to get session');
  }

  return response.json();
}

/**
 * Get session with all speeches
 * @param sessionId Session UUID
 * @param token Admin auth token
 * @returns Session with nested speeches
 */
export async function getSessionWithContent(
  sessionId: string,
  token: string
): Promise<SessionWithContent> {
  const response = await fetch(
    `${API_BASE_URL}/api/sessions/${sessionId}/with-content`,
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
    throw new Error(error.message || error.error || 'Failed to get session with content');
  }

  return response.json();
}

/**
 * Update session details
 * @param sessionId Session UUID
 * @param data Session update data
 * @param token Admin auth token
 * @returns Updated session
 */
export async function updateSession(
  sessionId: string,
  data: UpdateSessionInput,
  token: string
): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
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
    throw new Error(error.message || error.error || 'Failed to update session');
  }

  return response.json();
}

/**
 * Delete a session
 * @param sessionId Session UUID
 * @param token Admin auth token
 * @returns Deletion confirmation (may fail if speeches exist)
 */
export async function deleteSession(
  sessionId: string,
  token: string
): Promise<DeleteSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
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
    throw new Error(error.message || error.error || 'Failed to delete session');
  }

  return response.json();
}

/**
 * Reorder sessions within an event
 * @param eventId Event UUID
 * @param sessionIds Array of session UUIDs in new order
 * @param token Admin auth token
 * @returns Updated sessions with new display orders
 */
export async function reorderSessions(
  eventId: string,
  sessionIds: string[],
  token: string
): Promise<ReorderSessionsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/sessions/reorder`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_ids: sessionIds }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Reorder failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to reorder sessions');
  }

  return response.json();
}
