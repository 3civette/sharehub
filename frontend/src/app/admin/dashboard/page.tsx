'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import MetricCard from '@/components/dashboard/MetricCard';
import ActivityLog from '@/components/dashboard/ActivityLog';
import QuickActions from '@/components/dashboard/QuickActions';

interface DashboardMetrics {
  active_events_count: number;
  last_activity_at: string | null;
}

interface Activity {
  id: string;
  actor_type: 'admin' | 'organizer' | 'participant' | 'system';
  action_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login?redirect=/admin/dashboard');
          return;
        }

        // Get admin's tenant
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (adminError || !adminData) {
          setError('Impossibile caricare i dati dell\'utente');
          setLoading(false);
          return;
        }

        setTenantId(adminData.tenant_id);

        // Fetch dashboard metrics
        const metricsResponse = await fetch(`http://localhost:3001/dashboard/metrics/${adminData.tenant_id}`);
        if (!metricsResponse.ok) {
          throw new Error('Errore nel caricamento delle metriche');
        }
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);

        // Fetch recent activities
        const activitiesResponse = await fetch(`http://localhost:3001/dashboard/activity/${adminData.tenant_id}?limit=5`);
        if (!activitiesResponse.ok) {
          throw new Error('Errore nel caricamento delle attività');
        }
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.activities || []);

        setLoading(false);
      } catch (err: any) {
        console.error('Dashboard error:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [supabase, router]);

  const formatLastActivity = (timestamp: string | null) => {
    if (!timestamp) return 'Nessuna attività';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Proprio ora';
    if (minutes < 60) return `${minutes} minut${minutes === 1 ? 'o' : 'i'} fa`;
    if (hours < 24) return `${hours} or${hours === 1 ? 'a' : 'e'} fa`;
    return `${days} giorn${days === 1 ? 'o' : 'i'} fa`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Errore</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Torna al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Panoramica del tuo account ShareHub</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            title="Eventi Attivi"
            value={metrics?.active_events_count || 0}
            trend={metrics && metrics.active_events_count > 0 ? 'up' : 'neutral'}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          <MetricCard
            title="Ultima Attività"
            value={formatLastActivity(metrics?.last_activity_at || null)}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Recent Activity */}
        <ActivityLog activities={activities} />
      </main>
    </div>
  );
}
