/**
 * Metrics Service
 * Purpose: Track and retrieve event analytics with tier-based access
 * Features: 003-ora-facciamo-il, 005-ora-facciamo-la
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';
import type {
  EventMetrics,
  TrackPageViewInput,
  TrackDownloadInput,
} from '../models/eventMetrics';
import {
  filterMetricsByPlan,
  incrementPageView,
  incrementDownload,
  addGeographicData,
  addDeviceType,
  addTimelineEntry,
} from '../models/eventMetrics';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize cache for metrics (5-minute TTL)
const metricsCache = new NodeCache({ stdTTL: 300 }); // 300 seconds = 5 minutes

export class MetricsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Set tenant context for RLS policies
   */
  private async setTenantContext(tenantId: string): Promise<void> {
    await this.supabase.rpc('set_config', {
      setting: 'app.current_tenant_id',
      value: tenantId,
      is_local: true,
    });
  }

  /**
   * Initialize metrics for a new event
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @returns Created metrics record
   */
  async initializeMetrics(eventId: string, tenantId: string): Promise<EventMetrics> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('event_metrics')
      .insert({
        event_id: eventId,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to initialize metrics: ${error.message}`);
    }

    return data as EventMetrics;
  }

  /**
   * Track page view
   * @param tenantId - Tenant UUID
   * @param input - Page view tracking data
   * @returns Updated metrics
   */
  async trackPageView(tenantId: string, input: TrackPageViewInput): Promise<EventMetrics> {
    await this.setTenantContext(tenantId);

    // Get current metrics
    const { data: current, error: fetchError } = await this.supabase
      .from('event_metrics')
      .select('*')
      .eq('event_id', input.event_id)
      .single();

    if (fetchError || !current) {
      throw new Error('Event metrics not found');
    }

    const metrics = current as EventMetrics;

    // Calculate updates
    const updates = incrementPageView(metrics, input.ip_hash);

    // Apply geographic data if provided
    if (input.metadata?.country_code) {
      Object.assign(updates, addGeographicData(metrics, input.metadata.country_code));
    }

    // Apply device type if provided
    if (input.metadata?.device_type) {
      Object.assign(updates, addDeviceType(metrics, input.metadata.device_type));
    }

    // Add timeline entry
    Object.assign(
      updates,
      addTimelineEntry(metrics, {
        timestamp: new Date().toISOString(),
        actor_type: 'anonymous',
        action: 'view',
      })
    );

    // Update database
    const { data: updated, error: updateError } = await this.supabase
      .from('event_metrics')
      .update(updates)
      .eq('event_id', input.event_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update metrics: ${updateError.message}`);
    }

    return updated as EventMetrics;
  }

  /**
   * Track slide download
   * @param tenantId - Tenant UUID
   * @param input - Download tracking data
   * @returns Updated metrics
   */
  async trackDownload(tenantId: string, input: TrackDownloadInput): Promise<EventMetrics> {
    await this.setTenantContext(tenantId);

    // Get current metrics
    const { data: current, error: fetchError } = await this.supabase
      .from('event_metrics')
      .select('*')
      .eq('event_id', input.event_id)
      .single();

    if (fetchError || !current) {
      throw new Error('Event metrics not found');
    }

    const metrics = current as EventMetrics;

    // Calculate updates
    const updates = incrementDownload(metrics, input.slide_id, input.speech_id);

    // Add timeline entry
    Object.assign(
      updates,
      addTimelineEntry(metrics, {
        timestamp: new Date().toISOString(),
        actor_type: input.actor_type,
        action: 'download',
      })
    );

    // Update database
    const { data: updated, error: updateError } = await this.supabase
      .from('event_metrics')
      .update(updates)
      .eq('event_id', input.event_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update metrics: ${updateError.message}`);
    }

    return updated as EventMetrics;
  }

  /**
   * Get metrics for an event (filtered by tenant plan)
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @param tenantPlan - Tenant subscription plan ('free' or 'premium')
   * @returns Metrics filtered by plan
   */
  async getMetrics(
    eventId: string,
    tenantId: string,
    tenantPlan: 'free' | 'premium'
  ): Promise<any> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('event_metrics')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error || !data) {
      throw new Error('Event metrics not found');
    }

    const metrics = data as EventMetrics;

    // Filter based on plan
    return filterMetricsByPlan(metrics, tenantPlan);
  }

  /**
   * Get raw metrics (admin/premium only)
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @returns Full metrics object
   */
  async getRawMetrics(eventId: string, tenantId: string): Promise<EventMetrics> {
    await this.setTenantContext(tenantId);

    const { data, error } = await this.supabase
      .from('event_metrics')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error || !data) {
      throw new Error('Event metrics not found');
    }

    return data as EventMetrics;
  }

  /**
   * Delete metrics for an event
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @returns Success boolean
   */
  async deleteMetrics(eventId: string, tenantId: string): Promise<boolean> {
    await this.setTenantContext(tenantId);

    const { error } = await this.supabase
      .from('event_metrics')
      .delete()
      .eq('event_id', eventId);

    if (error) {
      throw new Error(`Failed to delete metrics: ${error.message}`);
    }

    return true;
  }

  /**
   * Get cached metrics summary for dashboard
   * Feature: 005-ora-facciamo-la
   * @param eventId - Event UUID
   * @param tenantId - Tenant UUID
   * @returns Simplified metrics with cache timestamp
   */
  async getCachedMetrics(eventId: string, tenantId: string): Promise<{
    pageViews: number;
    slideDownloads: number;
    participantCount: number;
    lastRefreshed: string;
  }> {
    const cacheKey = `metrics:${eventId}`;

    // Check cache first
    const cached = metricsCache.get<{
      pageViews: number;
      slideDownloads: number;
      participantCount: number;
      lastRefreshed: string;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Cache miss - calculate fresh metrics
    await this.setTenantContext(tenantId);

    // Get event metrics
    const { data: metrics, error: metricsError } = await this.supabase
      .from('event_metrics')
      .select('page_views, downloads')
      .eq('event_id', eventId)
      .single();

    // Count participant token usage
    const { count: participantCount } = await this.supabase
      .from('access_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('type', 'participant')
      .not('last_used_at', 'is', null);

    const summary = {
      pageViews: metrics?.page_views || 0,
      slideDownloads: metrics?.downloads || 0,
      participantCount: participantCount || 0,
      lastRefreshed: new Date().toISOString(),
    };

    // Store in cache
    metricsCache.set(cacheKey, summary);

    return summary;
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
