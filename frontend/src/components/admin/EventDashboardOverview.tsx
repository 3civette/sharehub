'use client';

// Feature 005-ora-facciamo-la: Event Management Dashboard
// Component: Event overview with metrics display

import { Event } from '@/types/admin';

interface MetricsSummary {
  pageViews: number;
  slideDownloads: number;
  participantCount: number;
  lastRefreshed: string;
}

interface EventDashboardOverviewProps {
  event: Event;
  metrics: MetricsSummary;
}

export default function EventDashboardOverview({ event, metrics }: EventDashboardOverviewProps) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    upcoming: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-green-100 text-green-800',
    past: 'bg-gray-100 text-gray-600',
  };

  const visibilityIcons = {
    public: '🌐',
    private: '🔒',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatLastRefreshed = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Event Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
              {event.status}
            </span>
            <span className="text-xl">{visibilityIcons[event.visibility]}</span>
          </div>
          <p className="text-gray-600">
            📅 {formatDate(event.date)}
          </p>
          {event.description && (
            <p className="mt-3 text-gray-700">{event.description}</p>
          )}
        </div>

        <div className="flex gap-2">
          <a
            href={`/admin/events/${event.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Modifica Evento
          </a>
          <a
            href={`/events/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Vedi Pagina Pubblica
          </a>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Visualizzazioni</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{metrics.pageViews}</p>
            </div>
            <div className="text-4xl">👁️</div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Download Slide</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{metrics.slideDownloads}</p>
            </div>
            <div className="text-4xl">📥</div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Partecipanti</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{metrics.participantCount}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
      </div>

      {/* Last Refreshed */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Ultimo aggiornamento: {formatLastRefreshed(metrics.lastRefreshed)}
      </div>
    </div>
  );
}
