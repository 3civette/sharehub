'use client';

// LogoUpload Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Client-side validation (research.md decision 2)

import React, { useState, useRef } from 'react';

interface LogoUploadProps {
  currentLogo?: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export default function LogoUpload({ currentLogo, onUpload, onRemove }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return 'File size exceeds 2MB limit';
    }

    // Check file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only PNG, JPG, and SVG are allowed';
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // Call parent handler
    onUpload(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onRemove();
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Logo
      </label>

      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview or upload button */}
      {preview ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center w-full h-40 border-2 border-gray-300 rounded-md bg-gray-50">
            <img
              src={preview}
              alt="Logo preview"
              className="max-h-36 max-w-full object-contain"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleButtonClick}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Change Logo
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Remove Logo
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleButtonClick}
          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="mt-2 text-sm text-gray-600">
            Click to upload logo
          </span>
          <span className="mt-1 text-xs text-gray-500">
            PNG, JPG, or SVG (max 2MB)
          </span>
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
