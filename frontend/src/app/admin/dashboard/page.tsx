'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import UpcomingEvents from '@/components/dashboard/UpcomingEvents';
import QuickActions from '@/components/dashboard/QuickActions';
import ActivityLog from '@/components/dashboard/ActivityLog';

interface DashboardMetrics {
  active_events_count: number;
  last_activity_at: string | null;
}

interface Event {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'upcoming' | 'ongoing' | 'past';
  visibility: 'public' | 'private';
  slug: string;
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
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
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

        // Fetch upcoming events (status: upcoming, sorted by date)
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, name, date, status, visibility, slug')
          .eq('tenant_id', adminData.tenant_id)
          .in('status', ['upcoming', 'ongoing'])
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(5);

        if (eventsError) {
          console.error('Error loading upcoming events:', eventsError);
        } else {
          setUpcomingEvents(eventsData || []);
        }

        // Fetch recent activities
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('tenant_id', adminData.tenant_id)
          .order('timestamp', { ascending: false })
          .limit(10);

        if (activitiesError) {
          console.error('Error loading activities:', activitiesError);
        } else {
          setActivities(activitiesData || []);
        }

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-brandInk/70 dark:text-[#E5E7EB]">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-[#111827] rounded-lg shadow-card p-8 max-w-md border border-transparent dark:border-[#374151]">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-brandBlack dark:text-white text-center mb-2">Errore</h2>
          <p className="text-brandInk/70 dark:text-[#E5E7EB] text-center mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all shadow-button"
          >
            Torna al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#0B0B0C]/95 backdrop-blur-sm shadow-sm border-b border-brandSilver/30 dark:border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-brandBlack dark:text-white">Dashboard</h1>
              <p className="text-sm text-brandInk/70 dark:text-[#E5E7EB] mt-1">Panoramica del tuo account Meeting Hub</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-brandInk dark:text-[#E5E7EB] bg-white dark:bg-[#111827] border border-brandSilver dark:border-[#374151] rounded-lg hover:bg-bgSoft dark:hover:bg-[#1F2937] active:scale-95 transition-all"
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
            icon={<Calendar className="w-6 h-6" />}
          />

          <MetricCard
            title="Ultima Attività"
            value={formatLastActivity(metrics?.last_activity_at || null)}
            icon={<Clock className="w-6 h-6" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Upcoming Events */}
        <div className="mb-8">
          <UpcomingEvents />
        </div>

        {/* Recent Activity */}
        <ActivityLog activities={activities} />
      </main>
    </>
  );
}
