'use client';

// Feature 005: Speech Manager Component
// Manage speeches (CRUD operations)

import { useState } from 'react';

interface Session {
  id: string;
  title: string;
  start_time: string;
}

interface Speech {
  id: string;
  session_id: string;
  title: string;
  speaker_name: string | null;
  description: string | null;
  duration: number | null;
  display_order: number;
  session: {
    id: string;
    title: string;
  };
  created_at: string;
  updated_at: string;
}

interface SpeechManagerProps {
  eventId: string;
  sessions: Session[];
  speeches: Speech[];
  accessToken: string;
}

export default function SpeechManager({ eventId, sessions, speeches: initialSpeeches, accessToken }: SpeechManagerProps) {
  const [speeches, setSpeeches] = useState<Speech[]>(initialSpeeches);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    session_id: '',
    title: '',
    speaker_name: '',
    description: '',
    duration: '',
  });

  const resetForm = () => {
    setFormData({
      session_id: '',
      title: '',
      speaker_name: '',
      description: '',
      duration: '',
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.session_id) {
      alert('Seleziona una sessione');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/sessions/${formData.session_id}/speeches`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: formData.title,
            speaker_name: formData.speaker_name || null,
            description: formData.description || null,
            duration: formData.duration ? parseInt(formData.duration) : null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create speech');
      }

      const newSpeech = await response.json();

      // Add session info to match the interface
      const session = sessions.find(s => s.id === formData.session_id);
      setSpeeches([...speeches, { ...newSpeech, session: { id: session!.id, title: session!.title } }]);
      resetForm();
    } catch (error) {
      console.error('Create speech error:', error);
      alert('Errore nella creazione dell\'intervento');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId || !formData.session_id) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/sessions/${formData.session_id}/speeches/${editingId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: formData.title,
            speaker_name: formData.speaker_name || null,
            description: formData.description || null,
            duration: formData.duration ? parseInt(formData.duration) : null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update speech');
      }

      const updatedSpeech = await response.json();
      const session = sessions.find(s => s.id === formData.session_id);
      setSpeeches(speeches.map((s) => (s.id === editingId ? { ...updatedSpeech, session: { id: session!.id, title: session!.title } } : s)));
      resetForm();
    } catch (error) {
      console.error('Update speech error:', error);
      alert('Errore nell\'aggiornamento dell\'intervento');
    }
  };

  const handleDelete = async (speech: Speech) => {
    if (!confirm('Sei sicuro di voler eliminare questo intervento? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/sessions/${speech.session_id}/speeches/${speech.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete speech');
      }

      setSpeeches(speeches.filter((s) => s.id !== speech.id));
    } catch (error) {
      console.error('Delete speech error:', error);
      alert('Errore nell\'eliminazione dell\'intervento');
    }
  };

  const startEdit = (speech: Speech) => {
    setFormData({
      session_id: speech.session_id,
      title: speech.title,
      speaker_name: speech.speaker_name || '',
      description: speech.description || '',
      duration: speech.duration?.toString() || '',
    });
    setEditingId(speech.id);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Warning if no sessions */}
      {sessions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            ⚠️ Non ci sono sessioni disponibili. <a href={`/admin/events/${eventId}/sessions`} className="underline font-medium">Crea prima una sessione</a> per poter aggiungere interventi.
          </p>
        </div>
      )}

      {/* Create Button */}
      {!isCreating && !editingId && sessions.length > 0 && (
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
        >
          + Crea Nuovo Intervento
        </button>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingId ? 'Modifica Intervento' : 'Crea Nuovo Intervento'}
          </h2>

          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sessione <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.session_id}
                onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Seleziona una sessione</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title} - {new Date(session.start_time).toLocaleDateString('it-IT')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titolo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                maxLength={150}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relatore
              </label>
              <input
                type="text"
                value={formData.speaker_name}
                onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={100}
                placeholder="Nome del relatore"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durata (minuti)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                min="1"
                max="600"
                placeholder="es. 30"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
              >
                {editingId ? 'Salva Modifiche' : 'Crea Intervento'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Speeches List - Grouped by Session */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Interventi ({speeches.length})</h2>

        {speeches.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {sessions.length === 0
              ? 'Crea prima una sessione per poter aggiungere interventi.'
              : 'Nessun intervento creato. Clicca su "Crea Nuovo Intervento" per iniziare.'}
          </p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const sessionSpeeches = speeches.filter((s) => s.session_id === session.id);
              if (sessionSpeeches.length === 0) return null;

              return (
                <div key={session.id} className="border rounded-lg overflow-hidden">
                  {/* Session Header */}
                  <div className="bg-blue-50 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">📂 {session.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(session.start_time).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  {/* Speeches in this session */}
                  <div className="divide-y">
                    {sessionSpeeches.map((speech) => (
                      <div
                        key={speech.id}
                        className="p-4 hover:bg-gray-50 transition flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{speech.title}</h4>
                          {speech.speaker_name && (
                            <p className="text-sm text-gray-600 mt-1">👤 {speech.speaker_name}</p>
                          )}
                          {speech.description && (
                            <p className="text-sm text-gray-600 mt-1">{speech.description}</p>
                          )}
                          {speech.duration && (
                            <p className="text-xs text-gray-500 mt-1">⏱️ {speech.duration} min</p>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEdit(speech)}
                            className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDelete(speech)}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
