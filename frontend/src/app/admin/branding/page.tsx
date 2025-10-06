'use client';

import { useTenant } from '@/contexts/TenantContext';

export default function AdminBrandingPage() {
  const { tenant, loading } = useTenant();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Admin Panel - {tenant?.hotel_name}</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Branding Settings</h2>
        <p className="text-gray-600">Configure your tenant branding here.</p>
      </main>
    </div>
  );
}
