'use client';

// Feature 008: R2 Storage - Slide Download Component
// Individual slide download button using presigned R2 URLs

import { useState } from 'react';
import type { SlideDownloadResponse } from '@/types/slide';

interface SlideDownloadProps {
  slide: {
    id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    download_url?: string; // Legacy field (deprecated)
  };
}

export default function SlideDownload({ slide }: SlideDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (slide.mime_type && slide.mime_type.includes('pdf')) {
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
    setError(null);
    setDownloading(true);

    try {
      // -----------------------------------------------------------------------
      // Step 1: Request presigned download URL from Next.js API
      // -----------------------------------------------------------------------
      const response = await fetch(`/api/slides/${slide.id}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'DOWNLOAD_FAILED',
          message: 'Failed to generate download URL',
        }));

        // Handle specific error cases
        if (errorData.error === 'FILE_EXPIRED') {
          setError('This file has been deleted. Files are automatically removed after 48 hours.');
          return;
        }

        if (errorData.error === 'UNAUTHORIZED') {
          setError('You do not have permission to download this file.');
          return;
        }

        if (response.status === 404) {
          setError('File not found or has been deleted.');
          return;
        }

        throw new Error(errorData.message || 'Failed to download file');
      }

      const downloadData: SlideDownloadResponse = await response.json();

      // -----------------------------------------------------------------------
      // Step 2: Download file from R2 using presigned URL
      // -----------------------------------------------------------------------
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadData.download_url;
      link.download = downloadData.filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Download initiated: ${downloadData.filename} (expires at ${downloadData.expires_at})`);
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(`Download failed: ${errorMessage}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100 truncate">
            {slide.filename}
          </p>
          <p className="text-xs text-gray-500">{formatFileSize(slide.file_size)}</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex-shrink-0 ml-3 px-3 py-1.5 text-sm font-medium text-blue-600 bg-gray-800 border border-blue-600 rounded-md hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Download ${slide.filename}`}
      >
        {downloading ? (
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
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
        )}
      </button>

      {error && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-200 rounded text-xs text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
