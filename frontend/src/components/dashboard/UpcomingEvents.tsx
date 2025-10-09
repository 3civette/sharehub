'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { Plus, Lock, ExternalLink, Edit, FolderOpen, MessageSquare } from 'lucide-react';

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

      // Get upcoming events (next 5) - optimized to avoid N+1 queries
      const { data: eventsData } = await supabase
        .from('events')
        .select(`
          id,
          name,
          date,
          slug,
          visibility,
          status,
          sessions:sessions(count)
        `)
        .eq('tenant_id', adminData.tenant_id)
        .in('status', ['draft', 'upcoming', 'ongoing'])
        .order('date', { ascending: true })
        .limit(5);

      // Fetch all speeches counts in a single query
      const eventIds = (eventsData || []).map(e => e.id);
      let speechesCountByEvent: Record<string, number> = {};

      if (eventIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id, event_id')
          .in('event_id', eventIds);

        if (sessionsData && sessionsData.length > 0) {
          const sessionIds = sessionsData.map(s => s.id);
          const { data: speechesData } = await supabase
            .from('speeches')
            .select('id, session_id, sessions!inner(event_id)')
            .in('session_id', sessionIds);

          // Count speeches per event
          (speechesData || []).forEach((speech: any) => {
            const eventId = speech.sessions.event_id;
            speechesCountByEvent[eventId] = (speechesCountByEvent[eventId] || 0) + 1;
          });
        }
      }

      // Map counts to events
      const eventsWithCounts = (eventsData || []).map(event => ({
        id: event.id,
        name: event.name,
        date: event.date,
        slug: event.slug,
        visibility: event.visibility,
        status: event.status,
        sessions_count: event.sessions?.[0]?.count || 0,
        speeches_count: speechesCountByEvent[event.id] || 0,
      }));

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
      draft: 'bg-brandSilver text-brandInk',
      upcoming: 'bg-primary/10 text-primary',
      ongoing: 'bg-green-100 text-green-700',
      past: 'bg-brandSilver text-brandInk/50',
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
      <div className="bg-white dark:bg-[#111827] rounded-lg shadow-card p-6 border border-transparent dark:border-[#374151]">
        <h3 className="text-lg font-semibold text-brandBlack dark:text-white mb-4">Prossimi Eventi</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-lg shadow-card p-6 border border-transparent dark:border-[#374151]">
        <h3 className="text-lg font-semibold text-brandBlack dark:text-white mb-4">Prossimi Eventi</h3>
        <p className="text-brandInk/50 dark:text-[#E5E7EB]/50 text-center py-8">Nessun evento programmato</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111827] rounded-lg shadow-card p-6 border border-transparent dark:border-[#374151]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brandBlack dark:text-white">Prossimi Eventi</h3>
        <Link
          href="/admin/events/new"
          className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all duration-200 rounded-lg flex items-center gap-2 shadow-button"
        >
          <Plus className="w-4 h-4" />
          Nuovo Evento
        </Link>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => window.location.href = `/admin/events/${event.id}/dashboard`}
            className="flex items-center justify-between p-4 rounded-lg border border-brandSilver dark:border-[#374151] hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-semibold text-brandBlack dark:text-white">{event.name}</h4>
                {getStatusBadge(event.status)}
                {event.visibility === 'private' && (
                  <span className="text-brandInk/40 dark:text-[#E5E7EB]/40">
                    <Lock className="w-4 h-4" />
                  </span>
                )}
              </div>
              <p className="text-sm text-brandInk/70 dark:text-[#E5E7EB]">{formatDate(event.date)}</p>
              <div className="flex gap-3 mt-1 text-xs text-brandInk/60 dark:text-[#E5E7EB]/60">
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5" />
                  {event.sessions_count || 0} {event.sessions_count === 1 ? 'sessione' : 'sessioni'}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {event.speeches_count || 0} {event.speeches_count === 1 ? 'intervento' : 'interventi'}
                </span>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/admin/events/${event.id}/dashboard`}
                className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/20 active:scale-95 transition-all duration-200 rounded-lg"
              >
                Dashboard
              </Link>
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/10 dark:hover:bg-primary/20 active:scale-95 transition-all duration-200 rounded-lg flex items-center gap-1"
              >
                Vedi
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href={`/admin/events/${event.id}/edit`}
                className="px-3 py-1.5 text-sm font-medium text-brandInk dark:text-[#E5E7EB] hover:text-brandBlack dark:hover:text-white hover:bg-bgSoft dark:hover:bg-[#0B0B0C] active:scale-95 transition-all duration-200 rounded-lg flex items-center gap-1"
              >
                <Edit className="w-3 h-3" />
                Modifica
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
