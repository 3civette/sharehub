// Feature 004: Public Event Page - Main Page Component
// Enhanced Feature 005: Added EventGallery for photo display
// Enhanced Feature 010: Added EventBanners for advertisement display
// Date: 2025-10-08
// Server Component for displaying public event data

import { notFound } from 'next/navigation';
import EventHeader from '@/components/public/EventHeader';
import PublicMetrics from '@/components/public/PublicMetrics';
import SessionList from '@/components/public/SessionList';
import EventGallery from '@/components/public/EventGallery';
import TokenForm from '@/components/public/TokenForm';
import { HeaderBanner, ContentBanner, FooterBanner } from '@/components/public/EventBanners';
import { fetchPublicEvent } from '@/services/eventClient';

interface PageProps {
  params: {
    slug: string;
  };
  searchParams: {
    token?: string;
  };
}

export default async function PublicEventPage({ params, searchParams }: PageProps) {
  const { slug } = params;
  const { token } = searchParams;

  try {
    // Fetch event data (with token if provided in URL params)
    const eventData = await fetchPublicEvent(slug, token);

    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Banner (Slot 1: Leaderboard 728x90) */}
          <div className="mb-6 flex justify-center">
            <HeaderBanner eventSlug={slug} />
          </div>

          {/* Main Content Area */}
          <div className="max-w-4xl mx-auto">
            {/* Event Header */}
            <EventHeader event={eventData.event} />

            {/* Event Gallery (if photos exist in event data) */}
            {eventData.event.photos && eventData.event.photos.length > 0 && (
              <div className="mb-8">
                <EventGallery
                  photos={eventData.event.photos}
                  eventName={eventData.event.name}
                />
              </div>
            )}

            {/* Content Banner (Slot 4: In-content 468x60) */}
            <div className="mb-6 flex justify-center">
              <ContentBanner eventSlug={slug} />
            </div>

            {/* Public Metrics */}
            <div className="mb-6">
              <PublicMetrics
                slug={slug}
                initialMetrics={eventData.metrics}
                polling={false}
              />
            </div>

            {/* Sessions and Speeches */}
            <SessionList sessions={eventData.sessions} />
          </div>

          {/* Footer Banner (Slot 5: Mobile 320x50) */}
          <div className="mt-8 flex justify-center">
            <FooterBanner eventSlug={slug} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle 403 - Private event without token
    if (errorMessage.includes('private event') || errorMessage.includes('token')) {
      return (
        <div className="min-h-screen bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <TokenForm slug={slug} />
          </div>
        </div>
      );
    }

    // Handle 404 - Event not found
    if (errorMessage.includes('not found')) {
      notFound();
    }

    // Other errors - show error message
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-100 mb-2">
              Error Loading Event
            </h2>
            <p className="text-red-200">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  try {
    const eventData = await fetchPublicEvent(params.slug);
    return {
      title: `${eventData.event.name} | ShareHub`,
      description:
        eventData.event.description || `View slides and materials for ${eventData.event.name}`,
    };
  } catch {
    return {
      title: 'Event | ShareHub',
      description: 'View event slides and materials',
    };
  }
}
