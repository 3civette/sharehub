'use client';

// EventForm Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Shared form for create/edit event with validation

import React, { useState, useEffect } from 'react';

interface Event {
  id: string;
  tenant_id: string;
  name: string;
  title: string;
  organizer?: string;
  date: string; // ISO date
  slug: string;
  description: string | null;
  visibility: 'public' | 'private';
  status: 'draft' | 'upcoming' | 'ongoing' | 'past';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface EventCreateInput {
  name: string;
  title: string;
  organizer?: string;
  date: string;
  end_date?: string;
  description?: string;
  visibility: 'public' | 'private';
}

interface EventUpdateInput {
  name?: string;
  title?: string;
  organizer?: string;
  date?: string;
  end_date?: string;
  description?: string;
  visibility?: 'public' | 'private';
}

interface EventFormProps {
  initialData?: Event;
  onSubmit: (data: EventCreateInput | EventUpdateInput) => void;
  mode: 'create' | 'edit';
  isReadOnly?: boolean;
}

export default function EventForm({
  initialData,
  onSubmit,
  mode,
  isReadOnly = false
}: EventFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    title: initialData?.title || '',
    organizer: initialData?.organizer || '',
    date: initialData?.date || '',
    description: initialData?.description || '',
    visibility: (initialData?.visibility || 'public') as 'public' | 'private'
  });

  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        title: initialData.title,
        organizer: initialData.organizer || '',
        date: initialData.date,
        description: initialData.description || '',
        visibility: initialData.visibility
      });
    }
  }, [initialData]);

  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case 'name':
        if (!value.trim()) {
          return 'Event name is required';
        }
        if (value.length > 255) {
          return 'Event name must be 255 characters or less';
        }
        return null;

      case 'title':
        if (!value.trim()) {
          return 'Titolo è richiesto';
        }
        if (value.length > 300) {
          return 'Il titolo deve essere massimo 300 caratteri';
        }
        return null;

      case 'organizer':
        if (value && value.length > 200) {
          return 'L\'organizzatore deve essere massimo 200 caratteri';
        }
        return null;

      case 'date':
        if (!value) {
          return 'Event date is required';
        }
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          return 'Event date must be today or in the future';
        }
        return null;

      case 'endDate':
        if (isMultiDay && !value) {
          return 'La data di fine è richiesta per eventi multi-giorno';
        }
        if (isMultiDay && value && formData.date) {
          const start = new Date(formData.date);
          const end = new Date(value);
          if (end < start) {
            return 'La data di fine deve essere successiva alla data di inizio';
          }
        }
        return null;

      case 'description':
        if (value && value.length > 2000) {
          return 'Description must be 2000 characters or less';
        }
        return null;

      default:
        return null;
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validate on change if field was touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error || ''
      }));
    }
  };

  const handleVisibilityChange = (visibility: 'public' | 'private') => {
    setFormData((prev) => ({ ...prev, visibility }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, formData[name as keyof typeof formData] as string);
    setErrors((prev) => ({
      ...prev,
      [name]: error || ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) return;

    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach((key) => {
      if (key !== 'visibility') {
        const error = validateField(key, formData[key as keyof typeof formData] as string);
        if (error) {
          newErrors[key] = error;
        }
      }
    });

    // Validate endDate if multi-day
    if (isMultiDay) {
      const endDateError = validateField('endDate', endDate);
      if (endDateError) {
        newErrors.endDate = endDateError;
      }
    }

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    if (isMultiDay) {
      allTouched.endDate = true;
    }
    setTouched(allTouched);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare data for submission
    const submitData: EventCreateInput | EventUpdateInput = {
      name: formData.name,
      title: formData.title,
      organizer: formData.organizer || undefined,
      date: formData.date,
      end_date: isMultiDay ? endDate : undefined,
      description: formData.description || undefined,
      visibility: formData.visibility
    };

    onSubmit(submitData);
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Event Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium !text-gray-900">
          Event Name (slug) *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isReadOnly}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name && touched.name
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="Inserisci lo slug dell'evento"
          maxLength={255}
        />
        {errors.name && touched.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
        <p className="mt-1 text-xs text-brandInk/70 dark:text-gray-400">
          Usato per l'URL (es: /events/meeting-2025)
        </p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium !text-gray-900">
          Titolo *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isReadOnly}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.title && touched.title
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="Inserisci il titolo dell'evento"
          maxLength={300}
        />
        {errors.title && touched.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Organizer */}
      <div>
        <label htmlFor="organizer" className="block text-sm font-medium !text-gray-900">
          Organizzatore
        </label>
        <input
          type="text"
          id="organizer"
          name="organizer"
          value={formData.organizer}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isReadOnly}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.organizer && touched.organizer
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="Nome dell'organizzatore (opzionale)"
          maxLength={200}
        />
        {errors.organizer && touched.organizer && (
          <p className="mt-1 text-sm text-red-600">{errors.organizer}</p>
        )}
      </div>

      {/* Event Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium !text-gray-900">
          Data Inizio *
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isReadOnly}
          min={getTodayDate()}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm !text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.date && touched.date
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {errors.date && touched.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      {/* Multi-day checkbox */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isMultiDay}
            onChange={(e) => setIsMultiDay(e.target.checked)}
            disabled={isReadOnly}
            className="mr-2 h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded"
          />
          <span className="text-sm !text-gray-900">
            Evento su più giorni
          </span>
        </label>
      </div>

      {/* End Date (only if multi-day) */}
      {isMultiDay && (
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium !text-gray-900">
            Data Fine *
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (touched.endDate) {
                const error = validateField('endDate', e.target.value);
                setErrors((prev) => ({ ...prev, endDate: error || '' }));
              }
            }}
            onBlur={(e) => {
              setTouched((prev) => ({ ...prev, endDate: true }));
              const error = validateField('endDate', e.target.value);
              setErrors((prev) => ({ ...prev, endDate: error || '' }));
            }}
            disabled={isReadOnly}
            min={formData.date || getTodayDate()}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm !text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.endDate && touched.endDate
                ? 'border-red-500'
                : 'border-gray-300'
            } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          {errors.endDate && touched.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium !text-gray-900">
          Descrizione
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isReadOnly}
          rows={4}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm !text-gray-900 placeholder:!text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description && touched.description
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="Inserisci la descrizione dell'evento (opzionale)"
          maxLength={2000}
        />
        <div className="flex justify-between mt-1">
          {errors.description && touched.description ? (
            <p className="text-sm text-red-600">{errors.description}</p>
          ) : (
            <p className="text-xs text-brandInk/70 dark:text-gray-400">
              {formData.description.length}/2000 caratteri
            </p>
          )}
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium !text-gray-900 mb-2">
          Visibilità *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={formData.visibility === 'public'}
              onChange={() => handleVisibilityChange('public')}
              disabled={isReadOnly}
              className="mr-2 focus:ring-2 focus:ring-blue-500"
            />
            <span className={`text-sm ${isReadOnly ? 'text-gray-500' : '!text-gray-900'}`}>
              Pubblico
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={formData.visibility === 'private'}
              onChange={() => handleVisibilityChange('private')}
              disabled={isReadOnly}
              className="mr-2 focus:ring-2 focus:ring-blue-500"
            />
            <span className={`text-sm ${isReadOnly ? 'text-gray-500' : '!text-gray-900'}`}>
              Privato
            </span>
          </label>
        </div>
        <p className="mt-1 text-xs text-brandInk/70 dark:text-gray-400">
          {formData.visibility === 'private'
            ? 'Gli eventi privati richiedono token per l\'accesso'
            : 'Gli eventi pubblici sono accessibili a tutti i partecipanti'}
        </p>
      </div>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Questo evento non può essere modificato perché è già avvenuto.
          </p>
        </div>
      )}

      {/* Submit Button */}
      {!isReadOnly && (
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors shadow-button"
          >
            {mode === 'create' ? 'Crea Evento' : 'Aggiorna Evento'}
          </button>
        </div>
      )}
    </form>
  );
}
