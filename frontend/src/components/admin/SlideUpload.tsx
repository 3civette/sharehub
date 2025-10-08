'use client';

// SlideUpload Component
// Feature: 005-ora-bisogna-implementare (Event Details Management)
// Uploads slides for a specific speech with format validation and metadata display

import React, { useState, useRef } from 'react';

interface SlideUploadProps {
  speechId: string;
  speechTitle: string;
  speakerName: string;
  token: string;
  allowedFormats?: string[]; // From event.allowed_slide_formats
  onUploadComplete?: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SlideUpload({
  speechId,
  speechTitle,
  speakerName,
  token,
  allowedFormats = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  onUploadComplete,
}: SlideUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatLabels: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  };

  const getFormatLabel = (mimeType: string): string => {
    return formatLabels[mimeType] || mimeType;
  };

  const validateFile = (file: File): string | null => {
    // Check if format is allowed
    if (!allowedFormats.includes(file.type)) {
      const allowedNames = allowedFormats.map(getFormatLabel).join(', ');
      return `Invalid file type. Allowed formats: ${allowedNames}`;
    }

    // Check file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size exceeds 100MB limit';
    }

    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      // Create form data
      const formData = new FormData();
      formData.append('slide', file);

      // Upload to API
      const response = await fetch(`${API_BASE_URL}/api/speeches/${speechId}/slides`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Upload failed',
          message: response.statusText,
        }));
        throw new Error(errorData.message || errorData.error || 'Failed to upload slide');
      }

      const result = await response.json();
      setSuccess(`Slide "${file.name}" uploaded successfully`);
      onUploadComplete?.();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload slide');
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Speech context */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-gray-900">Uploading slide for:</h4>
        <p className="text-lg font-semibold text-gray-900 mt-1">{speechTitle}</p>
        <p className="text-sm text-gray-600 mt-1">Speaker: {speakerName}</p>
      </div>

      {/* Upload section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Upload Slide
        </label>
        <p className="text-xs text-gray-500">
          Allowed formats: {allowedFormats.map(getFormatLabel).join(', ')} (max 100MB)
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedFormats.join(',')}
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />

        {/* Upload button */}
        <button
          onClick={handleButtonClick}
          disabled={uploading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading...
            </span>
          ) : (
            'Choose File to Upload'
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
    </div>
  );
}
