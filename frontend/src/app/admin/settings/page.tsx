'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import SettingsForm from '@/components/admin/SettingsForm';
import AdminHeader from '@/components/admin/AdminHeader';

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

export default function AdminSettingsPage() {
  const { tenant, loading: tenantLoading, refetchTenant } = useTenant();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      fetchSettings();
    }
  }, [tenant?.id]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!tenant?.id) {
        throw new Error('Tenant ID not available');
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Fetch settings from API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/settings/${tenant.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      if (!tenant?.id) {
        throw new Error('Tenant ID not available');
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Update settings via API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/settings/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update settings');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);

      // Refetch tenant data to update context
      await refetchTenant();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (tenantLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-brandBlack">Caricamento...</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-brandInk/70">Caricamento impostazioni...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-brandBlack">Errore</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex gap-3">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-brandBlack">Errore</h3>
                <p className="text-sm text-brandInk/70 mt-1">{error}</p>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  Torna alla Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-[#0B0B0C] dark:via-[#111827] dark:to-[#0B0B0C]">
      <AdminHeader
        title="Impostazioni"
        subtitle="Gestisci le impostazioni del tuo account"
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-900 dark:text-green-100">Successo</h3>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  Le impostazioni sono state aggiornate con successo!
                </p>
              </div>
            </div>
          </div>
        )}

        {error && !success && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-900 dark:text-red-100">Errore</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-800">
          <SettingsForm
            initialData={settings}
            onSubmit={handleSubmit}
          />
        </div>
      </main>
    </div>
  );
}
