/**
 * Admin Session Routes
 * Purpose: API endpoints for admin session management
 * Feature: 005-ora-bisogna-implementare
 * Uses admin JWT authentication instead of event tokens
 */

import { Router, Request, Response } from 'express';
import { sessionService } from '../services/sessionService';
import { createSessionSchema, updateSessionSchema } from '../models/session';
import { adminAuth } from '../middleware/adminAuth';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /admin/events/:eventId/sessions
 * Create a new session (admin only)
 */
router.post(
  '/events/:eventId/sessions',
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const userId = (req as any).user.id;

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

      // Verify event belongs to admin's tenant
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .eq('tenant_id', admin.tenant_id)
        .single();

      if (eventError || !event) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this event',
        });
      }

      // Log incoming request body
      console.log('=== SESSION CREATE REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      // Validate input
      const validationResult = createSessionSchema.safeParse({
        ...req.body,
        event_id: eventId,
      });

      if (!validationResult.success) {
        return res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
      }

      console.log('Validated data:', JSON.stringify(validationResult.data, null, 2));
      console.log('===========================');

      // Create session
      const session = await sessionService.createSession(admin.tenant_id, validationResult.data);

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
 * PATCH /admin/events/:eventId/sessions/:sessionId
 * Update a session (admin only)
 */
router.patch(
  '/events/:eventId/sessions/:sessionId',
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const { eventId, sessionId } = req.params;
      const userId = (req as any).user.id;

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

      // Verify event belongs to admin's tenant
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .eq('tenant_id', admin.tenant_id)
        .single();

      if (eventError || !event) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this event',
        });
      }

      // Validate input
      const validationResult = updateSessionSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
      }

      // Update session
      const session = await sessionService.updateSession(
        admin.tenant_id,
        sessionId,
        validationResult.data
      );

      res.status(200).json(session);
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
 * DELETE /admin/events/:eventId/sessions/:sessionId
 * Delete a session (admin only)
 */
router.delete(
  '/events/:eventId/sessions/:sessionId',
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const { eventId, sessionId } = req.params;
      const userId = (req as any).user.id;

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

      // Verify event belongs to admin's tenant
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .eq('tenant_id', admin.tenant_id)
        .single();

      if (eventError || !event) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this event',
        });
      }

      // Delete session
      await sessionService.deleteSession(admin.tenant_id, sessionId);

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

export default router;
