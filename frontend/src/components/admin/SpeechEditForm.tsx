'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Speech {
  id: string;
  session_id: string;
  title: string;
  speaker_name: string;
  description: string | null;
  duration_minutes: number | null;
}

interface SpeechEditFormProps {
  speechId: string;
  onCancel: () => void;
  onUpdate: (updatedSpeech: Speech) => void;
}

function SpeechEditForm({ speechId, onCancel, onUpdate }: SpeechEditFormProps) {
  const supabase = createClientComponentClient();

  const [formData, setFormData] = useState({
    title: '',
    speaker_name: '',
    duration: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch speech data on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchSpeech() {
      const { data: speech } = await supabase
        .from('speeches')
        .select('*')
        .eq('id', speechId)
        .single();

      if (speech && isMounted) {
        setFormData({
          title: speech.title,
          speaker_name: speech.speaker_name || '',
          duration: speech.duration_minutes?.toString() || '',
        });
        setIsLoading(false);
      }
    }

    fetchSpeech();

    return () => {
      isMounted = false;
    };
  }, [speechId, supabase]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: updatedSpeech, error } = await supabase
        .from('speeches')
        .update({
          title: formData.title,
          speaker_name: formData.speaker_name || null,
          duration_minutes: formData.duration ? parseInt(formData.duration) : null,
        })
        .eq('id', speechId)
        .select()
        .single();

      if (error) throw error;

      onUpdate(updatedSpeech);
    } catch (error) {
      console.error('Update speech error:', error);
      alert('Errore nell\'aggiornamento dell\'intervento');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 mb-6 border border-yellow-200 dark:border-yellow-800">
        <p className="text-yellow-900 dark:text-yellow-100">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 mb-6 border border-yellow-200 dark:border-yellow-800">
      <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-4">
        Modifica Intervento
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
            Titolo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
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
            name="speaker_name"
            value={formData.speaker_name}
            onChange={handleChange}
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
            name="duration"
            value={formData.duration}
            onChange={handleChange}
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
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}

export default SpeechEditForm;
