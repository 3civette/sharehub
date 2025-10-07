'use client';

import { useTenant } from '@/contexts/TenantContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function HomePage() {
  const { tenant, loading } = useTenant();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        setUserEmail(session?.user?.email || null);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        setUserEmail(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (loading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {tenant?.branding?.logo_url && (
              <img src={tenant.branding.logo_url} alt="Logo" className="h-10" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{tenant?.hotel_name || 'ShareHub'}</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && userEmail && (
              <span className="text-sm text-gray-600">
                Loggato come: <span className="font-semibold text-gray-900">{userEmail}</span>
              </span>
            )}
            <Link
              href="/admin/branding"
              className="text-sm text-gray-600 hover:text-primary transition-colors"
            >
              Pannello Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Benvenuto in {tenant?.hotel_name || 'ShareHub'}
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Accedi alle presentazioni degli eventi, scarica le slide e rimani aggiornato sui nostri contenuti.
          </p>

          <div className="flex justify-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.refresh();
                  }}
                  className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
                >
                  Esci
                </button>
              </>
            ) : (
              <Link
                href="/login?redirect=/admin/dashboard"
                className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Accedi
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Funzionalità della Piattaforma
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="📅"
              title="Gestione Eventi"
              description="Crea e gestisci eventi pubblici o privati con controlli di accesso personalizzati."
            />
            <FeatureCard
              icon="📊"
              title="Condivisione Slide"
              description="Carica, organizza e condividi slide di presentazioni con i partecipanti."
            />
            <FeatureCard
              icon="🎨"
              title="Branding Personalizzato"
              description="Personalizza colori, loghi e caratteri per riflettere l'identità del tuo brand."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">
            © 2025 {tenant?.hotel_name || 'ShareHub'}. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h4 className="text-xl font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
