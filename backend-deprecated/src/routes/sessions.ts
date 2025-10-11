/**
 * Sessions Routes
 * Feature: 003-ora-facciamo-il (enhanced by 005-ora-bisogna-implementare)
 * Purpose: API endpoints for session management with smart ordering
 * Contract: specs/005-ora-bisogna-implementare/contracts/sessions-api.md
 */

import express, { Request, Response } from 'express';
import { sessionService } from '../services/sessionService';
import { createSessionSchema, updateSessionSchema, reorderSessionsSchema } from '../models/session';

const router = express.Router();

/**
 * POST /api/events/:eventId/sessions
 * Create a new session
 */
router.post('/events/:eventId/sessions', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { tenant_id } = req.body;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    // Validate input with Zod
    const validationResult = createSessionSchema.safeParse({ ...req.body, event_id: eventId });
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const session = await sessionService.createSession(tenant_id, validationResult.data);

    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create session',
    });
  }
});

/**
 * GET /api/events/:eventId/sessions
 * List all sessions for an event (smart ordering)
 */
router.get('/events/:eventId/sessions', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { tenant_id } = req.query;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const sessions = await sessionService.listSessions(eventId, tenant_id);

    res.json({
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list sessions',
    });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Get a single session by ID
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tenant_id } = req.query;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const session = await sessionService.getSession(sessionId, tenant_id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get session',
    });
  }
});

/**
 * GET /api/sessions/:sessionId/with-content
 * Get session with nested speeches and slides (hierarchical query)
 */
router.get('/:sessionId/with-content', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tenant_id } = req.query;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const session = await sessionService.getSessionWithContent(sessionId, tenant_id);

    res.json(session);
  } catch (error) {
    console.error('Get session with content error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get session content',
    });
  }
});

/**
 * PUT /api/sessions/:sessionId
 * Update a session (auto-clears display_order if scheduled_time changes)
 */
router.put('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tenant_id } = req.body;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    // Validate input with Zod
    const validationResult = updateSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const session = await sessionService.updateSession(sessionId, tenant_id, validationResult.data);

    res.json({
      message: 'Session updated successfully',
      session,
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update session',
    });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Delete a session (safeguard: checks for speeches first)
 */
router.delete('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tenant_id } = req.query;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const result = await sessionService.deleteSession(sessionId, tenant_id);

    res.json({
      message: 'Session deleted successfully',
      ...result,
    });
  } catch (error) {
    console.error('Delete session error:', error);
    const statusCode = error instanceof Error && error.message.includes('Cannot delete') ? 400 : 500;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to delete session',
    });
  }
});

/**
 * POST /api/events/:eventId/sessions/reorder
 * Reorder sessions (manual display_order)
 */
router.post('/events/:eventId/sessions/reorder', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { tenant_id, session_ids } = req.body;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    // Validate input with Zod
    const validationResult = reorderSessionsSchema.safeParse({ session_ids });
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const sessions = await sessionService.reorderSessions(eventId, tenant_id, session_ids);

    res.json({
      message: 'Sessions reordered successfully',
      sessions,
    });
  } catch (error) {
    console.error('Reorder sessions error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to reorder sessions',
    });
  }
});

export default router;
