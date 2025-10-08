'use client';

// SpeechManager Component
// Feature: 005-ora-bisogna-implementare (Event Details Management)
// Manages speeches within a session with CRUD operations and smart ordering

import React, { useState, useEffect } from 'react';
import {
  createSpeech,
  listSpeeches,
  updateSpeech,
  deleteSpeech,
  reorderSpeeches,
  type Speech,
  type CreateSpeechInput,
  type UpdateSpeechInput,
} from '@/services/speechService';

interface SpeechManagerProps {
  sessionId: string;
  sessionTitle: string;
  token: string;
  onUpdate?: () => void;
}

export default function SpeechManager({
  sessionId,
  sessionTitle,
  token,
  onUpdate,
}: SpeechManagerProps) {
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSpeech, setEditingSpeech] = useState<Speech | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draggedSpeechId, setDraggedSpeechId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSpeechInput>({
    title: '',
    speaker_name: '',
    speaker_bio: null,
    description: null,
    duration_minutes: null,
    scheduled_time: null,
    display_order: null,
  });

  useEffect(() => {
    loadSpeeches();
  }, [sessionId]);

  const loadSpeeches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listSpeeches(sessionId, token);
      setSpeeches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load speeches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpeech = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await createSpeech(sessionId, formData, token);
      await loadSpeeches();
      setShowForm(false);
      setFormData({
        title: '',
        speaker_name: '',
        speaker_bio: null,
        description: null,
        duration_minutes: null,
        scheduled_time: null,
        display_order: null,
      });
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create speech');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSpeech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpeech) return;

    try {
      setLoading(true);
      setError(null);
      const updateData: UpdateSpeechInput = {
        title: formData.title,
        speaker_name: formData.speaker_name,
        speaker_bio: formData.speaker_bio,
        description: formData.description,
        duration_minutes: formData.duration_minutes,
        scheduled_time: formData.scheduled_time,
        display_order: formData.display_order,
      };
      await updateSpeech(editingSpeech.id, updateData, token);
      await loadSpeeches();
      setEditingSpeech(null);
      setFormData({
        title: '',
        speaker_name: '',
        speaker_bio: null,
        description: null,
        duration_minutes: null,
        scheduled_time: null,
        display_order: null,
      });
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update speech');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpeech = async (speechId: string, speechTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${speechTitle}"? This will also delete all associated slides.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await deleteSpeech(speechId, token);

      // Show confirmation with slide count
      if (result.slides_deleted > 0) {
        alert(`Deleted "${speechTitle}" and ${result.slides_deleted} slide(s)`);
      }

      await loadSpeeches();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete speech');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (speech: Speech) => {
    setEditingSpeech(speech);
    setFormData({
      title: speech.title,
      speaker_name: speech.speaker_name,
      speaker_bio: speech.speaker_bio,
      description: speech.description,
      duration_minutes: speech.duration_minutes,
      scheduled_time: speech.scheduled_time,
      display_order: speech.display_order,
    });
    setShowForm(false);
  };

  const handleCancelEdit = () => {
    setEditingSpeech(null);
    setFormData({
      title: '',
      speaker_name: '',
      speaker_bio: null,
      description: null,
      duration_minutes: null,
      scheduled_time: null,
      display_order: null,
    });
  };

  const handleDragStart = (speechId: string) => {
    setDraggedSpeechId(speechId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetSpeechId: string) => {
    e.preventDefault();
    if (!draggedSpeechId || draggedSpeechId === targetSpeechId) return;

    const draggedIndex = speeches.findIndex((s) => s.id === draggedSpeechId);
    const targetIndex = speeches.findIndex((s) => s.id === targetSpeechId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const newOrder = [...speeches];
    const [draggedSpeech] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSpeech);

    // Update display immediately
    setSpeeches(newOrder);

    // Save to backend
    try {
      setError(null);
      await reorderSpeeches(
        sessionId,
        newOrder.map((s) => s.id),
        token
      );
      await loadSpeeches();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder speeches');
      await loadSpeeches(); // Reload on error
    } finally {
      setDraggedSpeechId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Speeches</h3>
          <p className="text-sm text-gray-500">Session: {sessionTitle}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingSpeech(null);
            setFormData({
              title: '',
              speaker_name: '',
              speaker_bio: null,
              description: null,
              duration_minutes: null,
              scheduled_time: null,
              display_order: null,
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Add Speech'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreateSpeech} className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                Speaker Name *
              </label>
              <input
                type="text"
                required
                value={formData.speaker_name}
                onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speaker Bio
            </label>
            <textarea
              value={formData.speaker_bio || ''}
              onChange={(e) => setFormData({ ...formData, speaker_bio: e.target.value || null })}
              rows={2}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration_minutes || ''}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
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
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Speech'}
          </button>
        </form>
      )}

      {/* Edit form */}
      {editingSpeech && (
        <form onSubmit={handleUpdateSpeech} className="p-4 bg-blue-50 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900">Edit Speech</h4>
          <div className="grid grid-cols-2 gap-4">
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
                Speaker Name *
              </label>
              <input
                type="text"
                required
                value={formData.speaker_name}
                onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speaker Bio
            </label>
            <textarea
              value={formData.speaker_bio || ''}
              onChange={(e) => setFormData({ ...formData, speaker_bio: e.target.value || null })}
              rows={2}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration_minutes || ''}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
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

      {/* Speeches list */}
      <div className="space-y-2">
        {speeches.length > 0 ? (
          speeches.map((speech) => (
            <div
              key={speech.id}
              draggable
              onDragStart={() => handleDragStart(speech.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, speech.id)}
              className="p-4 bg-white border border-gray-200 rounded-lg cursor-move hover:border-blue-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{speech.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">Speaker: {speech.speaker_name}</p>
                  {speech.description && (
                    <p className="text-sm text-gray-600 mt-1">{speech.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {speech.duration_minutes && (
                      <span>Duration: {speech.duration_minutes} min</span>
                    )}
                    {speech.scheduled_time && (
                      <span>
                        Scheduled: {new Date(speech.scheduled_time).toLocaleString()}
                      </span>
                    )}
                    {speech.display_order !== null && (
                      <span>Order: {speech.display_order}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(speech)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSpeech(speech.id, speech.title)}
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
            <p className="text-gray-500">No speeches yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
