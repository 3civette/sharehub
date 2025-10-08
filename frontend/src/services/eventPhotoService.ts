// Feature 005: Event Details Management - Event Photos Service
// Date: 2025-10-08
// Service for managing event photos (admin operations)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface EventPhoto {
  id: string;
  event_id: string;
  tenant_id: string;
  filename: string;
  storage_path: string;
  url: string;
  file_size: number;
  mime_type: string;
  is_cover: boolean;
  display_order: number;
  uploaded_at: string;
  uploaded_by: string;
}

export interface ListPhotosResponse {
  photos: EventPhoto[];
  total: number;
  cover: {
    id: string;
    url: string;
  } | null;
}

export interface SetCoverResponse {
  message: string;
  photo: EventPhoto;
  previous_cover: EventPhoto | null;
}

export interface DeletePhotoResponse {
  message: string;
  deleted: {
    id: string;
    filename: string;
  };
}

export interface ReorderPhotosResponse {
  message: string;
  photos: EventPhoto[];
}

/**
 * Upload event photo
 * @param eventId Event UUID
 * @param file Photo file (JPEG, PNG, or WebP, max 50MB)
 * @param isCover Whether this photo should be the cover image
 * @param token Admin auth token
 * @returns Uploaded photo object
 */
export async function uploadPhoto(
  eventId: string,
  file: File,
  isCover: boolean = false,
  token: string
): Promise<EventPhoto> {
  const formData = new FormData();
  formData.append('photo', file);
  if (isCover) {
    formData.append('is_cover', 'true');
  }

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/photos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Upload failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to upload photo');
  }

  return response.json();
}

/**
 * List all photos for an event
 * @param eventId Event UUID
 * @param token Admin auth token
 * @returns List of photos with cover info
 */
export async function listPhotos(
  eventId: string,
  token: string
): Promise<ListPhotosResponse> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/photos`, {
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
    throw new Error(error.message || error.error || 'Failed to list photos');
  }

  return response.json();
}

/**
 * Set a photo as the cover image
 * @param eventId Event UUID
 * @param photoId Photo UUID to set as cover
 * @param token Admin auth token
 * @returns Update response with old and new cover info
 */
export async function setCover(
  eventId: string,
  photoId: string,
  token: string
): Promise<SetCoverResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/photos/${photoId}/set-cover`,
    {
      method: 'PUT',
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
    throw new Error(error.message || error.error || 'Failed to set cover image');
  }

  return response.json();
}

/**
 * Delete an event photo
 * @param eventId Event UUID
 * @param photoId Photo UUID to delete
 * @param token Admin auth token
 * @returns Deletion confirmation
 */
export async function deletePhoto(
  eventId: string,
  photoId: string,
  token: string
): Promise<DeletePhotoResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/photos/${photoId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Deletion failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to delete photo');
  }

  return response.json();
}

/**
 * Reorder gallery photos
 * @param eventId Event UUID
 * @param photoIds Array of photo UUIDs in new order (excludes cover)
 * @param token Admin auth token
 * @returns Updated photos with new display orders
 */
export async function reorderPhotos(
  eventId: string,
  photoIds: string[],
  token: string
): Promise<ReorderPhotosResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/photos/reorder`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ photo_ids: photoIds }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Reorder failed',
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || 'Failed to reorder photos');
  }

  return response.json();
}
