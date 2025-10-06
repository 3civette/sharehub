'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

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
  loading: boolean;
  error: string | null;
  refetchTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
  refetchTenant: async () => {},
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      if (tenantData.branding) {
        const root = document.documentElement;
        if (tenantData.branding.primary_color) {
          root.style.setProperty('--color-primary', tenantData.branding.primary_color);
        }
        if (tenantData.branding.secondary_color) {
          root.style.setProperty('--color-secondary', tenantData.branding.secondary_color);
        }
        if (tenantData.branding.font_family) {
          root.style.setProperty('--font-family', tenantData.branding.font_family);
        }
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
    <TenantContext.Provider value={{ tenant, loading, error, refetchTenant: fetchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}
