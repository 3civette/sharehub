/**
 * Session Routes
 * Purpose: API endpoints for session management within events
 * Feature: 003-ora-facciamo-il
 */

import { Router, Request, Response } from 'express';
import { sessionService } from '../services/sessionService';
import { createSessionSchema, updateSessionSchema, reorderSessionsSchema } from '../models/session';
import { authenticateToken, requireOrganizer } from '../middleware/tokenAuth';
import { setTenantContext } from '../middleware/tenantIsolation';

const router = Router();

/**
 * POST /events/:eventId/sessions
 * Create a new session (organizer only)
 */
router.post(
  '/events/:eventId/sessions',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const tenantId = req.tokenData!.tenantId;

      // Validate input
      const validationResult = createSessionSchema.safeParse({
        ...req.body,
        event_id: eventId,
      });

      if (!validationResult.success) {
        res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
        return;
      }

      // Create session
      const session = await sessionService.createSession(tenantId, validationResult.data);

      res.status(201).json(session);
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /sessions/:id
 * Get session with content (token auth)
 */
router.get(
  '/sessions/:id',
  authenticateToken,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id;
      const tenantId = req.tokenData!.tenantId;

      const session = await sessionService.getSessionWithContent(sessionId, tenantId);

      res.json(session);
    } catch (error) {
      console.error('Get session error:', error);
      if (error instanceof Error && error.message === 'Session not found') {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.status(500).json({
        error: 'Failed to get session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PUT /sessions/:sessionId
 * Update session (organizer only)
 */
router.put(
  '/sessions/:sessionId',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const tenantId = req.tokenData!.tenantId;

      // Validate input
      const validationResult = updateSessionSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
        return;
      }

      // Update session
      const session = await sessionService.updateSession(
        sessionId,
        tenantId,
        validationResult.data
      );

      res.json(session);
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({
        error: 'Failed to update session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /sessions/:sessionId
 * Delete session (organizer only, cascades to speeches and slides)
 */
router.delete(
  '/sessions/:sessionId',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const tenantId = req.tokenData!.tenantId;

      await sessionService.deleteSession(sessionId, tenantId);

      res.status(204).send();
    } catch (error) {
      console.error('Delete session error:', error);
      res.status(500).json({
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /sessions/:id/reorder
 * Reorder sessions within an event (organizer only)
 */
router.post(
  '/sessions/:id/reorder',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id;
      const tenantId = req.tokenData!.tenantId;

      // Validate input
      const validationResult = reorderSessionsSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
        return;
      }

      // Reorder sessions
      const sessions = await sessionService.reorderSessions(
        eventId,
        tenantId,
        validationResult.data.session_ids
      );

      res.json({ sessions });
    } catch (error) {
      console.error('Reorder sessions error:', error);
      res.status(500).json({
        error: 'Failed to reorder sessions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
