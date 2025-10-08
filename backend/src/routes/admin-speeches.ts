/**
 * Admin Speech Routes
 * Purpose: API endpoints for admin speech management
 * Feature: 005-ora-bisogna-implementare
 * Uses admin JWT authentication instead of event tokens
 */

import { Router, Request, Response } from 'express';
import { speechService } from '../services/speechService';
import { createSpeechSchema, updateSpeechSchema } from '../models/speech';
import { adminAuth } from '../middleware/adminAuth';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /admin/events/:eventId/sessions/:sessionId/speeches
 * Create a new speech (admin only)
 */
router.post(
  '/events/:eventId/sessions/:sessionId/speeches',
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
      const validationResult = createSpeechSchema.safeParse({
        ...req.body,
        session_id: sessionId,
      });

      if (!validationResult.success) {
        return res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
      }

      // Create speech
      const speech = await speechService.createSpeech(admin.tenant_id, validationResult.data);

      res.status(201).json(speech);
    } catch (error) {
      console.error('Create speech error:', error);
      res.status(500).json({
        error: 'Failed to create speech',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PATCH /admin/events/:eventId/sessions/:sessionId/speeches/:speechId
 * Update a speech (admin only)
 */
router.patch(
  '/events/:eventId/sessions/:sessionId/speeches/:speechId',
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const { eventId, speechId } = req.params;
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
      const validationResult = updateSpeechSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
      }

      // Update speech
      const speech = await speechService.updateSpeech(
        admin.tenant_id,
        speechId,
        validationResult.data
      );

      res.status(200).json(speech);
    } catch (error) {
      console.error('Update speech error:', error);
      res.status(500).json({
        error: 'Failed to update speech',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /admin/events/:eventId/sessions/:sessionId/speeches/:speechId
 * Delete a speech (admin only)
 */
router.delete(
  '/events/:eventId/sessions/:sessionId/speeches/:speechId',
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const { eventId, speechId } = req.params;
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

      // Delete speech
      await speechService.deleteSpeech(admin.tenant_id, speechId);

      res.status(204).send();
    } catch (error) {
      console.error('Delete speech error:', error);
      res.status(500).json({
        error: 'Failed to delete speech',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
