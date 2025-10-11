/**
 * Slide Routes
 * Purpose: API endpoints for slide file management
 * Feature: 003-ora-facciamo-il
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { slideService } from '../services/slideService';
import { createClient } from '@supabase/supabase-js';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, formatUploadedBy } from '../models/slide';
import { authenticateToken, requireOrganizer } from '../middleware/tokenAuth';
import { setTenantContext } from '../middleware/tenantIsolation';
import { applyRateLimit, applyUploadRateLimit } from '../middleware/rateLimit';

const router = Router();

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
 * POST /speeches/:speechId/slides
 * Upload slide file (organizer only)
 */
router.post(
  '/speeches/:speechId/slides',
  applyUploadRateLimit,
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const speechId = req.params.speechId;
      const tenantId = req.tokenData!.tenantId;
      const tokenId = req.tokenData!.token.id;

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Get speech to find event_id
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: speech } = await supabase
        .from('speeches')
        .select('session_id')
        .eq('id', speechId)
        .single();

      if (!speech) {
        res.status(404).json({ error: 'Speech not found' });
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
        formatUploadedBy('organizer', tokenId),
        displayOrder
      );

      // Log activity
      await supabase.from('activity_logs').insert({
        event_id: eventId,
        tenant_id: tenantId,
        actor_type: 'organizer',
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
 * GET /slides/:slideId/download
 * Get download URL for slide (token auth, rate limited)
 */
router.get(
  '/slides/:slideId/download',
  applyRateLimit,
  authenticateToken,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const slideId = req.params.slideId;
      const tenantId = req.tokenData!.tenantId;

      // Get slide details
      const slide = await slideService.getSlide(slideId, tenantId);

      if (!slide) {
        res.status(404).json({ error: 'Slide not found' });
        return;
      }

      // Get download URL
      const downloadUrl = await slideService.getDownloadUrl(slideId, tenantId);

      // Get event_id and session_id for logging
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

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
          // Log download activity
          await supabase.from('activity_logs').insert({
            event_id: session.event_id,
            tenant_id: tenantId,
            actor_type: req.tokenData!.isOrganizer ? 'organizer' : 'participant',
            action_type: 'download',
            filename: slide.filename,
            file_size: slide.file_size,
            slide_id: slideId,
            speech_id: slide.speech_id,
            session_id: speech.session_id,
            retention_days: 90,
          });
        }
      }

      res.json({
        downloadUrl,
        filename: slide.filename,
        fileSize: slide.file_size,
        mimeType: slide.mime_type,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
      });
    } catch (error) {
      console.error('Download slide error:', error);
      res.status(500).json({
        error: 'Failed to get download URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /slides/:slideId
 * Delete slide (organizer only)
 */
router.delete(
  '/slides/:slideId',
  authenticateToken,
  requireOrganizer,
  setTenantContext,
  async (req: Request, res: Response) => {
    try {
      const slideId = req.params.slideId;
      const tenantId = req.tokenData!.tenantId;

      // Get slide details before deletion
      const slide = await slideService.getSlide(slideId, tenantId);

      if (!slide) {
        res.status(404).json({ error: 'Slide not found' });
        return;
      }

      // Delete slide
      await slideService.deleteSlide(slideId, tenantId);

      // Log deletion
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

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
            actor_type: 'organizer',
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
  }
);

export default router;
