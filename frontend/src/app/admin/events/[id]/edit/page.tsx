'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EventForm from '@/components/admin/EventForm';
import AdminHeader from '@/components/admin/AdminHeader';
import EventPhotoManager from '@/components/admin/EventPhotoManager';
import SessionManager from '@/components/admin/SessionManager';
import TokenQRCode from '@/components/admin/TokenQRCode';

interface Event {
  id: string;
  tenant_id: string;
  name: string;
  title: string;
  organizer?: string;
  date: string;
  slug: string;
  description: string | null;
  visibility: 'public' | 'private';
  status: 'draft' | 'upcoming' | 'ongoing' | 'past';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();

  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'sessions' | 'tokens'>('details');
  const [authToken, setAuthToken] = useState<string | null>(null);

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

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Fetch event from Supabase
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          throw new Error('Evento non trovato');
        }
        throw new Error('Errore nel caricamento dell\'evento');
      }

      setEvent(eventData);
      setAuthToken(token);

      // Fetch sessions for this event
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      } else {
        setSessions(sessionsData || []);
      }
    } catch (err: any) {
      console.error('Error fetching event:', err);
      setError(err.message || 'Errore nel caricamento dell\'evento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Update event via Supabase
      const { data: updatedEvent, error: updateError } = await supabase
        .from('events')
        .update({
          name: data.name,
          title: data.title,
          organizer: data.organizer,
          date: data.date,
          end_date: data.end_date,
          description: data.description,
          visibility: data.visibility,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update event');
      }

      setEvent(updatedEvent);
      setSuccess(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating event:', err);
      setError(err.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const isPastEvent = (event: Event): boolean => {
    return event.status === 'past';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Caricamento...</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  const isReadOnly = isPastEvent(event);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
      <AdminHeader
        title={isReadOnly ? 'Visualizza Evento' : 'Modifica Evento'}
        subtitle={isReadOnly ? 'Questo evento è concluso e non può essere modificato' : 'Aggiorna i dettagli dell\'evento'}
        actions={
          <button
            onClick={() => router.push('/admin/events')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isReadOnly ? 'Chiudi' : 'Annulla'}
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Bar - Shows for all tabs */}
        {!isReadOnly && (
          <div className="bg-white dark:bg-gray-900 rounded-t-lg shadow-md px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  {activeTab === 'details' && 'Modifica Dettagli Evento'}
                  {activeTab === 'photos' && 'Gestisci Foto Evento'}
                  {activeTab === 'sessions' && 'Gestisci Sessioni e Interventi'}
                  {activeTab === 'tokens' && 'Gestisci Token di Accesso'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {activeTab === 'details' && 'Modifica i dettagli principali dell\'evento'}
                  {activeTab === 'photos' && 'Carica, ordina e gestisci le foto dell\'evento'}
                  {activeTab === 'sessions' && 'Crea e organizza sessioni e interventi'}
                  {activeTab === 'tokens' && 'Genera token di accesso per eventi privati'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/admin/events')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Torna alla Lista
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className={`bg-white dark:bg-gray-900 ${isReadOnly ? 'rounded-t-lg' : ''} shadow-md border-b border-gray-200 dark:border-gray-800`}>
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Event Details
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'photos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Photos
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sessions & Speeches
            </button>
            {event.visibility === 'private' && (
              <button
                onClick={() => setActiveTab('tokens')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'tokens'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Access Tokens
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-900 rounded-b-lg shadow-md p-6 border border-gray-200 dark:border-gray-800">
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-green-900">Successo</h3>
                  <p className="text-sm text-green-800 mt-1">
                    Le modifiche sono state salvate con successo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && !success && (
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

          {/* Details Tab */}
          {activeTab === 'details' && (
            <EventForm
              mode="edit"
              initialData={event}
              onSubmit={handleSubmit}
              isReadOnly={isReadOnly}
            />
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && authToken && (
            <EventPhotoManager
              eventId={eventId}
              token={authToken}
              onUpdate={() => {
                // Optionally refresh event data
                fetchEvent();
              }}
            />
          )}

          {/* Sessions & Speeches Tab */}
          {activeTab === 'sessions' && authToken && (
            <SessionManager
              eventId={eventId}
              eventDate={event.date}
              sessions={sessions}
              accessToken={authToken}
            />
          )}

          {/* Tokens Tab */}
          {activeTab === 'tokens' && authToken && event.visibility === 'private' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Access Tokens for Private Event
                </h3>
                <p className="text-sm text-blue-800">
                  Generate and manage access tokens for this private event.
                  Tokens allow attendees to view the event without public access.
                </p>
              </div>
              {/* Token management UI would go here */}
              <p className="text-gray-500 italic">Token management interface coming soon...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
