'use client';

// Feature 005: Slide Upload Component
// Upload and manage slides for a speech

import { useState, useEffect } from 'react';

interface Slide {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  display_order: number;
  uploaded_at: string;
  uploaded_by: string;
}

interface SlideUploadProps {
  eventId: string;
  speechId: string;
  accessToken: string;
}

export default function SlideUpload({ eventId, speechId, accessToken }: SlideUploadProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch existing slides
  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/speeches/${speechId}/slides`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSlides(data);
      }
    } catch (error) {
      console.error('Fetch slides error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
      'application/x-iwork-keynote-sffkey',
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.key')) {
      return 'Tipo di file non valido. Usa PDF, PPT, PPTX, KEY o ODP.';
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      return 'File troppo grande. Dimensione massima: 100MB';
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

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

    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('display_order', String(slides.length));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/speeches/${speechId}/slides`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const newSlide = await response.json();
      setSlides([...slides, newSlide]);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Errore nell'upload: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (slideId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa slide?')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/slides/${slideId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setSlides(slides.filter((s) => s.id !== slideId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Errore nell\'eliminazione della slide');
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
      {/* Upload Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Carica Nuova Slide</h2>

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
                {isDragging ? 'Rilascia il file qui' : 'Trascina il file qui'}
              </p>
              <p className="text-sm text-gray-600">oppure</p>
              <label className="inline-block cursor-pointer">
                <span className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition">
                  Scegli File
                </span>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.ppt,.pptx,.key,.odp"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Formati supportati: PDF, PPT, PPTX, KEY, ODP (max 100MB)
              </p>
            </div>
          </div>

          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">File selezionato:</p>
              <p className="text-sm text-gray-600">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {uploading ? 'Caricamento...' : 'Carica Slide'}
          </button>
        </form>
      </div>

      {/* Slides List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Slide Caricate ({slides.length})
        </h2>

        {slides.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nessuna slide caricata. Inizia caricando il primo file.
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
                  Elimina
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
