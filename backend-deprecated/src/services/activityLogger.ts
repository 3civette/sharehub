// Activity Logger Service
// Feature: 001-voglio-creare-l

import { createClient } from '@supabase/supabase-js';
import { CreateActivityLog } from '../models/activity';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Log an activity to the activity_logs table
 * @param activity Activity log data
 * @returns Created activity log ID or throws error
 */
export async function logActivity(activity: CreateActivityLog): Promise<string> {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      tenant_id: activity.tenant_id,
      event_id: activity.event_id || null,
      actor_type: activity.actor_type,
      action_type: activity.action_type,
      metadata: activity.metadata || {},
      timestamp: new Date().toISOString(), // Feature 003 uses 'timestamp' not 'created_at'
      retention_days: 90 // Default retention
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error logging activity:', error);
    throw new Error('Failed to log activity');
  }

  return data.id;
}

/**
 * Get recent activities for a tenant
 * @param tenantId Tenant ID
 * @param limit Number of activities to fetch (default 5)
 * @returns Array of activity logs
 */
export async function getRecentActivities(tenantId: string, limit: number = 5) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('timestamp', { ascending: false }) // Feature 003 uses 'timestamp' not 'created_at'
    .limit(limit);

  if (error) {
    console.error('Error fetching activities:', error);
    throw new Error('Failed to fetch activities');
  }

  return data || [];
}
