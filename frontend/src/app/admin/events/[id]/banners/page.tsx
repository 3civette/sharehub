'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AdminHeader from '@/components/admin/AdminHeader';
import BannerManager from '@/components/admin/BannerManager';

interface Event {
  id: string;
  name: string;
  title: string;
  status: 'draft' | 'upcoming' | 'ongoing' | 'past';
}

export default function EventBannersPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();

  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user for auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch event from Supabase
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, title, status')
        .eq('id', eventId)
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          throw new Error('Evento non trovato');
        }
        throw new Error('Errore nel caricamento dell\'evento');
      }

      setEvent(eventData);
    } catch (err: any) {
      console.error('Error fetching event:', err);
      setError(err.message || 'Errore nel caricamento dell\'evento');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Caricamento...</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento evento...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Errore</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex gap-3">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0"
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
                <h3 className="text-lg font-medium text-gray-900">Errore</h3>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
                <button
                  onClick={() => router.push('/admin/events')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Torna alla Lista Eventi
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
      <AdminHeader
        title="Gestione Banner"
        subtitle={`Gestisci i banner pubblicitari per ${event.name}`}
        actions={
          <button
            onClick={() => router.push(`/admin/events/${eventId}/dashboard`)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Torna alla Dashboard
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
          <BannerManager
            eventId={eventId}
            onUpdate={() => {
              // Optionally refresh event data
              fetchEvent();
            }}
          />
        </div>
      </main>
    </div>
  );
}
