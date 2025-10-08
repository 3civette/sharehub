// Feature 005-ora-facciamo-la: Event Management Dashboard
// Date: 2025-10-08
// Dashboard aggregated data types

import { Event } from './admin';
import { AccessToken } from './accessToken';
import { Session } from './session';
import { Speech } from './speech';
import { EventPhoto } from './eventPhoto';

/**
 * Aggregated dashboard data for a single event
 * Includes all related resources in one response
 */
export interface DashboardData {
  event: Event;
  tokens: AccessToken[];
  sessions: Session[];
  speeches: Speech[];
  photos: EventPhoto[];
  metrics: MetricsSummary;
}

/**
 * Cached metrics summary for an event
 * Updated every 5 minutes
 */
export interface MetricsSummary {
  pageViews: number;
  slideDownloads: number;
  participantCount: number;
  lastRefreshed: string; // ISO 8601 timestamp
}
