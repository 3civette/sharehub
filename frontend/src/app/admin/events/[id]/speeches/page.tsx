// Feature 005: Speech Management Page
// Manage speeches for an event (list, create, edit, delete)

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import SpeechManager from '@/components/admin/SpeechManager';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function SpeechesPage({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies });

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  try {
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, slug')
      .eq('id', params.id)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Get sessions for this event (needed for dropdown)
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, title, start_time')
      .eq('event_id', params.id)
      .order('start_time', { ascending: true });

    if (sessionsError) {
      throw new Error('Failed to load sessions');
    }

    // Get speeches with session info
    const { data: speeches, error: speechesError } = await supabase
      .from('speeches')
      .select(`
        *,
        session:sessions!inner(id, title, event_id)
      `)
      .eq('session.event_id', params.id)
      .order('created_at', { ascending: true });

    if (speechesError) {
      console.error('Speeches error:', speechesError);
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <a
              href={`/admin/events/${params.id}/dashboard`}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← Torna alla Dashboard
            </a>
          </div>

          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Gestione Interventi</h1>
            <p className="text-gray-600 mt-2">Evento: {event.name}</p>
          </div>

          {/* Speech Manager Component */}
          <SpeechManager
            eventId={params.id}
            sessions={sessions || []}
            speeches={speeches || []}
            accessToken={session.access_token}
          />
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Speeches page error:', error);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
          <p className="text-gray-700 mb-4">
            Si è verificato un errore nel caricamento degli interventi.
          </p>
          <p className="text-sm text-gray-500 mb-4">{error.message}</p>
          <a
            href={`/admin/events/${params.id}/dashboard`}
            className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Torna alla Dashboard
          </a>
        </div>
      </div>
    );
  }
}
