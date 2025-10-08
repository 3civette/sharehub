// Feature 005-ora-facciamo-la: Event Management Dashboard
// Page: Complete event management dashboard

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from '@/services/dashboardService';
import EventDashboardOverview from '@/components/admin/EventDashboardOverview';
import TokenManager from '@/components/admin/TokenManager';

// Disable caching for this page - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EventDashboardPage({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies });

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  try {
    // Fetch dashboard data
    const dashboardData = await fetchDashboardData(params.id, session.access_token);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <a
              href="/admin/events"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← Torna a Gestione Eventi
            </a>
          </div>

          {/* Page Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Evento</h1>

          {/* Dashboard Sections */}
          <div className="space-y-6">
            {/* Event Overview & Metrics */}
            <EventDashboardOverview
              event={dashboardData.event}
              metrics={dashboardData.metrics}
            />

            {/* Access Tokens (hidden for public events) */}
            <TokenManager
              tokens={dashboardData.tokens}
              eventId={dashboardData.event.id}
              eventSlug={dashboardData.event.slug}
            />

            {/* Sessions & Speeches Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Sessioni e Interventi</h2>
                <div className="flex gap-2">
                  <a
                    href={`/admin/events/${dashboardData.event.id}/sessions`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <span>+</span>
                    <span>Sessione</span>
                  </a>
                  <a
                    href={`/admin/events/${dashboardData.event.id}/speeches`}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <span>+</span>
                    <span>Intervento</span>
                  </a>
                </div>
              </div>
              {dashboardData.sessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nessuna sessione programmata</p>
              ) : (
                <div className="space-y-4">
                  {dashboardData.sessions.map((session) => {
                    const sessionSpeeches = dashboardData.speeches.filter(
                      (speech) => speech.session_id === session.id
                    );
                    return (
                      <div key={session.id} className="border rounded-lg overflow-hidden">
                        {/* Session Header */}
                        <div className="bg-blue-50 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-lg">{session.title}</h3>
                              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                                <span>🕐 {new Date(session.start_time).toLocaleDateString('it-IT')} {new Date(session.start_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                {session.end_time && (
                                  <span>→ {new Date(session.end_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                                {session.room && <span>📍 {session.room}</span>}
                              </div>
                            </div>
                            <a
                              href={`/admin/events/${dashboardData.event.id}/sessions?edit=${session.id}`}
                              className="ml-4 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition"
                            >
                              Modifica
                            </a>
                          </div>
                        </div>
                        {/* Speeches List */}
                        {sessionSpeeches.length > 0 ? (
                          <div className="divide-y">
                            {sessionSpeeches.map((speech) => (
                              <div key={speech.id} className="p-4 hover:bg-gray-50 flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{speech.title}</h4>
                                  {speech.speaker_name && (
                                    <p className="text-sm text-gray-600 mt-1">👤 {speech.speaker_name}</p>
                                  )}
                                  {speech.duration && (
                                    <p className="text-sm text-gray-600 mt-1">⏱️ {speech.duration} min</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    📄 {speech.slide_count} slide
                                  </p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <a
                                    href={`/admin/events/${dashboardData.event.id}/speeches/${speech.id}/slides`}
                                    className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition"
                                  >
                                    Upload Slide
                                  </a>
                                  <a
                                    href={`/admin/events/${dashboardData.event.id}/speeches?edit=${speech.id}`}
                                    className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition"
                                  >
                                    Modifica
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-sm text-gray-500 italic">
                            Nessun intervento in questa sessione
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Event Photos Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Galleria Foto</h2>
              {dashboardData.photos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nessuna foto caricata</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {dashboardData.photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        📷
                      </div>
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                          {photo.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-4 text-center">
                Totale: {dashboardData.photos.length} foto
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Dashboard error:', error);

    if (error.message === 'You do not have access to this event') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white shadow rounded-lg p-8 max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Accesso Negato</h1>
            <p className="text-gray-700 mb-4">
              Non hai i permessi per accedere a questo evento.
            </p>
            <a
              href="/admin/events"
              className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Torna a Gestione Eventi
            </a>
          </div>
        </div>
      );
    }

    if (error.message === 'Event not found') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white shadow rounded-lg p-8 max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Evento Non Trovato</h1>
            <p className="text-gray-700 mb-4">
              L'evento che stai cercando non esiste o è stato eliminato.
            </p>
            <a
              href="/admin/events"
              className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Torna a Gestione Eventi
            </a>
          </div>
        </div>
      );
    }

    // Generic error
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
          <p className="text-gray-700 mb-4">
            Si è verificato un errore nel caricamento della dashboard.
          </p>
          <p className="text-sm text-gray-500 mb-4">{error.message}</p>
          <a
            href="/admin/events"
            className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Torna a Gestione Eventi
          </a>
        </div>
      </div>
    );
  }
}
