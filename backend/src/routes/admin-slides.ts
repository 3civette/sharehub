/**
 * Admin Slide Routes
 * Purpose: Admin panel endpoints for slide management with JWT auth
 * Feature: 005-ora-bisogna-implementare
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { slideService } from '../services/slideService';
import { adminAuth } from '../middleware/adminAuth';
import { createClient } from '@supabase/supabase-js';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, formatUploadedBy } from '../models/slide';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE, // 100MB
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      cb(new Error('Invalid file type. Only PDF, PPT, PPTX, KEY, and ODP files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

/**
 * GET /api/admin/speeches/:speechId/slides
 * List all slides for a speech
 */
router.get('/speeches/:speechId/slides', adminAuth, async (req: Request, res: Response) => {
  try {
    const speechId = req.params.speechId;
    const userId = (req as any).user.id;

    // Get admin's tenant_id
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (adminError || !admin) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Verify speech belongs to admin's tenant
    const { data: speech, error: speechError } = await supabase
      .from('speeches')
      .select('id, tenant_id, session_id')
      .eq('id', speechId)
      .eq('tenant_id', admin.tenant_id)
      .single();

    if (speechError || !speech) {
      res.status(404).json({ error: 'Speech not found' });
      return;
    }

    // Get slides
    const { data: slides, error: slidesError } = await supabase
      .from('slides')
      .select('*')
      .eq('speech_id', speechId)
      .order('display_order', { ascending: true });

    if (slidesError) {
      throw slidesError;
    }

    res.json(slides || []);
  } catch (error) {
    console.error('List slides error:', error);
    res.status(500).json({
      error: 'Failed to list slides',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/speeches/:speechId
 * Get speech details
 */
router.get('/speeches/:speechId', adminAuth, async (req: Request, res: Response) => {
  try {
    const speechId = req.params.speechId;
    const userId = (req as any).user.id;

    // Get admin's tenant_id
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (adminError || !admin) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Get speech
    const { data: speech, error: speechError } = await supabase
      .from('speeches')
      .select('*')
      .eq('id', speechId)
      .eq('tenant_id', admin.tenant_id)
      .single();

    if (speechError || !speech) {
      res.status(404).json({ error: 'Speech not found' });
      return;
    }

    res.json(speech);
  } catch (error) {
    console.error('Get speech error:', error);
    res.status(500).json({
      error: 'Failed to get speech',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/speeches/:speechId/slides
 * Upload slide file (admin only)
 */
router.post(
  '/speeches/:speechId/slides',
  adminAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const speechId = req.params.speechId;
      const userId = (req as any).user.id;

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Get admin's tenant_id
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('tenant_id')
        .eq('id', userId)
        .single();

      if (adminError || !admin) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      const tenantId = admin.tenant_id;

      // Get speech to find event_id and verify ownership
      const { data: speech, error: speechError } = await supabase
        .from('speeches')
        .select('session_id, tenant_id')
        .eq('id', speechId)
        .single();

      if (speechError || !speech) {
        res.status(404).json({ error: 'Speech not found' });
        return;
      }

      if (speech.tenant_id !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { data: session } = await supabase
        .from('sessions')
        .select('event_id')
        .eq('id', speech.session_id)
        .single();

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const eventId = session.event_id;

      // Parse display_order from form data
      const displayOrder = req.body.display_order
        ? parseInt(req.body.display_order)
        : undefined;

      // Upload slide
      const slide = await slideService.uploadSlide(
        tenantId,
        eventId,
        speechId,
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        formatUploadedBy('admin', userId),
        displayOrder
      );

      // Log activity
      await supabase.from('activity_logs').insert({
        event_id: eventId,
        tenant_id: tenantId,
        actor_type: 'admin',
        action_type: 'upload',
        filename: req.file.originalname,
        file_size: req.file.size,
        slide_id: slide.id,
        speech_id: speechId,
        session_id: speech.session_id,
        retention_days: 90,
      });

      res.status(201).json(slide);
    } catch (error) {
      console.error('Upload slide error:', error);

      if (error instanceof Error && error.message.includes('file type')) {
        res.status(400).json({
          error: 'Invalid file type',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to upload slide',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/admin/slides/:slideId
 * Delete slide (admin only)
 */
router.delete('/slides/:slideId', adminAuth, async (req: Request, res: Response) => {
  try {
    const slideId = req.params.slideId;
    const userId = (req as any).user.id;

    // Get admin's tenant_id
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (adminError || !admin) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = admin.tenant_id;

    // Get slide details before deletion
    const slide = await slideService.getSlide(slideId, tenantId);

    if (!slide) {
      res.status(404).json({ error: 'Slide not found' });
      return;
    }

    // Delete slide
    await slideService.deleteSlide(slideId, tenantId);

    // Log deletion
    const { data: speech } = await supabase
      .from('speeches')
      .select('session_id')
      .eq('id', slide.speech_id)
      .single();

    if (speech) {
      const { data: session } = await supabase
        .from('sessions')
        .select('event_id')
        .eq('id', speech.session_id)
        .single();

      if (session) {
        await supabase.from('activity_logs').insert({
          event_id: session.event_id,
          tenant_id: tenantId,
          actor_type: 'admin',
          action_type: 'delete',
          filename: slide.filename,
          file_size: slide.file_size,
          slide_id: null, // Slide no longer exists
          speech_id: slide.speech_id,
          session_id: speech.session_id,
          retention_days: 90,
        });
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete slide error:', error);
    res.status(500).json({
      error: 'Failed to delete slide',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
