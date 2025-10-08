'use client';

// Feature 004: Public Event Page - Speech Accordion Component
// Date: 2025-10-07
// Collapsible speech details with slides

import { useState } from 'react';
import SlideDownload from './SlideDownload';
import { getSpeechZipUrl } from '@/services/eventClient';

interface SpeechAccordionProps {
  speech: {
    id: string;
    title: string;
    speaker_name: string;
    duration_minutes: number | null;
    description: string | null;
    slides: {
      id: string;
      filename: string;
      file_size: number;
      mime_type: string;
      download_url: string;
    }[];
  };
}

export default function SpeechAccordion({ speech }: SpeechAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownloadAll = () => {
    const zipUrl = getSpeechZipUrl(speech.id);
    window.open(zipUrl, '_blank');
  };

  return (
    <details
      className="group border border-gray-200 rounded-lg overflow-hidden"
      onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer bg-white hover:bg-gray-50 transition-colors list-none">
        <div className="flex-1">
          <h4 className="text-base font-semibold text-gray-900">{speech.title}</h4>
          <p className="text-sm text-gray-600 mt-0.5">{speech.speaker_name}</p>
        </div>

        <svg
          className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>

      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
        {/* Duration and description */}
        <div className="mb-4">
          {speech.duration_minutes && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Duration:</span> {speech.duration_minutes}{' '}
              minutes
            </p>
          )}
          {speech.description && (
            <p className="text-sm text-gray-700">{speech.description}</p>
          )}
        </div>

        {/* Slides list */}
        {speech.slides.length > 0 ? (
          <>
            <div className="space-y-2 mb-4">
              {speech.slides.map((slide) => (
                <SlideDownload key={slide.id} slide={slide} />
              ))}
            </div>

            {/* Batch download button */}
            {speech.slides.length > 1 && (
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
                Download all {speech.slides.length} slides as ZIP
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">No slides available</p>
        )}
      </div>
    </details>
  );
}
