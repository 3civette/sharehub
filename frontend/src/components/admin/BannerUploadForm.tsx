'use client';

/**
 * BannerUploadForm Component
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 *
 * Form for uploading banner images with drag-and-drop support.
 * Validates file size (max 5MB) and type (JPEG/PNG/WebP).
 */

import React, { useState } from 'react';
import FileDropzone from '@/components/common/FileDropzone';
import BannerValidation, { BANNER_SLOTS } from '@/lib/banners';

interface BannerUploadFormProps {
  eventId: string;
  slotNumber: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BannerUploadForm({
  eventId,
  slotNumber,
  onSuccess,
  onCancel,
}: BannerUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clickUrl, setClickUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slot = BANNER_SLOTS[slotNumber];

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    // Client-side validation
    if (!BannerValidation.validateFileSize(selectedFile.size)) {
      setError(BannerValidation.getFileSizeError(selectedFile.size));
      return;
    }

    if (!BannerValidation.validateMimeType(selectedFile.type)) {
      setError(BannerValidation.getMimeTypeError(selectedFile.type));
      return;
    }

    if (!BannerValidation.validateFileExtension(selectedFile.name, selectedFile.type)) {
      setError('File extension does not match MIME type');
      return;
    }

    if (clickUrl && !BannerValidation.validateClickUrl(clickUrl)) {
      setError(BannerValidation.getClickUrlError(clickUrl));
      return;
    }

    // Upload banner
    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('slot_number', slotNumber.toString());
      if (clickUrl.trim()) {
        formData.append('click_url', clickUrl.trim());
      }

      const response = await fetch(`/api/events/${eventId}/banners`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload banner');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Slot information */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h5 className="text-sm font-medium text-blue-900 mb-2">
          Slot {slotNumber} Configuration
        </h5>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Description: {slot.description}</p>
          <p>• Dimensions: {slot.width} × {slot.height}px</p>
          <p>• Position: {slot.position}</p>
          <p>• Max file size: 5 MB</p>
          <p>• Allowed formats: JPEG, PNG, WebP</p>
        </div>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Banner Image *
        </label>
        <FileDropzone
          onFilesSelected={handleFileSelected}
          accept="image/jpeg,image/png,image/webp"
          multiple={false}
          maxSize={5 * 1024 * 1024}
          disabled={uploading}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <svg
                className="mx-auto h-12 w-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-gray-900 font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {selectedFile.type} • {formatFileSize(selectedFile.size)}
              </p>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Change file
              </button>
            </div>
          ) : (
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
                <span className="font-semibold text-blue-600 hover:text-blue-500">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              <p className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP up to 5MB</p>
            </div>
          )}
        </FileDropzone>
      </div>

      {/* Click URL (optional) */}
      <div>
        <label htmlFor="clickUrl" className="block text-sm font-medium text-gray-700 mb-2">
          Click URL (optional)
        </label>
        <input
          type="url"
          id="clickUrl"
          value={clickUrl}
          onChange={(e) => setClickUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={uploading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-gray-500">
          Users will be redirected to this URL when they click the banner
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={uploading || !selectedFile}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload Banner'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
