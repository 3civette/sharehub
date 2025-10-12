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

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const hostname = window.location.hostname;
      let tenantId = '523c2648-f980-4c9e-8e53-93d812cfa79f'; // Default 3Civette tenant

      // For production, extract subdomain and query by subdomain
      if (!hostname.includes('localhost') && hostname.includes('.')) {
        const subdomain = hostname.split('.')[0];
        const { data: tenantBySubdomain, error: subdomainError } = await supabase
          .from('tenants')
          .select('*')
          .eq('subdomain', subdomain)
          .single();

        if (subdomainError || !tenantBySubdomain) {
          console.warn('Tenant not found by subdomain, using default');
        } else {
          tenantId = tenantBySubdomain.id;
        }
      }

      // Fetch tenant by ID
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenantData) {
        throw new Error('Failed to load tenant');
      }

      setTenant(tenantData as Tenant);

      // Parse branding from tenant data
      const brandingData = tenantData.branding_config || tenantData.branding;
      if (brandingData && typeof brandingData === 'object') {
        const colors = (brandingData as any).colors || {};
        const branding: Branding = {
          id: tenantData.id,
          tenant_id: tenantData.id,
          primary_color: colors.primary || '#D4AF37',
          secondary_color: colors.secondary || '#0B0B0C',
          logo_url: (brandingData as any).logo_url || null,
          created_at: tenantData.created_at,
          updated_at: tenantData.updated_at,
        };
        setBranding(branding);
        applyBrandingToDOM(branding);
      } else {
        // Apply defaults
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
