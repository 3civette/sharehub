// Feature 005-ora-facciamo-la: Event Management Dashboard
// Date: 2025-10-08
// Dashboard data aggregation service

import { createClient } from '@supabase/supabase-js';
import { DashboardData } from '../models/dashboard';
import { metricsService } from './metricsService';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get complete dashboard data for an event
 * Aggregates all related resources using parallel queries
 * @param eventId - Event UUID
 * @param tenantId - Tenant UUID (for RLS enforcement)
 * @returns Dashboard data with all related resources
 */
export async function getDashboardData(
  eventId: string,
  tenantId: string
): Promise<DashboardData> {
  // Set tenant context for RLS
  await supabase.rpc('set_config', {
    setting: 'app.current_tenant_id',
    value: tenantId,
    is_local: true,
  });

  // Execute 5 parallel queries for optimal performance
  const [
    eventResult,
    tokensResult,
    sessionsResult,
    photosResult,
    metricsResult,
  ] = await Promise.all([
    // 1. Get event
    supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single(),

    // 2. Get access tokens (filtered by visibility)
    supabase
      .from('access_tokens')
      .select('*')
      .eq('event_id', eventId)
      .order('type', { ascending: true }), // organizer first, then participant

    // 3. Get sessions (ordered by start_time)
    supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true }),

    // 4. Get photos (ordered by uploaded_at desc)
    supabase
      .from('event_photos')
      .select('*')
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false }),

    // 5. Get cached metrics
    metricsService.getCachedMetrics(eventId, tenantId),
  ]);

  // Check for errors
  if (eventResult.error) {
    if (eventResult.error.code === 'PGRST116') {
      throw new Error('Event not found');
    }
    throw new Error(`Failed to fetch event: ${eventResult.error.message}`);
  }

  if (tokensResult.error) {
    throw new Error(`Failed to fetch tokens: ${tokensResult.error.message}`);
  }

  if (sessionsResult.error) {
    throw new Error(`Failed to fetch sessions: ${sessionsResult.error.message}`);
  }

  if (photosResult.error) {
    throw new Error(`Failed to fetch photos: ${photosResult.error.message}`);
  }

  // Get session IDs for this event
  const sessionIds = (sessionsResult.data || []).map(s => s.id);

  // Fetch speeches for these sessions
  let speechesResult: any = { data: [], error: null };
  console.log('[DASHBOARD] Session IDs:', sessionIds);
  if (sessionIds.length > 0) {
    speechesResult = await supabase
      .from('speeches')
      .select(`
        *,
        session:sessions!inner(title)
      `)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    console.log('[DASHBOARD] Speeches result:', { count: speechesResult.data?.length, error: speechesResult.error });
    if (speechesResult.error) {
      throw new Error(`Failed to fetch speeches: ${speechesResult.error.message}`);
    }
  }

  // Filter tokens by event visibility
  let tokens = tokensResult.data || [];
  if (eventResult.data.visibility === 'public') {
    tokens = []; // No tokens for public events
  }

  // Count slides for each speech
  const speechesWithCounts = await Promise.all(
    (speechesResult.data || []).map(async (speech) => {
      const { count } = await supabase
        .from('slides')
        .select('*', { count: 'exact', head: true })
        .eq('speech_id', speech.id);

      return {
        ...speech,
        slide_count: count || 0,
      };
    })
  );

  return {
    event: eventResult.data,
    tokens,
    sessions: sessionsResult.data || [],
    speeches: speechesWithCounts,
    photos: photosResult.data || [],
    metrics: metricsResult,
  };
}
