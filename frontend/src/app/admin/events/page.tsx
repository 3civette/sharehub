'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EventList from '@/components/admin/EventList';
import AdminHeader from '@/components/admin/AdminHeader';

interface Event {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  date: string;
  description: string | null;
  visibility: 'public' | 'private';
  status: 'upcoming' | 'past' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  sessions_count?: number;
  speeches_count?: number;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [searchParams]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user for auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get admin's tenant
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (adminError || !adminData) {
        throw new Error('Unable to fetch user tenant');
      }

      // Parse URL params
      const sort = searchParams.get('sort') || 'date-asc';
      const filter = searchParams.get('filter') || 'all';

      // Build query
      let query = supabase
        .from('events')
        .select('*')
        .eq('tenant_id', adminData.tenant_id);

      // Apply filters
      if (filter === 'upcoming') {
        query = query.eq('status', 'upcoming');
      } else if (filter === 'past') {
        query = query.eq('status', 'past');
      } else if (filter === 'archived') {
        query = query.eq('status', 'archived');
      }

      // Apply sorting
      const [sortField, sortOrder] = sort.split('-');
      query = query.order(sortField === 'date' ? 'date' : 'created_at', {
        ascending: sortOrder === 'asc'
      });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Fetch counts for each event
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
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
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/admin/events/${eventId}/edit`);
  };

  const handleNewEvent = () => {
    router.push('/admin/events/new');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <AdminHeader
        title="Gestione Eventi"
        subtitle="Visualizza e gestisci tutti i tuoi eventi"
        actions={
          <button
            onClick={handleNewEvent}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuovo Evento
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-900">Errore</h3>
                <p className="text-sm text-red-800 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <EventList
            events={events}
            onEventClick={handleEventClick}
          />
        </div>
      </main>
    </div>
  );
}
