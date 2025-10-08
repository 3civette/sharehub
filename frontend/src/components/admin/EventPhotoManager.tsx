'use client';

// EventPhotoManager Component
// Feature: 005-ora-bisogna-implementare (Event Details Management)
// Manages event photos with drag-drop reordering and cover image selection

import React, { useState, useEffect } from 'react';
import {
  uploadPhoto,
  listPhotos,
  setCover,
  deletePhoto,
  reorderPhotos,
  type EventPhoto,
  type ListPhotosResponse,
} from '@/services/eventPhotoService';
import FileDropzone from '@/components/common/FileDropzone';

interface EventPhotoManagerProps {
  eventId: string;
  token: string;
  onUpdate?: () => void;
}

export default function EventPhotoManager({
  eventId,
  token,
  onUpdate,
}: EventPhotoManagerProps) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<{ id: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, [eventId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: ListPhotosResponse = await listPhotos(eventId, token);
      setPhotos(response.photos);
      setCoverPhoto(response.cover);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      // Upload all files
      for (const file of files) {
        await uploadPhoto(eventId, file, false, token);
      }

      await loadPhotos();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleSetCover = async (photoId: string) => {
    try {
      setLoading(true);
      setError(null);
      await setCover(eventId, photoId, token);
      await loadPhotos();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set cover image');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deletePhoto(eventId, photoId, token);
      await loadPhotos();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (photoId: string) => {
    setDraggedPhotoId(photoId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetPhotoId: string) => {
    e.preventDefault();
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) return;

    // Get gallery photos only (exclude cover)
    const galleryPhotos = photos.filter((p) => !p.is_cover);
    const draggedIndex = galleryPhotos.findIndex((p) => p.id === draggedPhotoId);
    const targetIndex = galleryPhotos.findIndex((p) => p.id === targetPhotoId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const newOrder = [...galleryPhotos];
    const [draggedPhoto] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPhoto);

    // Update display
    setPhotos([
      ...photos.filter((p) => p.is_cover),
      ...newOrder,
    ]);

    // Save to backend
    try {
      setError(null);
      await reorderPhotos(
        eventId,
        newOrder.map((p) => p.id),
        token
      );
      await loadPhotos();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder photos');
      await loadPhotos(); // Reload on error to restore correct order
    } finally {
      setDraggedPhotoId(null);
    }
  };

  const galleryPhotos = photos.filter((p) => !p.is_cover);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Event Photos</h3>

        {/* Drag and drop upload zone */}
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept="image/jpeg,image/png,image/webp"
          multiple={true}
          maxSize={50 * 1024 * 1024}
          disabled={uploading || loading}
        >
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {uploading ? (
                <span className="font-semibold text-blue-600">Uploading...</span>
              ) : (
                <>
                  <span className="font-semibold text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP up to 50MB</p>
          </div>
        </FileDropzone>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Cover photo section */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Cover Image</h4>
        {coverPhoto ? (
          <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={coverPhoto.url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
              Cover
            </div>
          </div>
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">No cover image</p>
          </div>
        )}
      </div>

      {/* Gallery photos */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Gallery ({galleryPhotos.length} photos)
        </h4>
        {galleryPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(photo.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, photo.id)}
                className="relative group cursor-move bg-gray-100 rounded-lg overflow-hidden aspect-square"
              >
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleSetCover(photo.id)}
                    disabled={loading}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Set Cover
                  </button>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    disabled={loading}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                  #{photo.display_order}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-500">No gallery photos yet</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading...</p>
        </div>
      )}
    </div>
  );
}
