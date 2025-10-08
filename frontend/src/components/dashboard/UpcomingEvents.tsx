'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date: string;
  slug: string;
  visibility: 'public' | 'private';
  status: 'draft' | 'upcoming' | 'ongoing' | 'past';
  sessions_count?: number;
  speeches_count?: number;
}

export default function UpcomingEvents() {
  const supabase = createClientComponentClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: adminData } = await supabase
        .from('admins')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!adminData) return;

      // Get upcoming events (next 5)
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name, date, slug, visibility, status')
        .eq('tenant_id', adminData.tenant_id)
        .in('status', ['draft', 'upcoming', 'ongoing'])
        .order('date', { ascending: true })
        .limit(5);

      // Fetch counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          // Get sessions count
          const { count: sessionsCount } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          // Get speeches count
          const { data: sessions } = await supabase
            .from('sessions')
            .select('id')
            .eq('event_id', event.id);

          const sessionIds = (sessions || []).map(s => s.id);
          let speechesCount = 0;
          if (sessionIds.length > 0) {
            const { count } = await supabase
              .from('speeches')
              .select('*', { count: 'exact', head: true })
              .in('session_id', sessionIds);
            speechesCount = count || 0;
          }

          return {
            ...event,
            sessions_count: sessionsCount || 0,
            speeches_count: speechesCount,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: Event['status']) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      upcoming: 'bg-blue-100 text-blue-700',
      ongoing: 'bg-green-100 text-green-700',
      past: 'bg-gray-100 text-gray-500',
    };
    const labels = {
      draft: 'Bozza',
      upcoming: 'Prossimo',
      ongoing: 'In corso',
      past: 'Concluso',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prossimi Eventi</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prossimi Eventi</h3>
        <p className="text-gray-500 text-center py-8">Nessun evento programmato</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Prossimi Eventi</h3>
        <Link
          href="/admin/events/new"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuovo Evento
        </Link>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-semibold text-gray-900">{event.name}</h4>
                {getStatusBadge(event.status)}
                {event.visibility === 'private' && (
                  <span className="text-gray-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{formatDate(event.date)}</p>
              <div className="flex gap-3 mt-1 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span>📂</span>
                  {event.sessions_count || 0} {event.sessions_count === 1 ? 'sessione' : 'sessioni'}
                </span>
                <span className="flex items-center gap-1">
                  <span>💬</span>
                  {event.speeches_count || 0} {event.speeches_count === 1 ? 'intervento' : 'interventi'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/events/${event.id}/dashboard`}
                className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Vedi
              </Link>
              <Link
                href={`/admin/events/${event.id}/edit`}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Modifica
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
