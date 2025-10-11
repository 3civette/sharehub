/**
 * Dashboard Routes
 * Purpose: Organizer dashboard API endpoints
 * Feature: 003-ora-facciamo-il
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { eventFlowService } from '../services/eventFlowService';
import { metricsService } from '../services/metricsService';
import { authenticateToken, requireOrganizer } from '../middleware/tokenAuth';
import { setTenantContext } from '../middleware/tenantIsolation';
import { applyAuthenticatedRateLimit } from '../middleware/rateLimit';

const router = Router();

/**
 * GET /events/:eventId/dashboard
 * Get organizer dashboard data (organizer token only)
 */
router.get(
  '/events/:eventId/dashboard',
  applyAuthenticatedRateLimit,
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const tenantId = req.tokenData!.tenantId;

      // Get event with full hierarchy
      const eventData = await eventFlowService.getEventWithHierarchy(eventId, tenantId);

      // Get tenant plan to determine metrics access
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: tenant } = await supabase
        .from('tenants')
        .select('subscription_plan')
        .eq('id', tenantId)
        .single();

      const tenantPlan = (tenant?.subscription_plan as 'free' | 'premium') || 'free';

      // Get metrics (filtered by plan)
      const metrics = await metricsService.getMetrics(eventId, tenantId, tenantPlan);

      // Get activity log (paginated)
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const { data: activityLogs, count } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .eq('event_id', eventId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      res.json({
        event: eventData.event,
        sessions: eventData.sessions,
        metrics,
        activity_log: activityLogs || [],
        activity_log_pagination: {
          page,
          limit,
          total: count || 0,
        },
        tenant_plan: tenantPlan,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        error: 'Failed to load dashboard',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
