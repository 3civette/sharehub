/**
 * Event Photos Routes
 * Feature: 005-ora-bisogna-implementare
 * Purpose: API endpoints for event photo management with Supabase Storage
 * Contract: specs/005-ora-bisogna-implementare/contracts/event-photos-api.md
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import { eventPhotoService } from '../services/eventPhotoService';

const router = express.Router();

// Configure multer for memory storage (file buffer processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
    }
  },
});

/**
 * POST /api/events/:eventId/photos
 * Upload a photo to an event (cover or gallery)
 */
router.post('/events/:eventId/photos', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { tenant_id, is_cover } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const isCover = is_cover === 'true' || is_cover === true;

    const photo = await eventPhotoService.uploadPhoto(
      eventId,
      tenant_id,
      file,
      isCover
    );

    res.status(201).json({
      message: isCover ? 'Cover photo uploaded successfully' : 'Photo uploaded successfully',
      photo,
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload photo',
    });
  }
});

/**
 * GET /api/events/:eventId/photos
 * List all photos for an event (ordered by display_order)
 */
router.get('/events/:eventId/photos', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const result = await eventPhotoService.listPhotos(eventId);

    res.json(result);
  } catch (error) {
    console.error('List photos error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list photos',
    });
  }
});

/**
 * PUT /api/events/:eventId/photos/:photoId/set-cover
 * Set a photo as cover (unsets previous cover)
 */
router.put('/events/:eventId/photos/:photoId/set-cover', async (req: Request, res: Response) => {
  try {
    const { eventId, photoId } = req.params;

    const result = await eventPhotoService.setCover(photoId, eventId);

    res.json({
      message: 'Cover photo updated successfully',
      ...result,
    });
  } catch (error) {
    console.error('Set cover error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to set cover photo',
    });
  }
});

/**
 * DELETE /api/events/:eventId/photos/:photoId
 * Delete a photo (with safeguard: cannot delete cover if gallery exists)
 */
router.delete('/events/:eventId/photos/:photoId', async (req: Request, res: Response) => {
  try {
    const { eventId, photoId } = req.params;

    const result = await eventPhotoService.deletePhoto(photoId, eventId);

    res.json({
      message: 'Photo deleted successfully',
      ...result,
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    const statusCode = error instanceof Error && error.message.includes('Cannot delete cover') ? 400 : 500;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to delete photo',
    });
  }
});

/**
 * PUT /api/events/:eventId/photos/reorder
 * Reorder photos (manual display_order)
 */
router.put('/events/:eventId/photos/reorder', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { photo_ids } = req.body;

    if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
      return res.status(400).json({ error: 'photo_ids array is required' });
    }

    const photos = await eventPhotoService.reorderPhotos(eventId, photo_ids);

    res.json({
      message: 'Photos reordered successfully',
      photos,
    });
  } catch (error) {
    console.error('Reorder photos error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to reorder photos',
    });
  }
});

export default router;
