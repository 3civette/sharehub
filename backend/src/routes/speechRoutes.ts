/**
 * Speech Routes
 * Purpose: API endpoints for speech management within sessions
 * Feature: 003-ora-facciamo-il
 */

import { Router, Request, Response } from 'express';
import { speechService } from '../services/speechService';
import { createSpeechSchema, updateSpeechSchema, reorderSpeechesSchema } from '../models/speech';
import { authenticateToken, requireOrganizer } from '../middleware/tokenAuth';
import { setTenantContext } from '../middleware/tenantIsolation';

const router = Router();

/**
 * POST /sessions/:sessionId/speeches
 * Create a new speech (organizer only)
 */
router.post(
  '/sessions/:sessionId/speeches',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const tenantId = req.tokenData!.tenantId;

      // Validate input
      const validationResult = createSpeechSchema.safeParse({
        ...req.body,
        session_id: sessionId,
      });

      if (!validationResult.success) {
        res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
        return;
      }

      // Create speech
      const speech = await speechService.createSpeech(tenantId, validationResult.data);

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
 * GET /speeches/:id
 * Get speech with slides (token auth)
 */
router.get(
  '/speeches/:id',
  authenticateToken,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const speechId = req.params.id;
      const tenantId = req.tokenData!.tenantId;

      const speech = await speechService.getSpeechWithSlides(speechId, tenantId);

      res.json(speech);
    } catch (error) {
      console.error('Get speech error:', error);
      if (error instanceof Error && error.message === 'Speech not found') {
        res.status(404).json({ error: 'Speech not found' });
        return;
      }
      res.status(500).json({
        error: 'Failed to get speech',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PUT /speeches/:speechId
 * Update speech (organizer only)
 */
router.put(
  '/speeches/:speechId',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const speechId = req.params.speechId;
      const tenantId = req.tokenData!.tenantId;

      // Validate input
      const validationResult = updateSpeechSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
        return;
      }

      // Update speech
      const speech = await speechService.updateSpeech(
        speechId,
        tenantId,
        validationResult.data
      );

      res.json(speech);
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
 * DELETE /speeches/:speechId
 * Delete speech (organizer only, cascades to slides)
 */
router.delete(
  '/speeches/:speechId',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const speechId = req.params.speechId;
      const tenantId = req.tokenData!.tenantId;

      const result = await speechService.deleteSpeech(speechId, tenantId);

      res.json({
        message: 'Speech deleted successfully',
        slideCount: result.slideCount,
        warning: result.slideCount > 0 ? `${result.slideCount} slide(s) were also deleted` : null,
      });
    } catch (error) {
      console.error('Delete speech error:', error);
      res.status(500).json({
        error: 'Failed to delete speech',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /speeches/:id/reorder
 * Reorder speeches within a session (organizer only)
 */
router.post(
  '/speeches/:id/reorder',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id;
      const tenantId = req.tokenData!.tenantId;

      // Validate input
      const validationResult = reorderSpeechesSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(422).json({
          error: 'Validation error',
          details: validationResult.error.issues,
        });
        return;
      }

      // Reorder speeches
      const speeches = await speechService.reorderSpeeches(
        sessionId,
        tenantId,
        validationResult.data.speech_ids
      );

      res.json({ speeches });
    } catch (error) {
      console.error('Reorder speeches error:', error);
      res.status(500).json({
        error: 'Failed to reorder speeches',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
