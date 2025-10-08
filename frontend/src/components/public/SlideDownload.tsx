'use client';

// Feature 004: Public Event Page - Slide Download Component
// Date: 2025-10-07
// Individual slide download button with file info

import { useState } from 'react';
import { getSlideDownloadUrl } from '@/services/eventClient';

interface SlideDownloadProps {
  slide: {
    id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    download_url: string;
  };
}

export default function SlideDownload({ slide }: SlideDownloadProps) {
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Format file size (bytes to human-readable)
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Get file type icon
  const getFileIcon = () => {
    if (slide.mime_type.includes('pdf')) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const handleDownload = async () => {
    setRateLimitError(null);

    try {
      const downloadUrl = getSlideDownloadUrl(slide.id);
      const response = await fetch(downloadUrl);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '1 hour';
        setRateLimitError(
          `Download limit exceeded. Please try again in ${retryAfter}.`
        );
        return;
      }

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Open download URL in new tab (browser will handle download)
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      setRateLimitError('Failed to download file. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {slide.filename}
          </p>
          <p className="text-xs text-gray-500">{formatFileSize(slide.file_size)}</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="flex-shrink-0 ml-3 px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label={`Download ${slide.filename}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </button>

      {rateLimitError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          {rateLimitError}
        </div>
      )}
    </div>
  );
}
