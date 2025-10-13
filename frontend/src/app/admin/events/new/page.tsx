'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EventForm from '@/components/admin/EventForm';
import TokenDisplay from '@/components/events/TokenDisplay';
import AdminHeader from '@/components/admin/AdminHeader';

interface TokensResponse {
  admin_token: string;
  organizer_token: string;
  participant_token: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokensResponse | null>(null);
  const [createdEventName, setCreatedEventName] = useState<string>('');

  const handleSubmit = async (data: any) => {
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
        console.error('Admin lookup error:', adminError);
        throw new Error(`Unable to fetch user tenant: ${adminError?.message || 'User not found in admins table'}`);
      }

      console.log('Admin tenant ID:', adminData.tenant_id);

      // Generate slug from event name (if name is slug-friendly, otherwise use it as is)
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Prepare event data for Feature 003
      const eventData = {
        tenant_id: adminData.tenant_id,
        slug: slug,
        name: data.name,
        title: data.title,
        organizer: data.organizer || null,
        date: data.date,
        description: data.description || null,
        visibility: data.visibility,
        status: 'upcoming',
        token_expiration_date: data.visibility === 'private' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        retention_policy: 'keep_forever',
        created_by: user.id,
      };

      console.log('Attempting to insert event:', eventData);

      // Insert event directly into Supabase
      const { data: createdEvent, error: createError } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      console.log('Insert result:', { createdEvent, createError });

      if (createError) {
        console.error('Insert error details:', {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        });
        throw createError;
      }

      // For now, redirect immediately (token generation will be added later)
      router.push('/admin/events');
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/admin/events');
  };

  // Show tokens screen after creating private event
  if (tokens) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-brandBlack">Evento Creato con Successo!</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <div className="flex-shrink-0">
                <svg
                  className="w-12 h-12 text-green-500"
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
              </div>
              <div>
                <h2 className="text-xl font-semibold text-brandBlack">{createdEventName}</h2>
                <p className="text-sm text-brandInk/70">Evento privato creato con successo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary rounded-lg p-4">
                <div className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-brandBlack mb-1">
                      Salva questi token
                    </h3>
                    <p className="text-sm text-brandInk">
                      Questi token sono necessari per accedere all'evento privato.
                      Conservali in un luogo sicuro - non potranno essere recuperati successivamente.
                    </p>
                  </div>
                </div>
              </div>

              <TokenDisplay
                label="Admin Token"
                token={tokens.admin_token}
                description="Accesso completo per amministratori"
              />

              <TokenDisplay
                label="Organizer Token"
                token={tokens.organizer_token}
                description="Accesso per organizzatori (upload e gestione slide)"
              />

              <TokenDisplay
                label="Participant Token"
                token={tokens.participant_token}
                description="Accesso per partecipanti (solo download)"
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleContinue}
                className="w-full bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary font-medium transition-colors"
              >
                Continua alla Lista Eventi
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show event form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
      <AdminHeader
        title="Crea Nuovo Evento"
        subtitle="Compila i dettagli per creare un nuovo evento"
        actions={
          <button
            onClick={() => router.push('/admin/events')}
            className="px-4 py-2 text-sm font-medium text-brandInk bg-white border border-gray-300 rounded-lg hover:bg-primary/10 transition-colors"
          >
            Annulla
          </button>
        }
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
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

          <EventForm
            mode="create"
            onSubmit={handleSubmit}
          />
        </div>
      </main>
    </div>
  );
}
