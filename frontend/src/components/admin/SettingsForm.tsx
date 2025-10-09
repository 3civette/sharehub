'use client';

// SettingsForm Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Settings form with validation and read-only billing info

import React, { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Moon, Sun } from 'lucide-react';

interface BillingInfo {
  plan_name: string;
  renewal_date: string;
  payment_method: string;
}

interface TenantSettings {
  id: string;
  hotel_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  billing_info: BillingInfo | null;
}

interface TenantSettingsUpdateInput {
  hotel_name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
}

interface SettingsFormProps {
  initialData: TenantSettings;
  onSubmit: (data: TenantSettingsUpdateInput) => void;
}

export default function SettingsForm({ initialData, onSubmit }: SettingsFormProps) {
  const { isDark, toggleDarkMode } = useDarkMode();

  const [formData, setFormData] = useState({
    hotel_name: initialData.hotel_name || '',
    contact_email: initialData.contact_email || '',
    contact_phone: initialData.contact_phone || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFormData({
      hotel_name: initialData.hotel_name || '',
      contact_email: initialData.contact_email || '',
      contact_phone: initialData.contact_phone || ''
    });
  }, [initialData]);

  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case 'hotel_name':
        if (!value.trim()) {
          return 'Hotel name is required';
        }
        if (value.trim().length < 2) {
          return 'Hotel name must be at least 2 characters';
        }
        if (value.length > 100) {
          return 'Hotel name must be 100 characters or less';
        }
        return null;

      case 'contact_email':
        if (!value) return null; // Optional field
        // RFC 5322 compliant email regex (simplified)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Invalid email format';
        }
        if (value.length > 255) {
          return 'Email must be 255 characters or less';
        }
        return null;

      case 'contact_phone':
        if (!value) return null; // Optional field
        if (value.length < 5) {
          return 'Phone number must be at least 5 characters';
        }
        if (value.length > 50) {
          return 'Phone number must be 50 characters or less';
        }
        // Allow flexible international format: digits, spaces, hyphens, parentheses, plus
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(value)) {
          return 'Phone number contains invalid characters';
        }
        return null;

      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, formData[name as keyof typeof formData]);
    setErrors((prev) => ({
      ...prev,
      [name]: error || ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        newErrors[key] = error;
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
    const submitData: TenantSettingsUpdateInput = {
      hotel_name: formData.hotel_name,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null
    };

    onSubmit(submitData);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Appearance Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Aspetto</h3>
          <div className="space-y-4">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#F8FAFC] dark:bg-[#111827] rounded-lg border border-[#E5E7EB] dark:border-[#374151]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-[#0B0B0C] rounded-lg border border-[#E5E7EB] dark:border-[#374151]">
                  {isDark ? (
                    <Moon className="w-5 h-5 text-primary" />
                  ) : (
                    <Sun className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-[#111827] dark:text-white">
                    Dark Mode
                  </label>
                  <p className="text-xs text-gray-600 dark:text-[#E5E7EB]">
                    {isDark ? 'Modalità scura attiva' : 'Modalità chiara attiva'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#0B0B0C] ${
                  isDark ? 'bg-primary' : 'bg-[#E5E7EB]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDark ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Settings Section */}
      <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Impostazioni Generali</h3>
          <div className="space-y-4">
            {/* Hotel Name */}
            <div>
              <label htmlFor="hotel_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome Hotel *
              </label>
              <input
                type="text"
                id="hotel_name"
                name="hotel_name"
                value={formData.hotel_name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.hotel_name && touched.hotel_name
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter hotel or venue name"
                maxLength={100}
              />
              {errors.hotel_name && touched.hotel_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hotel_name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.hotel_name.length}/100 characters
              </p>
            </div>

            {/* Contact Email */}
            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email di Contatto
              </label>
              <input
                type="email"
                id="contact_email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.contact_email && touched.contact_email
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="contact@hotel.com"
                maxLength={255}
              />
              {errors.contact_email && touched.contact_email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contact_email}</p>
              )}
            </div>

            {/* Contact Phone */}
            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefono di Contatto
              </label>
              <input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.contact_phone && touched.contact_phone
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="+1 (555) 123-4567"
                maxLength={50}
              />
              {errors.contact_phone && touched.contact_phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contact_phone}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                International format supported
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Info Section (Read-Only) */}
      {initialData.billing_info && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informazioni di Fatturazione</h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Piano Corrente</span>
              <span className="text-sm text-gray-900 dark:text-white font-semibold">
                {initialData.billing_info.plan_name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Data di Rinnovo</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {formatDate(initialData.billing_info.renewal_date)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Metodo di Pagamento</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {initialData.billing_info.payment_method}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Le informazioni di fatturazione sono gestite tramite il tuo abbonamento. Contatta il supporto per apportare modifiche.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
        >
          Salva Impostazioni
        </button>
      </div>
    </form>
  );
}
