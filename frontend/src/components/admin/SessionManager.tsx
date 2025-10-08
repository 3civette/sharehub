'use client';

// SessionManager Component
// Feature: 005-ora-bisogna-implementare (Event Details Management)
// Manages event sessions with CRUD operations and smart ordering

import React, { useState, useEffect } from 'react';
import {
  createSession,
  listSessions,
  updateSession,
  deleteSession,
  reorderSessions,
  type Session,
  type CreateSessionInput,
  type UpdateSessionInput,
} from '@/services/sessionService';

interface SessionManagerProps {
  eventId: string;
  token: string;
  onUpdate?: () => void;
}

export default function SessionManager({
  eventId,
  token,
  onUpdate,
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSessionInput>({
    title: '',
    description: null,
    scheduled_time: null,
    display_order: null,
  });

  useEffect(() => {
    loadSessions();
  }, [eventId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listSessions(eventId, token);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await createSession(eventId, formData, token);
      await loadSessions();
      setShowForm(false);
      setFormData({ title: '', description: null, scheduled_time: null, display_order: null });
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    try {
      setLoading(true);
      setError(null);
      const updateData: UpdateSessionInput = {
        title: formData.title,
        description: formData.description,
        scheduled_time: formData.scheduled_time,
        display_order: formData.display_order,
      };
      await updateSession(editingSession.id, updateData, token);
      await loadSessions();
      setEditingSession(null);
      setFormData({ title: '', description: null, scheduled_time: null, display_order: null });
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${sessionTitle}"? This will fail if the session has speeches.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteSession(sessionId, token);
      await loadSessions();
      onUpdate?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      // Show specific error if session has speeches
      if (errorMessage.includes('speeches')) {
        setError('Cannot delete session with speeches. Delete all speeches first.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (session: Session) => {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description,
      scheduled_time: session.scheduled_time,
      display_order: session.display_order,
    });
    setShowForm(false);
  };

  const handleCancelEdit = () => {
    setEditingSession(null);
    setFormData({ title: '', description: null, scheduled_time: null, display_order: null });
  };

  const handleDragStart = (sessionId: string) => {
    setDraggedSessionId(sessionId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetSessionId: string) => {
    e.preventDefault();
    if (!draggedSessionId || draggedSessionId === targetSessionId) return;

    const draggedIndex = sessions.findIndex((s) => s.id === draggedSessionId);
    const targetIndex = sessions.findIndex((s) => s.id === targetSessionId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const newOrder = [...sessions];
    const [draggedSession] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSession);

    // Update display immediately
    setSessions(newOrder);

    // Check if any sessions have scheduled times
    const hasScheduledTimes = newOrder.some((s) => s.scheduled_time);
    if (hasScheduledTimes) {
      const proceed = confirm(
        'Some sessions have scheduled times. Manual reordering will override automatic time-based ordering. Continue?'
      );
      if (!proceed) {
        await loadSessions(); // Restore original order
        setDraggedSessionId(null);
        return;
      }
    }

    // Save to backend
    try {
      setError(null);
      await reorderSessions(
        eventId,
        newOrder.map((s) => s.id),
        token
      );
      await loadSessions();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder sessions');
      await loadSessions(); // Reload on error
    } finally {
      setDraggedSessionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Sessions</h3>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingSession(null);
            setFormData({ title: '', description: null, scheduled_time: null, display_order: null });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Add Session'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreateSession} className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_time || ''}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </form>
      )}

      {/* Edit form */}
      {editingSession && (
        <form onSubmit={handleUpdateSession} className="p-4 bg-blue-50 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900">Edit Session</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_time || ''}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sessions list */}
      <div className="space-y-2">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <div
              key={session.id}
              draggable
              onDragStart={() => handleDragStart(session.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, session.id)}
              className="p-4 bg-white border border-gray-200 rounded-lg cursor-move hover:border-blue-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{session.title}</h4>
                  {session.description && (
                    <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {session.scheduled_time && (
                      <span>
                        Scheduled: {new Date(session.scheduled_time).toLocaleString()}
                      </span>
                    )}
                    {session.display_order !== null && (
                      <span>Order: {session.display_order}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(session)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id, session.title)}
                    disabled={loading}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-500">No sessions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
