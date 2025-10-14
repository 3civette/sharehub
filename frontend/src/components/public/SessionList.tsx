'use client';

// Feature 004: Public Event Page - Session List Component
// Date: 2025-10-07
// Displays all sessions with speeches in accordion format

import SpeechAccordion from './SpeechAccordion';
import { getSessionZipUrl } from '@/services/eventClient';

interface SessionListProps {
  sessions: {
    id: string;
    title: string;
    description: string | null;
    scheduled_time: string | null;
    speeches: {
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
    }[];
  }[];
}

export default function SessionList({ sessions }: SessionListProps) {
  const formatScheduledTime = (time: string | null): string | null => {
    if (!time) return null;
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(time));
  };

  const handleDownloadSessionZip = (sessionId: string) => {
    const zipUrl = getSessionZipUrl(sessionId);
    window.open(zipUrl, '_blank');
  };

  // Count total slides in session
  const getTotalSlides = (
    speeches: { slides: unknown[] }[]
  ): number => {
    return speeches.reduce((total, speech) => total + speech.slides.length, 0);
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No sessions available for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sessions.map((session) => {
        const totalSlides = getTotalSlides(session.speeches);

        return (
          <section key={session.id} className="border-b border-gray-700 pb-8 last:border-0">
            {/* Session header */}
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-100 mb-2">
                    {session.title}
                  </h2>
                  {session.scheduled_time && (
                    <p className="text-sm text-gray-400">
                      <svg
                        className="w-4 h-4 inline mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formatScheduledTime(session.scheduled_time)}
                    </p>
                  )}
                </div>

                {/* Session batch download button */}
                {totalSlides > 0 && (
                  <button
                    onClick={() => handleDownloadSessionZip(session.id)}
                    className="flex-shrink-0 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-900/20 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    <svg
                      className="w-4 h-4 inline mr-1"
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
                    Download all session slides
                  </button>
                )}
              </div>

              {session.description && (
                <p className="mt-2 text-gray-300">{session.description}</p>
              )}
            </div>

            {/* Speeches list */}
            {session.speeches.length > 0 ? (
              <div className="space-y-3">
                {session.speeches.map((speech) => (
                  <SpeechAccordion key={speech.id} speech={speech} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No speeches in this session</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
