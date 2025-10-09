'use client';

import { useState, useEffect } from 'react';
import { useTenant, useTenantBranding } from '@/contexts/TenantContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import ColorPicker from '@/components/admin/ColorPicker';
import LogoUpload from '@/components/admin/LogoUpload';
import BrandingPreview from '@/components/admin/BrandingPreview';
import AdminHeader from '@/components/admin/AdminHeader';

interface Branding {
  id: string;
  tenant_id: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminBrandingPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { branding: contextBranding, updateBranding: updateContextBranding } = useTenantBranding();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (contextBranding) {
      setPrimaryColor(contextBranding.primary_color);
      setSecondaryColor(contextBranding.secondary_color);
      setLogoUrl(contextBranding.logo_url || null);
    }
  }, [contextBranding]);

  const handleLogoUpload = (file: File) => {
    setLogoFile(file);
    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoUrl(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
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

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // 1. Update colors
      const colorsResponse = await fetch(`${API_URL}/branding/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        }),
      });

      if (!colorsResponse.ok) {
        throw new Error('Failed to update colors');
      }

      const updatedBranding = await colorsResponse.json();

      // 2. Upload logo if changed
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

      // Update context with new branding
      updateContextBranding(updatedBranding);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving branding:', err);
      setError(err.message || 'Failed to save branding');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Sei sicuro di voler ripristinare il branding ai valori predefiniti?')) {
      return;
    }

    try {
      setLoading(true);
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

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/branding/${tenant.id}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset branding');
      }

      const resetBranding = await response.json();

      // Update state
      setPrimaryColor(resetBranding.primary_color);
      setSecondaryColor(resetBranding.secondary_color);
      setLogoUrl(resetBranding.logo_url || null);
      setLogoFile(null);

      // Update context
      updateContextBranding(resetBranding);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error resetting branding:', err);
      setError(err.message || 'Failed to reset branding');
    } finally {
      setLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-brandInk/70">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5">
      <AdminHeader
        title="Personalizzazione Branding"
        subtitle={`Personalizza colori e logo per ${tenant?.hotel_name}`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-green-600 flex-shrink-0"
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
                <h3 className="text-sm font-medium text-green-900">Successo</h3>
                <p className="text-sm text-green-800 mt-1">
                  Le modifiche al branding sono state salvate con successo!
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0"
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
                <h3 className="text-sm font-medium text-red-900">Errore</h3>
                <p className="text-sm text-red-800 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Configurazione</h2>

              <div className="space-y-6">
                {/* Logo Upload */}
                <LogoUpload
                  currentLogo={logoUrl}
                  onUpload={handleLogoUpload}
                  onRemove={handleLogoRemove}
                />

                {/* Primary Color */}
                <ColorPicker
                  value={primaryColor}
                  onChange={setPrimaryColor}
                  label="Colore Primario"
                />

                {/* Secondary Color */}
                <ColorPicker
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                  label="Colore Secondario"
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Salvataggio...
                    </span>
                  ) : (
                    'Salva Modifiche'
                  )}
                </button>

                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Anteprima</h2>
            <BrandingPreview
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              logoUrl={logoUrl}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
