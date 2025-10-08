// Feature 004: Public Event Routes
// Date: 2025-10-07
// Routes for public event page access (no authentication required)

import { Router, Request, Response } from 'express';
import {
  getPublicEvent,
  getPublicMetrics,
  validateToken
} from '../services/publicEventService';
import { generateSpeechZip, generateSessionZip } from '../services/zipGenerationService';
import { downloadRateLimit } from '../middleware/downloadRateLimit';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/public/events/:slug
 * Get public event with full hierarchy (sessions → speeches → slides)
 * Query params: ?token=xxx (optional, for private events)
 */
router.get('/events/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const token = req.query.token as string | undefined;

    let tokenId: string | undefined;

    // If token provided, validate it first
    if (token) {
      const validation = await validateToken(slug, token);
      if (!validation.valid) {
        return res.status(403).json({
          error: 'Invalid token',
          message: validation.message
        });
      }
      tokenId = validation.token_id;
    }

    // Get event data
    const eventData = await getPublicEvent(slug, tokenId);

    res.json(eventData);
  } catch (error: any) {
    console.error('Error fetching public event:', error);

    if (error.status === 403) {
      return res.status(403).json({
        error: 'Access denied',
        message: error.message
      });
    }

    res.status(error.status || 500).json({
      error: 'Failed to fetch event',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/public/events/:slug/validate-token
 * Validate access token for private event
 * Body: { token: string }
 */
router.post('/events/:slug/validate-token', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Token is required in request body'
      });
    }

    const validation = await validateToken(slug, token);

    if (!validation.valid) {
      return res.status(403).json({
        valid: false,
        message: validation.message
      });
    }

    res.json({
      valid: true,
      token_type: validation.token_type,
      expires_at: validation.expires_at,
      token_id: validation.token_id
    });
  } catch (error: any) {
    console.error('Error validating token:', error);
    res.status(500).json({
      error: 'Token validation failed',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/public/events/:slug/metrics
 * Get public metrics for event (page_views, total_slide_downloads only)
 */
router.get('/events/:slug/metrics', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const metrics = await getPublicMetrics(slug);
    res.json(metrics);
  } catch (error: any) {
    console.error('Error fetching public metrics:', error);
    res.status(error.status || 500).json({
      error: 'Failed to fetch metrics',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/public/slides/:id/download
 * Download individual slide (with rate limiting)
 * Generates signed URL and redirects
 */
router.get('/slides/:id/download', downloadRateLimit, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get slide metadata
    const { data: slide, error: slideError } = await supabase
      .from('slides')
      .select(`
        id,
        storage_path,
        filename,
        speech_id,
        speeches (
          session_id,
          sessions (
            event_id,
            events (
              tenant_id
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (slideError || !slide) {
      return res.status(404).json({
        error: 'Slide not found',
        message: 'The requested slide does not exist'
      });
    }

    // Generate signed URL (60 seconds)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('slides')
      .createSignedUrl(slide.storage_path, 60);

    if (urlError || !signedUrlData?.signedUrl) {
      return res.status(500).json({
        error: 'Failed to generate download URL',
        message: 'Unable to create download link'
      });
    }

    // Log download to activity_logs
    const tenantId = (slide.speeches as any).sessions.events.tenant_id;
    const eventId = (slide.speeches as any).sessions.event_id;

    await supabase.from('activity_logs').insert({
      tenant_id: tenantId,
      event_id: eventId,
      actor_type: 'anonymous',
      action_type: 'slide_download',
      metadata: {
        slide_id: slide.id,
        filename: slide.filename
      },
      timestamp: new Date().toISOString(),
      retention_days: 90
    });

    // Increment total_slide_downloads metric
    await supabase.rpc('increment_slide_downloads', { event_id_param: eventId });

    // Redirect to signed URL
    res.redirect(signedUrlData.signedUrl);
  } catch (error: any) {
    console.error('Error downloading slide:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/public/speeches/:id/download-all
 * Download all slides in a speech as ZIP (with rate limiting)
 */
router.get('/speeches/:id/download-all', downloadRateLimit, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await generateSpeechZip(id, res);
  } catch (error: any) {
    console.error('Error generating speech ZIP:', error);

    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(error.status || 500).json({
        error: 'ZIP generation failed',
        message: error.message || 'An unexpected error occurred'
      });
    }
  }
});

/**
 * GET /api/public/sessions/:id/download-all
 * Download all slides in a session as ZIP (organized by speech folders)
 */
router.get('/sessions/:id/download-all', downloadRateLimit, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await generateSessionZip(id, res);
  } catch (error: any) {
    console.error('Error generating session ZIP:', error);

    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(error.status || 500).json({
        error: 'ZIP generation failed',
        message: error.message || 'An unexpected error occurred'
      });
    }
  }
});

export default router;
