'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { defaultBrandingColors } from '@/lib/designTokens';

interface Branding {
  id: string;
  tenant_id: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface Tenant {
  id: string;
  subdomain: string;
  hotel_name: string;
  branding: any;
  ad_config: any;
  status: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  branding: Branding | null;
  loading: boolean;
  error: string | null;
  refetchTenant: () => Promise<void>;
  updateBranding: (branding: Branding) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  branding: null,
  loading: true,
  error: null,
  refetchTenant: async () => {},
  updateBranding: () => {},
});

export const useTenant = () => useContext(TenantContext);
export const useTenantBranding = () => {
  const { branding, updateBranding } = useContext(TenantContext);
  return { branding, updateBranding };
};

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyBrandingToDOM = (brandingData: Branding | null) => {
    const root = document.documentElement;

    if (brandingData) {
      // Apply tenant custom branding
      if (brandingData.primary_color) {
        root.style.setProperty('--color-primary', brandingData.primary_color);
      }
      if (brandingData.secondary_color) {
        root.style.setProperty('--color-secondary', brandingData.secondary_color);
      }
    } else {
      // Apply 3Civette default colors when no custom branding exists
      root.style.setProperty('--color-primary', defaultBrandingColors.primary);
      root.style.setProperty('--color-secondary', defaultBrandingColors.secondary);
    }
  };

  const updateBranding = (newBranding: Branding) => {
    setBranding(newBranding);
    applyBrandingToDOM(newBranding);
  };

  const fetchTenant = async () => {
    try {
      setLoading(true);
      setError(null);

      const hostname = window.location.hostname;
      let tenantData;

      if (hostname.includes('localhost')) {
        tenantData = await api.getTenantById('523c2648-f980-4c9e-8e53-93d812cfa79f');
      } else {
        const subdomain = hostname.split('.')[0];
        tenantData = await api.getTenantBySubdomain(subdomain);
      }

      setTenant(tenantData as Tenant);

      // Fetch branding separately
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const brandingResponse = await fetch(`${API_URL}/branding/${tenantData.id}`);
        if (brandingResponse.ok) {
          const brandingData = await brandingResponse.json();
          setBranding(brandingData);
          applyBrandingToDOM(brandingData);
        } else {
          // No custom branding, apply defaults
          applyBrandingToDOM(null);
        }
      } catch (brandingErr) {
        console.error('Failed to fetch branding:', brandingErr);
        // Apply defaults if branding fetch fails
        applyBrandingToDOM(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch tenant:', err);
      setError(err.message || 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, branding, loading, error, refetchTenant: fetchTenant, updateBranding }}>
      {children}
    </TenantContext.Provider>
  );
}
