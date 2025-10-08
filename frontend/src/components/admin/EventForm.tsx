'use client';

// EventForm Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Shared form for create/edit event with validation

import React, { useState, useEffect } from 'react';

interface Event {
  id: string;
  tenant_id: string;
  name: string;
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
  date: string;
  description?: string;
  visibility: 'public' | 'private';
}

interface EventUpdateInput {
  name?: string;
  date?: string;
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
    date: initialData?.date || '',
    description: initialData?.description || '',
    visibility: (initialData?.visibility || 'public') as 'public' | 'private'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
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

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare data for submission
    const submitData: EventCreateInput | EventUpdateInput = {
      name: formData.name,
      date: formData.date,
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
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Event Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isReadOnly}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name && touched.name
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="Enter event name"
          maxLength={255}
        />
        {errors.name && touched.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Event Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Event Date *
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
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.date && touched.date
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {errors.date && touched.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isReadOnly}
          rows={4}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description && touched.description
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="Enter event description (optional)"
          maxLength={2000}
        />
        <div className="flex justify-between mt-1">
          {errors.description && touched.description ? (
            <p className="text-sm text-red-600">{errors.description}</p>
          ) : (
            <p className="text-xs text-gray-500">
              {formData.description.length}/2000 characters
            </p>
          )}
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Visibility *
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
            <span className={`text-sm ${isReadOnly ? 'text-gray-500' : 'text-gray-700'}`}>
              Public
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
            <span className={`text-sm ${isReadOnly ? 'text-gray-500' : 'text-gray-700'}`}>
              Private
            </span>
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {formData.visibility === 'private'
            ? 'Private events require tokens for access'
            : 'Public events are accessible to all attendees'}
        </p>
      </div>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            This event cannot be edited because it has already occurred.
          </p>
        </div>
      )}

      {/* Submit Button */}
      {!isReadOnly && (
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {mode === 'create' ? 'Create Event' : 'Update Event'}
          </button>
        </div>
      )}
    </form>
  );
}
