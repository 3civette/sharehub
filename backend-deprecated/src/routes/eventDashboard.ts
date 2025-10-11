// Feature 005-ora-facciamo-la: Event Management Dashboard
// Date: 2025-10-08
// Event Dashboard API routes

import express, { Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { getDashboardData } from '../services/dashboardService';
import { generateTokenQR } from '../services/qrCodeService';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /:eventId/dashboard
 * Get complete dashboard data for an event
 */
router.get('/:eventId/dashboard', adminAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = (req as any).user.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid event ID format',
      });
    }

    // Get admin's tenant_id
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin account not found',
      });
    }

    // Get dashboard data (includes RLS tenant check)
    const dashboardData = await getDashboardData(eventId, admin.tenant_id);

    res.status(200).json(dashboardData);
  } catch (error: any) {
    console.error('Dashboard error:', error);

    if (error.message === 'Event not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Event not found',
      });
    }

    if (error.message.includes('Forbidden') || error.message.includes('access')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this event',
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load dashboard data',
    });
  }
});

/**
 * GET /:eventId/tokens/:tokenId/qr
 * Generate QR code PNG for a participant access token
 */
router.get('/:eventId/tokens/:tokenId/qr', adminAuth, async (req: Request, res: Response) => {
  try {
    const { eventId, tokenId } = req.params;
    const userId = (req as any).user.id;

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId) || !uuidRegex.test(tokenId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid ID format',
      });
    }

    // Get admin's tenant_id
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin account not found',
      });
    }

    // Set tenant context for RLS
    await supabase.rpc('set_config', {
      setting: 'app.current_tenant_id',
      value: admin.tenant_id,
      is_local: true,
    });

    // Get event with tenant check
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('slug, tenant_id')
      .eq('id', eventId)
      .eq('tenant_id', admin.tenant_id)
      .single();

    if (eventError || !event) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this event',
      });
    }

    // Get token with validation
    const { data: token, error: tokenError } = await supabase
      .from('access_tokens')
      .select('token, type, expires_at')
      .eq('id', tokenId)
      .eq('event_id', eventId)
      .single();

    if (tokenError || !token) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Token not found',
      });
    }

    // Validate token type (only participant tokens allowed)
    if (token.type !== 'participant') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'QR generation is only available for participant tokens',
      });
    }

    // Check token not expired
    if (new Date(token.expires_at) < new Date()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Token has expired',
      });
    }

    // Generate QR code
    const qrBuffer = await generateTokenQR(token.token, event.slug);

    // Set response headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="participant-token-${event.slug}.png"`);
    res.status(200).send(qrBuffer);
  } catch (error: any) {
    console.error('QR generation error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate QR code',
    });
  }
});

export default router;
