'use client';

// Feature 005-ora-facciamo-la: Event Management Dashboard
// Component: Token display with copy/download functionality

import { useState } from 'react';
import { AccessToken } from '@/types/admin';

interface TokenManagerProps {
  tokens: AccessToken[];
  eventId: string;
  eventSlug: string;
}

export default function TokenManager({ tokens, eventId, eventSlug }: TokenManagerProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  if (tokens.length === 0) {
    return null; // Hidden for public events
  }

  const copyToClipboard = async (token: string, type: string) => {
    try {
      // Modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(token);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = token;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopiedToken(type);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Impossibile copiare il token');
    }
  };

  const downloadQR = async (tokenId: string) => {
    try {
      const authToken = localStorage.getItem('supabase.auth.token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/tokens/${tokenId}/qr`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download QR code');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participant-token-${eventSlug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('QR download failed:', error);
      alert('Impossibile scaricare il codice QR');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const organizerToken = tokens.find((t) => t.token_type === 'single');
  const participantToken = tokens.find((t) => t.token_type === 'group');

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Token di Accesso</h2>

      <div className="space-y-4">
        {/* Organizer Token */}
        {organizerToken && (
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold text-blue-900">Token Organizzatore</span>
                  <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                    Gestione completa
                  </span>
                </div>

                <div className="bg-white rounded px-3 py-2 font-mono text-sm text-gray-800 mb-3">
                  {organizerToken.token}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Scadenza:</span>{' '}
                    {organizerToken.expires_at ? formatDate(organizerToken.expires_at) : 'Mai'}
                  </div>
                  <div>
                    <span className="font-medium">Utilizzi:</span> {organizerToken.use_count || 0}
                  </div>
                  <div>
                    <span className="font-medium">Ultimo utilizzo:</span>{' '}
                    {organizerToken.last_used_at
                      ? formatDate(organizerToken.last_used_at)
                      : 'Mai'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(organizerToken.token, 'organizer')}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                {copiedToken === 'organizer' ? (
                  <>
                    <span>✓</span>
                    <span>Copiato!</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>Copia</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Participant Token */}
        {participantToken && (
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold text-green-900">Token Partecipante</span>
                  <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded">
                    Sola lettura
                  </span>
                </div>

                <div className="bg-white rounded px-3 py-2 font-mono text-sm text-gray-800 mb-3">
                  {participantToken.token}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Scadenza:</span>{' '}
                    {participantToken.expires_at ? formatDate(participantToken.expires_at) : 'Mai'}
                  </div>
                  <div>
                    <span className="font-medium">Utilizzi:</span> {participantToken.use_count || 0}
                  </div>
                  <div>
                    <span className="font-medium">Ultimo utilizzo:</span>{' '}
                    {participantToken.last_used_at
                      ? formatDate(participantToken.last_used_at)
                      : 'Mai'}
                  </div>
                </div>
              </div>

              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => copyToClipboard(participantToken.token, 'participant')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  {copiedToken === 'participant' ? (
                    <>
                      <span>✓</span>
                      <span>Copiato!</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>Copia</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => downloadQR(participantToken.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <span>📥</span>
                  <span>Scarica QR</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        <strong>Nota:</strong> I token di accesso permettono di visualizzare la pagina pubblica
        dell'evento. Il token organizzatore offre funzionalità aggiuntive.
      </div>
    </div>
  );
}
