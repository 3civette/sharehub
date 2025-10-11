'use client';

// Feature 008: R2 Storage - Slide Upload Component
// Upload slides directly to Cloudflare R2 using presigned URLs

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Slide, SlideUploadRequest, SlideUploadResponse } from '@/types/slide';
import * as R2 from '@/lib/r2';

interface SlideUploadProps {
  eventId: string;
  sessionId: string; // Session ID (formerly speechId)
}

export default function SlideUpload({ eventId, sessionId }: SlideUploadProps) {
  const supabase = createClientComponentClient();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing slides
  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      // Query slides from Supabase directly (RLS enforces tenant isolation)
      const { data, error: fetchError } = await supabase
        .from('slides')
        .select('id, filename, file_size, mime_type, display_order, uploaded_at, uploaded_by, r2_key, deleted_at')
        .eq('session_id', sessionId)
        .is('deleted_at', null) // Only show non-deleted slides
        .order('display_order', { ascending: true });

      if (fetchError) {
        console.error('Fetch slides error:', fetchError);
        setError('Failed to load slides');
        return;
      }

      setSlides(data || []);
    } catch (error) {
      console.error('Fetch slides error:', error);
      setError('Failed to load slides');
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Validate file type using R2 validation
    if (!R2.validateFileType(file.type)) {
      return R2.getFileTypeError(file.type);
    }

    // Validate file size (1GB max)
    if (!R2.validateFileSize(file.size)) {
      return R2.getFileSizeError(file.size);
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // -----------------------------------------------------------------------
      // Step 1: Request presigned upload URL from Next.js API
      // -----------------------------------------------------------------------
      const uploadRequest: SlideUploadRequest = {
        session_id: sessionId,
        filename: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
      };

      const presignedResponse = await fetch('/api/slides/presigned-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadRequest),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.message || 'Failed to get upload URL');
      }

      const uploadData: SlideUploadResponse = await presignedResponse.json();
      setUploadProgress(10); // 10% - Got presigned URL

      // -----------------------------------------------------------------------
      // Step 2: Upload file directly to R2 using presigned URL
      // -----------------------------------------------------------------------
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          // Map 10% to 90% of progress bar to actual upload
          const percentComplete = 10 + Math.round((event.loaded / event.total) * 80);
          setUploadProgress(percentComplete);
        }
      });

      // Handle upload completion
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            setUploadProgress(95); // 95% - Upload complete
            resolve();
          } else {
            reject(new Error(`R2 upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during R2 upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('PUT', uploadData.upload_url);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.send(selectedFile);
      });

      // -----------------------------------------------------------------------
      // Step 3: Fetch updated slide metadata and refresh list
      // -----------------------------------------------------------------------
      setUploadProgress(100);

      // Create new slide object for immediate UI update
      const newSlide: Slide = {
        id: uploadData.slide_id,
        filename: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        display_order: slides.length,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'current-user',
        r2_key: uploadData.r2_key,
        deleted_at: null,
      };

      setSlides([...slides, newSlide]);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Show success briefly
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Upload failed: ${errorMessage}`);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (slideId: string) => {
    if (!confirm('Are you sure you want to delete this slide? It will be permanently removed after 48 hours.')) {
      return;
    }

    try {
      // Soft delete: Update deleted_at timestamp
      const { error: deleteError } = await supabase
        .from('slides')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', slideId);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from UI immediately
      setSlides(slides.filter((s) => s.id !== slideId));
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete slide');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    return '📁';
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500 text-center">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upload New Slide</h2>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
              isDragging
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 bg-gray-50 hover:border-purple-400'
            }`}
          >
            <div className="space-y-2">
              <div className="text-4xl">📄</div>
              <p className="text-lg font-medium text-gray-900">
                {isDragging ? 'Drop file here' : 'Drag file here'}
              </p>
              <p className="text-sm text-gray-600">or</p>
              <label className="inline-block cursor-pointer">
                <span className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition">
                  Choose File
                </span>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: PDF, PPT, PPTX, JPEG, PNG (max 1GB)
              </p>
            </div>
          </div>

          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-900">Selected file:</p>
                <p className="text-sm text-gray-600">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              </div>

              {/* Upload Progress Bar */}
              {uploading && uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Slide'}
          </button>
        </form>
      </div>

      {/* Slides List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Uploaded Slides ({slides.length})
        </h2>

        {slides.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No slides uploaded yet. Start by uploading your first file.
          </p>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{getFileIcon(slide.mime_type)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {index + 1}. {slide.filename}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(slide.file_size)} • Caricato il{' '}
                      {new Date(slide.uploaded_at).toLocaleDateString('it-IT')} alle{' '}
                      {new Date(slide.uploaded_at).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(slide.id)}
                  className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
