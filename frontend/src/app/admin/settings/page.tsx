'use client';

import { useState, useEffect } from 'react';
import { useTenant, useTenantBranding } from '@/contexts/TenantContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import SettingsForm from '@/components/admin/SettingsForm';
import AdminHeader from '@/components/admin/AdminHeader';
import ColorPicker from '@/components/admin/ColorPicker';
import LogoUpload from '@/components/admin/LogoUpload';
import BrandingPreview from '@/components/admin/BrandingPreview';

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
  const { branding: contextBranding, updateBranding: updateContextBranding } = useTenantBranding();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Branding states
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('#111827');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      fetchSettings();
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (contextBranding) {
      setPrimaryColor(contextBranding.primary_color);
      setSecondaryColor(contextBranding.secondary_color);
      setTextColor((contextBranding as any).text_color || '#FFFFFF');
      setBackgroundColor((contextBranding as any).background_color || '#111827');
      setLogoUrl(contextBranding.logo_url || null);
    }
  }, [contextBranding]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!tenant?.id) {
        throw new Error('Tenant ID not available');
      }

      // Fetch settings from Supabase
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('id, hotel_name, contact_email, contact_phone, billing_info')
        .eq('id', tenant.id)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch settings');
      }

      setSettings(data as TenantSettings);
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

      // Update settings in Supabase
      const { data: updatedData, error: updateError } = await supabase
        .from('tenants')
        .update({
          hotel_name: data.hotel_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          billing_info: data.billing_info
        })
        .eq('id', tenant.id)
        .select('id, hotel_name, contact_email, contact_phone, billing_info')
        .single();

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update settings');
      }

      setSettings(updatedData as TenantSettings);

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

  const handleLogoUpload = (file: File) => {
    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoUrl(null);
  };

  const handleSaveBranding = async () => {
    try {
      setBrandingLoading(true);
      setBrandingError(null);
      setBrandingSuccess(false);

      if (!tenant?.id) {
        throw new Error('Tenant ID not available');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Update colors
      const colorsResponse = await fetch(`${API_URL}/branding/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          text_color: textColor,
          background_color: backgroundColor,
        }),
      });

      if (!colorsResponse.ok) {
        throw new Error('Failed to update colors');
      }

      const updatedBranding = await colorsResponse.json();

      // Upload logo if changed
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);

        const logoResponse = await fetch(`${API_URL}/branding/${tenant.id}/logo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!logoResponse.ok) {
          throw new Error('Failed to upload logo');
        }

        const logoData = await logoResponse.json();
        updatedBranding.logo_url = logoData.logo_url;
      }

      updateContextBranding(updatedBranding);

      setBrandingSuccess(true);
      setTimeout(() => setBrandingSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving branding:', err);
      setBrandingError(err.message || 'Failed to save branding');
    } finally {
      setBrandingLoading(false);
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

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-800 mb-6">
          <SettingsForm
            initialData={settings}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Branding Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-brandBlack dark:text-white mb-6">Branding</h2>

          {brandingSuccess && (
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
                    Il branding è stato aggiornato con successo!
                  </p>
                </div>
              </div>
            </div>
          )}

          {brandingError && (
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
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">{brandingError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Logo Upload */}
            <LogoUpload
              currentLogo={logoUrl}
              onUpload={handleLogoUpload}
              onRemove={handleLogoRemove}
            />

            {/* Colors Grid - 2x2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorPicker
                value={primaryColor}
                onChange={setPrimaryColor}
                label="Primario"
              />
              <ColorPicker
                value={secondaryColor}
                onChange={setSecondaryColor}
                label="Secondario"
              />
              <ColorPicker
                value={textColor}
                onChange={setTextColor}
                label="Testo"
              />
              <ColorPicker
                value={backgroundColor}
                onChange={setBackgroundColor}
                label="Sfondo"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveBranding}
              disabled={brandingLoading}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-button"
            >
              {brandingLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvataggio...
                </span>
              ) : (
                'Salva Branding'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
