/**
 * Speeches Routes
 * Feature: 003-ora-facciamo-il (enhanced by 005-ora-bisogna-implementare)
 * Purpose: API endpoints for speech management with smart ordering
 * Contract: specs/005-ora-bisogna-implementare/contracts/speeches-api.md
 */

import express, { Request, Response } from 'express';
import { speechService } from '../services/speechService';
import { createSpeechSchema, updateSpeechSchema, reorderSpeechesSchema } from '../models/speech';

const router = express.Router();

/**
 * POST /api/sessions/:sessionId/speeches
 * Create a new speech
 */
router.post('/sessions/:sessionId/speeches', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tenant_id } = req.body;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    // Validate input with Zod
    const validationResult = createSpeechSchema.safeParse({ ...req.body, session_id: sessionId });
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const speech = await speechService.createSpeech(tenant_id, validationResult.data);

    res.status(201).json(speech);
  } catch (error) {
    console.error('Create speech error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create speech',
    });
  }
});

/**
 * GET /api/sessions/:sessionId/speeches
 * List all speeches for a session (smart ordering)
 */
router.get('/sessions/:sessionId/speeches', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tenant_id } = req.query;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const speeches = await speechService.listSpeeches(sessionId, tenant_id);

    res.json({
      speeches,
      total: speeches.length,
    });
  } catch (error) {
    console.error('List speeches error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list speeches',
    });
  }
});

/**
 * GET /api/speeches/:speechId
 * Get a single speech by ID
 */
router.get('/:speechId', async (req: Request, res: Response) => {
  try {
    const { speechId } = req.params;
    const { tenant_id } = req.query;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const speech = await speechService.getSpeech(speechId, tenant_id);

    if (!speech) {
      return res.status(404).json({ error: 'Speech not found' });
    }

    res.json(speech);
  } catch (error) {
    console.error('Get speech error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get speech',
    });
  }
});

/**
 * GET /api/speeches/:speechId/with-slides
 * Get speech with nested slides (hierarchical query)
 */
router.get('/:speechId/with-slides', async (req: Request, res: Response) => {
  try {
    const { speechId } = req.params;
    const { tenant_id } = req.query;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const speech = await speechService.getSpeechWithSlides(speechId, tenant_id);

    res.json(speech);
  } catch (error) {
    console.error('Get speech with slides error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get speech with slides',
    });
  }
});

/**
 * PUT /api/speeches/:speechId
 * Update a speech (auto-clears display_order if scheduled_time changes)
 */
router.put('/:speechId', async (req: Request, res: Response) => {
  try {
    const { speechId } = req.params;
    const { tenant_id } = req.body;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    // Validate input with Zod
    const validationResult = updateSpeechSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const speech = await speechService.updateSpeech(speechId, tenant_id, validationResult.data);

    res.json({
      message: 'Speech updated successfully',
      speech,
    });
  } catch (error) {
    console.error('Update speech error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update speech',
    });
  }
});

/**
 * DELETE /api/speeches/:speechId
 * Delete a speech (cascade deletes slides, returns slide count)
 */
router.delete('/:speechId', async (req: Request, res: Response) => {
  try {
    const { speechId } = req.params;
    const { tenant_id } = req.query;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const result = await speechService.deleteSpeech(speechId, tenant_id);

    res.json({
      message: result.slide_count > 0
        ? `Speech and ${result.slide_count} slides deleted successfully`
        : 'Speech deleted successfully',
      ...result,
    });
  } catch (error) {
    console.error('Delete speech error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete speech',
    });
  }
});

/**
 * POST /api/sessions/:sessionId/speeches/reorder
 * Reorder speeches (manual display_order)
 */
router.post('/sessions/:sessionId/speeches/reorder', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tenant_id, speech_ids } = req.body;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    // Validate input with Zod
    const validationResult = reorderSpeechesSchema.safeParse({ speech_ids });
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const speeches = await speechService.reorderSpeeches(sessionId, tenant_id, speech_ids);

    res.json({
      message: 'Speeches reordered successfully',
      speeches,
    });
  } catch (error) {
    console.error('Reorder speeches error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to reorder speeches',
    });
  }
});

export default router;
