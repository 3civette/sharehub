// Feature 005: Event Details Management - Slide List Component
// Date: 2025-10-08
// Enhanced slide list with enriched metadata (speaker name, speech title)

import SlideDownload from './SlideDownload';
import { getSpeechZipUrl } from '@/services/eventClient';

interface Slide {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  download_url: string;
}

interface SlideListProps {
  slides: Slide[];
  speechId?: string;
  speechTitle?: string;
  speakerName?: string;
  showBatchDownload?: boolean;
}

export default function SlideList({
  slides,
  speechId,
  speechTitle,
  speakerName,
  showBatchDownload = true,
}: SlideListProps) {
  const handleDownloadAll = () => {
    if (!speechId) return;
    const zipUrl = getSpeechZipUrl(speechId);
    window.open(zipUrl, '_blank');
  };

  if (slides.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 italic text-sm">
        No slides available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enriched metadata header */}
      {(speechTitle || speakerName) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          {speechTitle && (
            <p className="text-sm font-semibold text-gray-900">{speechTitle}</p>
          )}
          {speakerName && (
            <p className="text-xs text-gray-600 mt-1">Speaker: {speakerName}</p>
          )}
        </div>
      )}

      {/* Slides list */}
      <div className="space-y-2">
        {slides.map((slide) => (
          <SlideDownload key={slide.id} slide={slide} />
        ))}
      </div>

      {/* Batch download button */}
      {showBatchDownload && slides.length > 1 && speechId && (
        <button
          onClick={handleDownloadAll}
          className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <svg
            className="w-4 h-4 inline mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download all {slides.length} slides as ZIP
        </button>
      )}
    </div>
  );
}
