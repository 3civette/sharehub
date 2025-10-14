'use client';

// Dashboard Sessions & Speeches Manager
// Unified component to manage sessions and speeches inline

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, Clock, MapPin, Plus, Edit, Trash, Upload } from 'lucide-react';
import ThumbnailQuotaBadge from './ThumbnailQuotaBadge';
import { useThumbnailProgress } from '@/hooks/useThumbnailProgress';

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

interface Speech {
  id: string;
  session_id: string;
  title: string;
  speaker_name: string;
  description: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  slide_count?: number; // Number of slides uploaded
  first_slide_thumbnail?: string | null; // R2 key for first slide thumbnail
  thumbnail_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'none'; // Thumbnail generation status
}

interface DashboardSessionsSpeechesProps {
  eventId: string;
  tenantId: string;
  eventDate: string;
  sessions: Session[];
  speeches: Speech[];
  accessToken: string;
}

export default function DashboardSessionsSpeeches({
  eventId,
  tenantId,
  eventDate,
  sessions: initialSessions,
  speeches: initialSpeeches,
  accessToken,
}: DashboardSessionsSpeechesProps) {
  const supabase = createClientComponentClient();

  const [sessions, setSessions] = useState<Session[]>(initialSessions || []);
  const [speeches, setSpeeches] = useState<Speech[]>(initialSpeeches || []);

  // ==================== REALTIME THUMBNAIL UPDATES ====================

  // Subscribe to thumbnail generation progress updates
  useThumbnailProgress({
    eventId,
    onUpdate: async (update) => {
      console.log('[Dashboard] Thumbnail update received:', update);

      // Fetch the slide to get speech_id
      const { data: slide } = await supabase
        .from('slides')
        .select('speech_id')
        .eq('id', update.slide_id)
        .single();

      if (!slide) {
        console.warn('[Dashboard] Slide not found for update:', update.slide_id);
        return;
      }

      // Update the speech's thumbnail status in local state
      setSpeeches(prevSpeeches =>
        prevSpeeches.map(speech => {
          if (speech.id === slide.speech_id) {
            console.log(`[Dashboard] Updating speech ${speech.id} thumbnail status to ${update.thumbnail_status}`);
            return {
              ...speech,
              thumbnail_status: update.thumbnail_status,
              first_slide_thumbnail: update.thumbnail_r2_key,
            };
          }
          return speech;
        })
      );
    },
    debug: false, // Set to true for development debugging
  });

  // Session form state
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionFormData, setSessionFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    room: '',
  });

  // Speech form state
  const [addingSpeechToSession, setAddingSpeechToSession] = useState<string | null>(null);
  const [editingSpeechId, setEditingSpeechId] = useState<string | null>(null);
  const [speechFormData, setSpeechFormData] = useState({
    session_id: '',
    title: '',
    speaker_name: '',
    description: '',
    duration: '',
  });

  // ==================== SESSION CRUD ====================

  const combineDateAndTime = (time: string): string => {
    if (!time) return '';
    return `${eventDate}T${time}:00.000Z`;
  };

  const resetSessionForm = () => {
    setSessionFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      room: '',
    });
    setIsCreatingSession(false);
    setEditingSessionId(null);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Calculate next display_order (max + 1, or 0 if no sessions)
      const maxDisplayOrder = sessions.length > 0
        ? Math.max(...sessions.map(s => s.display_order))
        : -1;
      const nextDisplayOrder = maxDisplayOrder + 1;

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({
          event_id: eventId,
          tenant_id: tenantId,
          title: sessionFormData.title,
          description: sessionFormData.description || null,
          start_time: combineDateAndTime(sessionFormData.start_time),
          end_time: sessionFormData.end_time ? combineDateAndTime(sessionFormData.end_time) : null,
          room: sessionFormData.room || null,
          display_order: nextDisplayOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setSessions([...sessions, newSession]);
      resetSessionForm();
    } catch (error) {
      console.error('Create session error:', error);
      alert('Errore nella creazione della sessione');
    }
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionId) return;

    try {
      const { data: updatedSession, error } = await supabase
        .from('sessions')
        .update({
          title: sessionFormData.title,
          description: sessionFormData.description || null,
          start_time: combineDateAndTime(sessionFormData.start_time),
          end_time: sessionFormData.end_time ? combineDateAndTime(sessionFormData.end_time) : null,
          room: sessionFormData.room || null,
        })
        .eq('id', editingSessionId)
        .select()
        .single();

      if (error) throw error;

      setSessions(sessions.map((s) => (s.id === editingSessionId ? updatedSession : s)));
      resetSessionForm();
    } catch (error) {
      console.error('Update session error:', error);
      alert('Errore nell\'aggiornamento della sessione');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sessione? Questa azione eliminerà anche tutti gli interventi associati e non può essere annullata.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(sessions.filter((s) => s.id !== sessionId));
      setSpeeches(speeches.filter((sp) => sp.session_id !== sessionId));
    } catch (error) {
      console.error('Delete session error:', error);
      alert('Errore nell\'eliminazione della sessione');
    }
  };

  const startEditSession = (session: Session) => {
    const extractTime = (isoDateTime: string) => {
      const date = new Date(isoDateTime);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    setSessionFormData({
      title: session.title,
      description: session.description || '',
      start_time: extractTime(session.start_time),
      end_time: session.end_time ? extractTime(session.end_time) : '',
      room: session.room || '',
    });
    setEditingSessionId(session.id);
    setIsCreatingSession(false);
  };

  // ==================== SPEECH CRUD ====================

  const resetSpeechForm = () => {
    setSpeechFormData({
      session_id: '',
      title: '',
      speaker_name: '',
      description: '',
      duration: '',
    });
    setAddingSpeechToSession(null);
    setEditingSpeechId(null);
  };

  const handleCreateSpeech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speechFormData.session_id) return;

    try {
      // Calculate next display_order for speeches in this session
      const sessionSpeeches = speeches.filter(sp => sp.session_id === speechFormData.session_id);
      const maxDisplayOrder = sessionSpeeches.length > 0
        ? Math.max(...sessionSpeeches.map(sp => sp.display_order || 0))
        : -1;
      const nextDisplayOrder = maxDisplayOrder + 1;

      const { data: newSpeech, error } = await supabase
        .from('speeches')
        .insert({
          session_id: speechFormData.session_id,
          tenant_id: tenantId,
          title: speechFormData.title,
          speaker_name: speechFormData.speaker_name || null,
          description: speechFormData.description || null,
          duration_minutes: speechFormData.duration ? parseInt(speechFormData.duration) : null,
          display_order: nextDisplayOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setSpeeches([...speeches, newSpeech]);
      resetSpeechForm();
    } catch (error) {
      console.error('Create speech error:', error);
      alert('Errore nella creazione dell\'intervento');
    }
  };

  const handleUpdateSpeech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpeechId) return;

    try {
      const { data: updatedSpeech, error } = await supabase
        .from('speeches')
        .update({
          title: speechFormData.title,
          speaker_name: speechFormData.speaker_name || null,
          description: speechFormData.description || null,
          duration_minutes: speechFormData.duration ? parseInt(speechFormData.duration) : null,
        })
        .eq('id', editingSpeechId)
        .select()
        .single();

      if (error) throw error;

      setSpeeches(speeches.map((sp) => (sp.id === editingSpeechId ? updatedSpeech : sp)));
      resetSpeechForm();
    } catch (error) {
      console.error('Update speech error:', error);
      alert('Errore nell\'aggiornamento dell\'intervento');
    }
  };

  const handleDeleteSpeech = async (speechId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo intervento? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('speeches')
        .delete()
        .eq('id', speechId);

      if (error) throw error;

      setSpeeches(speeches.filter((sp) => sp.id !== speechId));
    } catch (error) {
      console.error('Delete speech error:', error);
      alert('Errore nell\'eliminazione dell\'intervento');
    }
  };

  const startEditSpeech = (speech: Speech) => {
    setSpeechFormData({
      session_id: speech.session_id,
      title: speech.title,
      speaker_name: speech.speaker_name || '',
      description: speech.description || '',
      duration: speech.duration_minutes?.toString() || '',
    });
    setEditingSpeechId(speech.id);
    setAddingSpeechToSession(null);
  };

  const startAddSpeechToSession = (sessionId: string) => {
    setSpeechFormData({
      session_id: sessionId,
      title: '',
      speaker_name: '',
      description: '',
      duration: '',
    });
    setAddingSpeechToSession(sessionId);
    setEditingSpeechId(null);
  };

  // ==================== FORMATTERS ====================

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

  // ==================== RENDER ====================

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-brandBlack">Sessioni e Interventi</h2>
          <ThumbnailQuotaBadge autoFetch={true} />
        </div>
        {!isCreatingSession && !editingSessionId && (
          <button
            onClick={() => setIsCreatingSession(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuova Sessione</span>
          </button>
        )}
      </div>

      {/* Event Date Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <strong>Data dell'evento:</strong> {formatEventDate(eventDate)}
        </p>
      </div>

      {/* Session Create/Edit Form */}
      {(isCreatingSession || editingSessionId) && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-brandBlack mb-4">
            {editingSessionId ? 'Modifica Sessione' : 'Nuova Sessione'}
          </h3>

          <form onSubmit={editingSessionId ? handleUpdateSession : handleCreateSession} className="space-y-4">
            <div>
              <label className="block text-sm font-medium !text-gray-900 mb-1">
                Titolo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sessionFormData.title}
                onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                required
                maxLength={100}
                placeholder="es. Sessione Mattutina"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium !text-gray-900 mb-1">
                  Orario Inizio <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={sessionFormData.start_time}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium !text-gray-900 mb-1">
                  Orario Fine
                </label>
                <input
                  type="time"
                  value={sessionFormData.end_time}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium !text-gray-900 mb-1">
                Sala/Luogo
              </label>
              <input
                type="text"
                value={sessionFormData.room}
                onChange={(e) => setSessionFormData({ ...sessionFormData, room: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={100}
                placeholder="es. Sala Conferenze A"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition"
              >
                {editingSessionId ? 'Salva Modifiche' : 'Crea Sessione'}
              </button>
              <button
                type="button"
                onClick={resetSessionForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <p className="text-brandInk/70 text-center py-8">Nessuna sessione programmata. Clicca su "Nuova Sessione" per iniziare.</p>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const sessionSpeeches = speeches.filter((sp) => sp.session_id === session.id);
            const isAddingToThis = addingSpeechToSession === session.id;

            return (
              <div key={session.id} className="border rounded-lg overflow-hidden border-gray-200 dark:border-gray-700">
                {/* Session Header */}
                <div className="bg-primary/10 dark:bg-primary/20 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-brandBlack text-lg">{session.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-brandInk/70">
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
                        onClick={() => startEditSession(session)}
                        className="p-2 text-primary hover:text-primary/90 hover:bg-primary/10 rounded-lg transition flex items-center justify-center"
                        title="Modifica sessione"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center justify-center"
                        title="Elimina sessione"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Add Speech Button */}
                  {!isAddingToThis && !editingSpeechId && (
                    <button
                      onClick={() => startAddSpeechToSession(session.id)}
                      className="mt-4 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Aggiungi Intervento
                    </button>
                  )}
                </div>

                {/* Speech Create Form (inside session) */}
                {isAddingToThis && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 border-t border-green-200 dark:border-green-800">
                    <h4 className="text-md font-bold text-green-900 dark:text-green-100 mb-4">
                      Nuovo Intervento in: {session.title}
                    </h4>

                    <form onSubmit={handleCreateSpeech} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                          Titolo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={speechFormData.title}
                          onChange={(e) => setSpeechFormData({ ...speechFormData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                          required
                          maxLength={150}
                          placeholder="Titolo dell'intervento"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                          Relatore
                        </label>
                        <input
                          type="text"
                          value={speechFormData.speaker_name}
                          onChange={(e) => setSpeechFormData({ ...speechFormData, speaker_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                          maxLength={100}
                          placeholder="Nome del relatore"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                          Durata (minuti)
                        </label>
                        <input
                          type="number"
                          value={speechFormData.duration}
                          onChange={(e) => setSpeechFormData({ ...speechFormData, duration: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                          Crea Intervento
                        </button>
                        <button
                          type="button"
                          onClick={resetSpeechForm}
                          className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
                        >
                          Annulla
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Speeches List */}
                {sessionSpeeches.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sessionSpeeches.map((speech) => {
                      const isEditingThis = editingSpeechId === speech.id;

                      return (
                        <div key={speech.id}>
                          {isEditingThis ? (
                            /* Speech Edit Form */
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4">
                              <h4 className="text-md font-bold text-yellow-900 dark:text-yellow-100 mb-4">
                                Modifica Intervento
                              </h4>

                              <form onSubmit={handleUpdateSpeech} className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                    Titolo <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={speechFormData.title}
                                    onChange={(e) => setSpeechFormData({ ...speechFormData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    required
                                    maxLength={150}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                    Relatore
                                  </label>
                                  <input
                                    type="text"
                                    value={speechFormData.speaker_name}
                                    onChange={(e) => setSpeechFormData({ ...speechFormData, speaker_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    maxLength={100}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                    Durata (minuti)
                                  </label>
                                  <input
                                    type="number"
                                    value={speechFormData.duration}
                                    onChange={(e) => setSpeechFormData({ ...speechFormData, duration: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    min="1"
                                    max="600"
                                  />
                                </div>

                                <div className="flex gap-3">
                                  <button
                                    type="submit"
                                    className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition"
                                  >
                                    Salva Modifiche
                                  </button>
                                  <button
                                    type="button"
                                    onClick={resetSpeechForm}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              </form>
                            </div>
                          ) : (
                            /* Speech Display */
                            <div
                              onClick={() => window.location.href = `/admin/events/${eventId}/speeches/${speech.id}/slides`}
                              className="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-all cursor-pointer"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-brandBlack text-base">{speech.title}</h4>
                                    {speech.slide_count !== undefined && speech.slide_count > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                        📄 {speech.slide_count} slide{speech.slide_count > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {speech.thumbnail_status === 'processing' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full animate-pulse">
                                        🔄 Generating thumbnail...
                                      </span>
                                    )}
                                    {speech.thumbnail_status === 'pending' && speech.slide_count !== undefined && speech.slide_count > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                        ⏳ Thumbnail pending
                                      </span>
                                    )}
                                    {speech.thumbnail_status === 'completed' && speech.first_slide_thumbnail && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                        ✅ Thumbnail ready
                                      </span>
                                    )}
                                    {speech.thumbnail_status === 'failed' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                        ❌ Thumbnail generation failed
                                      </span>
                                    )}
                                    {/* Note: 'none' status (unsupported file types) shows no badge */}
                                  </div>
                                  <div className="flex flex-wrap gap-3 mt-2">
                                    {speech.speaker_name && (
                                      <span className="text-sm text-brandInk/70 flex items-center gap-1">
                                        👤 {speech.speaker_name}
                                      </span>
                                    )}
                                    {speech.duration_minutes && (
                                      <span className="text-sm text-brandInk/70 flex items-center gap-1">
                                        ⏱️ {speech.duration_minutes} min
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => startEditSpeech(speech)}
                                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition flex items-center justify-center"
                                    title="Modifica Intervento"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSpeech(speech.id)}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center justify-center"
                                    title="Elimina Intervento"
                                  >
                                    <Trash className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !isAddingToThis && (
                    <div className="p-4 text-sm text-brandInk/70 italic text-center">
                      Nessun intervento in questa sessione. Clicca su "Aggiungi Intervento" per iniziare.
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
