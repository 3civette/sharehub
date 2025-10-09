'use client';

// Feature 005: Session Manager Component
// Manage sessions (CRUD operations) with date selection from event date

import { useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface Session {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  room: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface SessionManagerProps {
  eventId: string;
  eventDate: string; // ISO date from event
  sessions: Session[];
  accessToken: string;
}

export default function SessionManager({ eventId, eventDate, sessions: initialSessions, accessToken }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '', // Just time (HH:mm)
    end_time: '', // Just time (HH:mm)
    room: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      room: '',
    });
    setIsCreating(false);
    setEditingId(null);
  };

  // Combine event date with time to create ISO datetime
  const combineDateAndTime = (time: string): string => {
    if (!time) return '';
    // eventDate is in format YYYY-MM-DD
    // time is in format HH:mm
    return `${eventDate}T${time}:00.000Z`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || null,
            start_time: combineDateAndTime(formData.start_time),
            end_time: formData.end_time ? combineDateAndTime(formData.end_time) : null,
            room: formData.room || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const newSession = await response.json();
      setSessions([...sessions, newSession]);
      resetForm();
    } catch (error) {
      console.error('Create session error:', error);
      alert('Errore nella creazione della sessione');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/sessions/${editingId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || null,
            start_time: combineDateAndTime(formData.start_time),
            end_time: formData.end_time ? combineDateAndTime(formData.end_time) : null,
            room: formData.room || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      const updatedSession = await response.json();
      setSessions(sessions.map((s) => (s.id === editingId ? updatedSession : s)));
      resetForm();
    } catch (error) {
      console.error('Update session error:', error);
      alert('Errore nell\'aggiornamento della sessione');
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sessione? Questa azione eliminerà anche tutti gli interventi associati e non può essere annullata.')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${eventId}/sessions/${sessionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Delete session error:', error);
      alert('Errore nell\'eliminazione della sessione');
    }
  };

  const startEdit = (session: Session) => {
    // Extract time from ISO datetime (session.start_time is like "2024-10-08T14:30:00Z")
    const extractTime = (isoDateTime: string) => {
      const date = new Date(isoDateTime);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    setFormData({
      title: session.title,
      description: session.description || '',
      start_time: extractTime(session.start_time),
      end_time: session.end_time ? extractTime(session.end_time) : '',
      room: session.room || '',
    });
    setEditingId(session.id);
    setIsCreating(false);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Event Date Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <strong>Data dell'evento:</strong> {formatEventDate(eventDate)}
        </p>
        <p className="text-sm text-blue-700 mt-1">
          Le sessioni verranno create per questa data. Indica solo gli orari di inizio e fine.
        </p>
      </div>

      {/* Create Button */}
      {!isCreating && !editingId && (
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + Crea Nuova Sessione
        </button>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingId ? 'Modifica Sessione' : 'Crea Nuova Sessione'}
          </h2>

          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titolo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                maxLength={100}
                placeholder="es. Sessione Mattutina"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                maxLength={500}
                placeholder="Descrizione opzionale della sessione"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orario di Inizio <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Sarà nella data: {formatEventDate(eventDate)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orario di Fine
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sala/Luogo
              </label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={50}
                placeholder="es. Sala Conferenze A"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? 'Salva Modifiche' : 'Crea Sessione'}
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

      {/* Sessions List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sessioni ({sessions.length})</h2>

        {sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nessuna sessione creata. Clicca su "Crea Nuova Sessione" per iniziare.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{session.title}</h3>
                    {session.description && (
                      <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(session.start_time)}
                      </span>
                      {session.end_time && (
                        <span>→ {formatDateTime(session.end_time)}</span>
                      )}
                      {session.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {session.room}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(session)}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
