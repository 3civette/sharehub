'use client';

// EventGallery Component
// Feature: 005-ora-bisogna-implementare (Event Details Management)
// Displays event cover image and photo gallery on public event page

import React, { useState } from 'react';

interface EventPhoto {
  id: string;
  filename: string;
  url: string;
  is_cover: boolean;
  display_order: number;
}

interface EventGalleryProps {
  photos: EventPhoto[];
  eventName: string;
}

export default function EventGallery({ photos, eventName }: EventGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string>('');

  const coverPhoto = photos.find((p) => p.is_cover);
  const galleryPhotos = photos.filter((p) => !p.is_cover);

  const openLightbox = (imageUrl: string) => {
    setLightboxImageUrl(imageUrl);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImageUrl('');
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Cover image */}
      {coverPhoto && (
        <div className="relative w-full h-96 bg-gray-200 rounded-lg overflow-hidden shadow-lg">
          <img
            src={coverPhoto.url}
            alt={`${eventName} cover`}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openLightbox(coverPhoto.url)}
          />
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
            Cover Photo
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {galleryPhotos.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Event Gallery ({galleryPhotos.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openLightbox(photo.url)}
              >
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white text-4xl font-bold hover:text-gray-300 transition-colors"
            aria-label="Close lightbox"
          >
            &times;
          </button>
          <img
            src={lightboxImageUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
