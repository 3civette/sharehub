'use client';

import { useCallback, useState } from 'react';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function FileDropzone({
  onFilesSelected,
  accept,
  multiple = true,
  maxSize,
  disabled = false,
  children,
  className = '',
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      let errorMsg: string | null = null;

      for (const file of fileArray) {
        // Check file size
        if (maxSize && file.size > maxSize) {
          errorMsg = `File "${file.name}" is too large. Maximum size: ${formatFileSize(maxSize)}`;
          continue;
        }

        // Check file type if accept is specified
        if (accept) {
          const acceptedTypes = accept.split(',').map((t) => t.trim());
          const fileType = file.type;
          const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

          const isAccepted = acceptedTypes.some((type) => {
            if (type.startsWith('.')) {
              return fileExtension === type.toLowerCase();
            }
            if (type.endsWith('/*')) {
              return fileType.startsWith(type.replace('/*', ''));
            }
            return fileType === type;
          });

          if (!isAccepted) {
            errorMsg = `File "${file.name}" has an unsupported format. Accepted: ${accept}`;
            continue;
          }
        }

        validFiles.push(file);
      }

      if (errorMsg) {
        setError(errorMsg);
        setTimeout(() => setError(null), 5000);
      }

      return validFiles;
    },
    [accept, maxSize]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(false);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
          onFilesSelected(multiple ? validFiles : [validFiles[0]]);
        }
      }
    },
    [disabled, multiple, onFilesSelected, validateFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = e.target.files;
      if (files && files.length > 0) {
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
          onFilesSelected(multiple ? validFiles : [validFiles[0]]);
        }
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [disabled, multiple, onFilesSelected, validateFiles]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`relative ${className}`}>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative
          border-2 border-dashed rounded-lg
          transition-all duration-200
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileInput}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
        />

        <label
          htmlFor="file-upload"
          className={`
            block p-8 text-center
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {children || (
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold text-blue-600 hover:text-blue-500">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              {accept && (
                <p className="mt-1 text-xs text-gray-500">
                  Accepted formats: {accept}
                </p>
              )}
              {maxSize && (
                <p className="mt-1 text-xs text-gray-500">
                  Maximum file size: {formatFileSize(maxSize)}
                </p>
              )}
            </div>
          )}
        </label>

        {isDragging && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center rounded-lg pointer-events-none">
            <div className="text-blue-600 font-medium">Drop files here</div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
