'use client';

/**
 * BannerSlotCard Component
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 *
 * Displays a single banner slot with its configuration and current banner (if any).
 * Allows uploading, activating/deactivating, updating click URL, and deleting banners.
 */

import React, { useState, useEffect } from 'react';
import type { Database } from '@/types/database.types';
import type { BannerSlotConfig } from '@/lib/banners';

type Banner = Database['public']['Tables']['banners']['Row'];

interface BannerSlotCardProps {
  slot: BannerSlotConfig;
  banner?: Banner;
  loading: boolean;
  onUploadClick: () => void;
  onToggleActive: (bannerId: string, currentState: boolean) => Promise<void>;
  onUpdateClickUrl: (bannerId: string, clickUrl: string | null) => Promise<void>;
  onDelete: (bannerId: string) => Promise<void>;
  getSignedUrl: (storagePath: string) => Promise<string>;
}

export default function BannerSlotCard({
  slot,
  banner,
  loading,
  onUploadClick,
  onToggleActive,
  onUpdateClickUrl,
  onDelete,
  getSignedUrl,
}: BannerSlotCardProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [editingClickUrl, setEditingClickUrl] = useState(false);
  const [clickUrlValue, setClickUrlValue] = useState(banner?.click_url || '');
  const [loadingImage, setLoadingImage] = useState(false);

  // Load signed URL when banner changes
  useEffect(() => {
    if (banner?.storage_path) {
      setLoadingImage(true);
      getSignedUrl(banner.storage_path)
        .then((url) => setImageUrl(url))
        .catch(() => setImageUrl(''))
        .finally(() => setLoadingImage(false));
    } else {
      setImageUrl('');
    }
  }, [banner?.storage_path]);

  // Update local click URL when banner changes
  useEffect(() => {
    setClickUrlValue(banner?.click_url || '');
  }, [banner?.click_url]);

  const handleSaveClickUrl = async () => {
    if (!banner) return;

    const trimmedUrl = clickUrlValue.trim();
    await onUpdateClickUrl(banner.id, trimmedUrl || null);
    setEditingClickUrl(false);
  };

  const handleCancelEditClickUrl = () => {
    setClickUrlValue(banner?.click_url || '');
    setEditingClickUrl(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      {/* Slot header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-medium text-gray-900">
            Slot {slot.slotNumber}
          </h4>
          <p className="text-sm text-gray-600">{slot.description}</p>
          <p className="text-xs text-gray-500 mt-1">
            {slot.width} × {slot.height}px • {slot.position}
          </p>
        </div>
        {!banner && (
          <button
            onClick={onUploadClick}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Upload
          </button>
        )}
      </div>

      {/* Banner preview or empty state */}
      {banner ? (
        <div className="space-y-4">
          {/* Image preview */}
          <div
            className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ aspectRatio: `${slot.width} / ${slot.height}` }}
          >
            {loadingImage ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={banner.filename}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-gray-400 text-sm">Failed to load image</div>
            )}
            {banner.is_active && (
              <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs">
                Active
              </div>
            )}
            {!banner.is_active && (
              <div className="absolute top-2 right-2 bg-gray-600 text-white px-2 py-1 rounded text-xs">
                Inactive
              </div>
            )}
          </div>

          {/* Banner metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Filename:</span>
              <span className="text-gray-900 font-medium truncate ml-2" title={banner.filename}>
                {banner.filename}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">File Size:</span>
              <span className="text-gray-900">{formatFileSize(banner.file_size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="text-gray-900">{banner.mime_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uploaded:</span>
              <span className="text-gray-900">
                {new Date(banner.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Click URL editor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Click URL (optional)
            </label>
            {editingClickUrl ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={clickUrlValue}
                  onChange={(e) => setClickUrlValue(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveClickUrl}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditClickUrl}
                    disabled={loading}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate">
                  {banner.click_url || 'No click URL set'}
                </span>
                <button
                  onClick={() => setEditingClickUrl(true)}
                  disabled={loading}
                  className="ml-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onToggleActive(banner.id, banner.is_active)}
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${
                banner.is_active
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              } disabled:opacity-50`}
            >
              {banner.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => onDelete(banner.id)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-100 text-red-800 text-sm font-medium rounded-md hover:bg-red-200 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center">
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
          <p className="mt-2 text-sm text-gray-600">No banner uploaded</p>
          <p className="text-xs text-gray-500 mt-1">
            Upload an image to display ads in this slot
          </p>
        </div>
      )}
    </div>
  );
}
