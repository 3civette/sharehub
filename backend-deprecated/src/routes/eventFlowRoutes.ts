/**
 * Event Flow Routes
 * Purpose: API endpoints for event management (feature 003)
 * Feature: 003-ora-facciamo-il
 */

import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { eventFlowService } from '../services/eventFlowService';
import { tokenService } from '../services/tokenService';
import { slideService } from '../services/slideService';
import { createEventSchema, updateEventSchema, eventFiltersSchema } from '../models/event';
import { authenticateToken, optionalTokenAuth } from '../middleware/tokenAuth';
import { setTenantContext, setTenantContextFromAdmin } from '../middleware/tenantIsolation';
import { applyRateLimit } from '../middleware/rateLimit';

const router = Router();

/**
 * POST /events
 * Create a new event (admin only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Admin authentication check (assumes admin middleware sets req.admin)
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    // Get admin and tenant info (from feature 002 admin middleware)
    const admin = (req as any).admin;
    if (!admin?.tenant_id) {
      res.status(401).json({ error: 'Invalid admin token' });
      return;
    }

    // Validate input
    const validationResult = createEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(422).json({
        error: 'Validation error',
        details: validationResult.error.issues,
      });
      return;
    }

    // Check token expiration is in the future for private events
    if (validationResult.data.visibility === 'private') {
      const expirationDate = new Date(validationResult.data.token_expiration_date!);
      if (expirationDate <= new Date()) {
        res.status(422).json({
          error: 'Validation error',
          message: 'Token expiration date must be in the future',
        });
        return;
      }
    }

    // Create event
    const result = await eventFlowService.createEvent(
      admin.tenant_id,
      validationResult.data,
      admin.id
    );

    res.status(201).json({
      event: result.event,
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /events
 * List events for tenant (admin only)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    const admin = (req as any).admin;
    if (!admin?.tenant_id) {
      res.status(401).json({ error: 'Invalid admin token' });
      return;
    }

    // Parse filters
    const filters = eventFiltersSchema.parse({
      status: req.query.status,
      visibility: req.query.visibility,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    });

    const result = await eventFlowService.listEvents(admin.tenant_id, filters);

    res.json({
      events: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({
      error: 'Failed to list events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /events/:id
 * Get event details with hierarchy
 * Supports both admin token and access token
 */
router.get('/:id', optionalTokenAuth, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;

    // Check authentication (admin or token)
    const adminToken = req.headers['x-admin-token'];
    const hasTokenAuth = !!req.tokenData;

    if (!adminToken && !hasTokenAuth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get tenant ID
    let tenantId: string;
    if (hasTokenAuth) {
      tenantId = req.tokenData!.tenantId;
    } else {
      const admin = (req as any).admin;
      tenantId = admin.tenant_id;
    }

    // Get event with hierarchy
    const result = await eventFlowService.getEventWithHierarchy(eventId, tenantId);

    res.json(result);
  } catch (error) {
    console.error('Get event error:', error);
    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(500).json({
      error: 'Failed to get event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /events/:id
 * Update event (admin only)
 * Requires X-Confirm-Past-Event header for past events
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    const admin = (req as any).admin;
    if (!admin?.tenant_id) {
      res.status(401).json({ error: 'Invalid admin token' });
      return;
    }

    const eventId = req.params.id;

    // Validate input
    const validationResult = updateEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(422).json({
        error: 'Validation error',
        details: validationResult.error.issues,
      });
      return;
    }

    // Check for confirmation header
    const confirmPastEvent = req.headers['x-confirm-past-event'] === 'true';

    // Update event
    const updated = await eventFlowService.updateEvent(
      eventId,
      admin.tenant_id,
      validationResult.data,
      confirmPastEvent
    );

    res.json({ event: updated });
  } catch (error) {
    console.error('Update event error:', error);
    if (error instanceof Error && error.message.includes('Confirmation required')) {
      res.status(403).json({
        error: 'Confirmation required',
        message: 'Past events require confirmation header: X-Confirm-Past-Event: true',
      });
      return;
    }
    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(500).json({
      error: 'Failed to update event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /events/:id
 * Delete event (admin only)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    const admin = (req as any).admin;
    if (!admin?.tenant_id) {
      res.status(401).json({ error: 'Invalid admin token' });
      return;
    }

    const eventId = req.params.id;

    await eventFlowService.deleteEvent(eventId, admin.tenant_id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /events/:eventId/tokens/pdf
 * Generate PDF with QR codes for tokens (admin only, private events only)
 */
router.get('/:eventId/tokens/pdf', async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    const admin = (req as any).admin;
    if (!admin?.tenant_id) {
      res.status(401).json({ error: 'Invalid admin token' });
      return;
    }

    const eventId = req.params.eventId;

    // Get event
    const result = await eventFlowService.getEventWithHierarchy(eventId, admin.tenant_id);
    const event = result.event;

    // Check if event is private
    if (event.visibility !== 'private') {
      res.status(404).json({
        error: 'Not found',
        message: 'Token PDF is only available for private events',
      });
      return;
    }

    // Get tokens
    const tokens = await tokenService.getTokensForEvent(eventId);
    const organizerToken = tokens.find(t => t.type === 'organizer');
    const participantToken = tokens.find(t => t.type === 'participant');

    if (!organizerToken || !participantToken) {
      res.status(404).json({ error: 'Tokens not found' });
      return;
    }

    // Generate QR codes
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const organizerUrl = `${baseUrl}/events/${event.slug}?token=${organizerToken.token}`;
    const participantUrl = `${baseUrl}/events/${event.slug}?token=${participantToken.token}`;

    const organizerQR = await QRCode.toDataURL(organizerUrl);
    const participantQR = await QRCode.toDataURL(participantUrl);

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="event-${event.slug}-tokens.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Add content
    doc.fontSize(20).text(`Access Tokens for ${event.name}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Event Date: ${event.date}`, { align: 'center' });
    doc.moveDown(2);

    // Organizer token
    doc.fontSize(16).text('Organizer Access (Full Control)', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Token: ${organizerToken.token}`);
    doc.moveDown();
    doc.image(organizerQR, { width: 200 });
    doc.moveDown(2);

    // Participant token
    doc.fontSize(16).text('Participant Access (View Only)', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Token: ${participantToken.token}`);
    doc.moveDown();
    doc.image(participantQR, { width: 200 });
    doc.moveDown(2);

    // Footer
    doc.fontSize(8).text('Keep these tokens secure. They provide access to your event.', {
      align: 'center',
    });

    doc.end();
  } catch (error) {
    console.error('Generate tokens PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

/**
 * GET /events/:eventId/slides/download-all
 * Download all slides as ZIP (token auth required)
 */
router.get(
  '/:eventId/slides/download-all',
  applyRateLimit,
  authenticateToken,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const tenantId = req.tokenData!.tenantId;

      // Get event name for filename
      const result = await eventFlowService.getEventWithHierarchy(eventId, tenantId);
      const eventName = result.event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const date = new Date().toISOString().split('T')[0];

      // Set headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${eventName}-slides-${date}.zip"`
      );

      // Generate and stream ZIP
      await slideService.generateZIP(eventId, tenantId, res);
    } catch (error) {
      console.error('Download ZIP error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to generate ZIP',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
);

export default router;
