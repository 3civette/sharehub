/**
 * Public Routes
 * Purpose: Public event page API endpoints
 * Feature: 003-ora-facciamo-il
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { eventFlowService } from '../services/eventFlowService';
import { metricsService } from '../services/metricsService';
import { optionalTokenAuth } from '../middleware/tokenAuth';
import { applyRateLimit } from '../middleware/rateLimit';

const router = Router();

/**
 * GET /events/:eventId/public
 * Get public event page data
 * - Public events: accessible without token
 * - Private events: requires valid token (organizer or participant)
 */
router.get(
  '/events/:eventId/public',
  applyRateLimit,
  optionalTokenAuth,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;

      // Get event to check visibility
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: event } = await supabase
        .from('events')
        .select('visibility, tenant_id')
        .eq('id', eventId)
        .single();

      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      // Check access for private events
      if (event.visibility === 'private') {
        if (!req.tokenData) {
          res.status(403).json({
            error: 'Access denied',
            message: 'This is a private event. Valid token required.',
          });
          return;
        }

        // Verify token belongs to this event
        if (req.tokenData.eventId !== eventId) {
          res.status(403).json({
            error: 'Access denied',
            message: 'Invalid token for this event',
          });
          return;
        }
      }

      // Get event with hierarchy
      const tenantId = event.tenant_id;
      const eventData = await eventFlowService.getEventWithHierarchy(eventId, tenantId);

      // Track page view (with optional metadata)
      const ipHash = req.ip ? Buffer.from(req.ip).toString('base64') : undefined;
      const userAgent = req.headers['user-agent'];

      // Detect device type from user agent
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (userAgent) {
        if (/mobile/i.test(userAgent)) deviceType = 'mobile';
        else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';
      }

      // Track page view (non-blocking)
      metricsService
        .trackPageView(tenantId, {
          event_id: eventId,
          ip_hash: ipHash,
          metadata: {
            user_agent: userAgent,
            device_type: deviceType,
          },
        })
        .catch((err) => console.error('Failed to track page view:', err));

      // Return event data (no metrics or activity log for public)
      res.json({
        event: eventData.event,
        sessions: eventData.sessions,
      });
    } catch (error) {
      console.error('Public event page error:', error);
      res.status(500).json({
        error: 'Failed to load event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
