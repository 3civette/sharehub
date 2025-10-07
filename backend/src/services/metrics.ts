// Dashboard Metrics Service
// Feature: 001-voglio-creare-l

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DashboardMetrics {
  active_events_count: number;
  last_activity_at: string | null;
}

export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
  // Get active events count (events in the future or today)
  const { count: activeEventsCount, error: eventsError } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('event_date', new Date().toISOString().split('T')[0]); // Events today or in the future

  if (eventsError) {
    console.error('Error fetching active events:', eventsError);
    throw new Error('Failed to fetch active events count');
  }

  // Get last activity timestamp
  const { data: lastActivity, error: activityError } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (activityError && activityError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching last activity:', activityError);
    throw new Error('Failed to fetch last activity');
  }

  return {
    active_events_count: activeEventsCount || 0,
    last_activity_at: lastActivity?.created_at || null
  };
}
