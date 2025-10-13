// Feature 005: Session Management Page
// Manage sessions for an event (list, create, edit, delete)

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import SessionManager from '@/components/admin/SessionManager';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function SessionsPage({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies });

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  try {
    // Get event details including date
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, slug, date')
      .eq('id', params.id)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Get sessions for this event
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('event_id', params.id)
      .order('start_time', { ascending: true });

    if (sessionsError) {
      throw new Error('Failed to load sessions');
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <a
              href={`/admin/events/${params.id}/dashboard`}
              className="text-primary hover:text-primary/90 flex items-center gap-2"
            >
              ← Torna alla Dashboard
            </a>
          </div>

          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-brandBlack">Gestione Sessioni</h1>
            <p className="text-brandInk/70 mt-2">Evento: {event.name}</p>
            <p className="text-sm text-brandInk/70 mt-1">
              Data evento: {new Date(event.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Session Manager Component */}
          <SessionManager
            eventId={params.id}
            eventDate={event.date}
            sessions={sessions || []}
            accessToken={session.access_token}
          />
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Sessions page error:', error);

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C] flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-8 max-w-md border border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
          <p className="text-brandInk mb-4">
            Si è verificato un errore nel caricamento delle sessioni.
          </p>
          <p className="text-sm text-brandInk/70 mb-4">{error.message}</p>
          <a
            href={`/admin/events/${params.id}/dashboard`}
            className="block text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Torna alla Dashboard
          </a>
        </div>
      </div>
    );
  }
}
