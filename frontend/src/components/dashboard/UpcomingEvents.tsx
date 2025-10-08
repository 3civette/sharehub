'use client';

interface Event {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'upcoming' | 'ongoing' | 'past';
  visibility: 'public' | 'private';
  slug: string;
}

interface UpcomingEventsProps {
  events: Event[];
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'past':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Bozza';
      case 'upcoming':
        return 'In Arrivo';
      case 'ongoing':
        return 'In Corso';
      case 'past':
        return 'Passato';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    const formattedDate = date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (days === 0) {
      return `Oggi • ${formattedDate}`;
    } else if (days === 1) {
      return `Domani • ${formattedDate}`;
    } else if (days > 0 && days <= 7) {
      return `Tra ${days} giorni • ${formattedDate}`;
    } else if (days > 7 && days <= 30) {
      const weeks = Math.floor(days / 7);
      return `Tra ${weeks} settiman${weeks === 1 ? 'a' : 'e'} • ${formattedDate}`;
    } else {
      return formattedDate;
    }
  };

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prossimi Eventi</h2>
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-600 mb-2">Nessun evento programmato</p>
          <p className="text-sm text-gray-500">Crea il tuo primo evento per iniziare</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Prossimi Eventi</h2>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
          >
            {/* Date Badge */}
            <div className="flex-shrink-0 text-center">
              <div className="bg-blue-600 text-white rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold">
                  {new Date(event.date).getDate()}
                </div>
                <div className="text-xs uppercase">
                  {new Date(event.date).toLocaleDateString('it-IT', { month: 'short' })}
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {event.name}
                </h3>
                <span
                  className={`ml-2 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(
                    event.status
                  )}`}
                >
                  {getStatusLabel(event.status)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{formatDate(event.date)}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span className="flex items-center">
                    {event.visibility === 'public' ? (
                      <>
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Pubblico
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Privato
                      </>
                    )}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <a
                    href={`/events/${event.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    title="Visualizza pagina pubblica"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Vedi
                  </a>
                  <a
                    href={`/admin/events/${event.id}/edit`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    title="Modifica evento"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Modifica
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
