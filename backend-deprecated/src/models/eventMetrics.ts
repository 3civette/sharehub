/**
 * EventMetrics Model
 * Purpose: Type definitions and validation for event_metrics table
 * Feature: 003-ora-facciamo-il
 */

import { z } from 'zod';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Basic metrics (available to all users - free tier)
 */
export interface BasicMetrics {
  page_views: number;
  total_slide_downloads: number;
}

/**
 * Premium metrics (JSONB fields - premium tier only)
 */
export interface PremiumMetrics {
  // { ip_hash: last_seen_iso }
  unique_visitors: Record<string, string>;

  // { slide_id: count }
  per_slide_downloads: Record<string, number>;

  // { speech_id: count }
  per_speech_downloads: Record<string, number>;

  // { country_code: count }
  geographic_data: Record<string, number>;

  // { device_type: count } (mobile, tablet, desktop)
  device_types: Record<string, number>;

  // Array of access events: [{ timestamp: iso, actor_type: string, action: string }]
  access_timeline: Array<{
    timestamp: string;
    actor_type: string;
    action: string;
  }>;
}

/**
 * Complete event metrics
 */
export interface EventMetrics extends BasicMetrics {
  // Identity
  id: string;
  event_id: string;
  tenant_id: string;

  // Premium metrics (JSONB)
  unique_visitors: PremiumMetrics['unique_visitors'];
  per_slide_downloads: PremiumMetrics['per_slide_downloads'];
  per_speech_downloads: PremiumMetrics['per_speech_downloads'];
  geographic_data: PremiumMetrics['geographic_data'];
  device_types: PremiumMetrics['device_types'];
  access_timeline: PremiumMetrics['access_timeline'];

  // Audit
  updated_at: string; // ISO timestamp
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for creating initial metrics row
 */
export const createEventMetricsSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  tenant_id: z.string().uuid('Invalid tenant ID'),
});

export type CreateEventMetricsInput = z.infer<typeof createEventMetricsSchema>;

/**
 * Schema for tracking page view
 */
export const trackPageViewSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  ip_hash: z.string().optional(), // Hashed IP for privacy
  metadata: z
    .object({
      user_agent: z.string().optional(),
      country_code: z.string().optional(),
      device_type: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    })
    .optional(),
});

export type TrackPageViewInput = z.infer<typeof trackPageViewSchema>;

/**
 * Schema for tracking download
 */
export const trackDownloadSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  slide_id: z.string().uuid('Invalid slide ID'),
  speech_id: z.string().uuid('Invalid speech ID'),
  actor_type: z.enum(['organizer', 'participant', 'anonymous', 'admin']),
  metadata: z
    .object({
      ip_hash: z.string().optional(),
      user_agent: z.string().optional(),
    })
    .optional(),
});

export type TrackDownloadInput = z.infer<typeof trackDownloadSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Initialize empty metrics object
 */
export function initializeMetrics(): Omit<
  EventMetrics,
  'id' | 'event_id' | 'tenant_id' | 'updated_at'
> {
  return {
    page_views: 0,
    total_slide_downloads: 0,
    unique_visitors: {},
    per_slide_downloads: {},
    per_speech_downloads: {},
    geographic_data: {},
    device_types: {},
    access_timeline: [],
  };
}

/**
 * Filter metrics based on subscription plan
 * Free plan: only basic metrics
 * Premium plan: all metrics
 */
export function filterMetricsByPlan(
  metrics: EventMetrics,
  plan: 'free' | 'premium'
): BasicMetrics | EventMetrics {
  if (plan === 'free') {
    return {
      page_views: metrics.page_views,
      total_slide_downloads: metrics.total_slide_downloads,
    };
  }

  return metrics; // Premium gets all fields
}

/**
 * Increment page view count
 */
export function incrementPageView(
  metrics: EventMetrics,
  ipHash?: string
): Partial<EventMetrics> {
  const updates: Partial<EventMetrics> = {
    page_views: metrics.page_views + 1,
  };

  // Track unique visitor (premium feature)
  if (ipHash) {
    updates.unique_visitors = {
      ...metrics.unique_visitors,
      [ipHash]: new Date().toISOString(),
    };
  }

  return updates;
}

/**
 * Increment download count for slide and speech
 */
export function incrementDownload(
  metrics: EventMetrics,
  slideId: string,
  speechId: string
): Partial<EventMetrics> {
  return {
    total_slide_downloads: metrics.total_slide_downloads + 1,
    per_slide_downloads: {
      ...metrics.per_slide_downloads,
      [slideId]: (metrics.per_slide_downloads[slideId] || 0) + 1,
    },
    per_speech_downloads: {
      ...metrics.per_speech_downloads,
      [speechId]: (metrics.per_speech_downloads[speechId] || 0) + 1,
    },
  };
}

/**
 * Add geographic data point
 */
export function addGeographicData(
  metrics: EventMetrics,
  countryCode: string
): Partial<EventMetrics> {
  return {
    geographic_data: {
      ...metrics.geographic_data,
      [countryCode]: (metrics.geographic_data[countryCode] || 0) + 1,
    },
  };
}

/**
 * Add device type data point
 */
export function addDeviceType(
  metrics: EventMetrics,
  deviceType: 'mobile' | 'tablet' | 'desktop'
): Partial<EventMetrics> {
  return {
    device_types: {
      ...metrics.device_types,
      [deviceType]: (metrics.device_types[deviceType] || 0) + 1,
    },
  };
}

/**
 * Add access timeline entry (premium feature)
 * Keep only last 100 entries to avoid unbounded growth
 */
export function addTimelineEntry(
  metrics: EventMetrics,
  entry: {
    timestamp: string;
    actor_type: string;
    action: string;
  }
): Partial<EventMetrics> {
  const timeline = [...metrics.access_timeline, entry];

  // Keep only last 100 entries
  if (timeline.length > 100) {
    timeline.shift();
  }

  return {
    access_timeline: timeline,
  };
}

/**
 * Get unique visitor count (premium feature)
 */
export function getUniqueVisitorCount(metrics: EventMetrics): number {
  return Object.keys(metrics.unique_visitors).length;
}

/**
 * Get most downloaded slide (premium feature)
 */
export function getMostDownloadedSlide(metrics: EventMetrics): {
  slideId: string;
  count: number;
} | null {
  const entries = Object.entries(metrics.per_slide_downloads);
  if (entries.length === 0) return null;

  const [slideId, count] = entries.reduce((max, entry) =>
    entry[1] > max[1] ? entry : max
  );

  return { slideId, count };
}

/**
 * Get download count for specific slide
 */
export function getSlideDownloadCount(
  metrics: EventMetrics,
  slideId: string
): number {
  return metrics.per_slide_downloads[slideId] || 0;
}

/**
 * Get download count for specific speech (all slides combined)
 */
export function getSpeechDownloadCount(
  metrics: EventMetrics,
  speechId: string
): number {
  return metrics.per_speech_downloads[speechId] || 0;
}

/**
 * Get top countries by visitor count (premium feature)
 */
export function getTopCountries(
  metrics: EventMetrics,
  limit: number = 5
): Array<{ countryCode: string; count: number }> {
  return Object.entries(metrics.geographic_data)
    .map(([countryCode, count]) => ({ countryCode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get device type breakdown (premium feature)
 */
export function getDeviceBreakdown(metrics: EventMetrics): {
  mobile: number;
  tablet: number;
  desktop: number;
} {
  return {
    mobile: metrics.device_types['mobile'] || 0,
    tablet: metrics.device_types['tablet'] || 0,
    desktop: metrics.device_types['desktop'] || 0,
  };
}
