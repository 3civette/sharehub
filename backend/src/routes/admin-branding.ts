// Admin Branding Routes
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)

import express from 'express';
import multer from 'multer';
import * as brandingService from '../services/brandingService';

const router = express.Router();

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for direct Supabase upload
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow only PNG, JPG, JPEG, SVG
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and SVG are allowed.'));
    }
  }
});

// GET /branding/:tenantId - Get tenant branding configuration
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // TODO: Verify user is admin of this tenant (add auth middleware)

    const branding = await brandingService.getBranding(tenantId);
    res.json(branding);
  } catch (error: any) {
    console.error('Get branding error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to fetch branding' });
  }
});

// PUT /branding/:tenantId - Update tenant branding colors
router.put('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const input = req.body;

    // TODO: Verify user is admin of this tenant (add auth middleware)

    const branding = await brandingService.updateBranding(tenantId, input);
    res.json(branding);
  } catch (error: any) {
    console.error('Update branding error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('hex color') || error.message.includes('valid')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to update branding' });
  }
});

// POST /branding/:tenantId/logo - Upload tenant logo
router.post('/:tenantId/logo', upload.single('logo'), async (req, res) => {
  try {
    const { tenantId } = req.params;

    // TODO: Verify user is admin of this tenant (add auth middleware)

    if (!req.file) {
      return res.status(400).json({ message: 'Logo file is required. Use field name "logo".' });
    }

    const logoUrl = await brandingService.uploadLogo(tenantId, req.file);
    res.json({ logo_url: logoUrl });
  } catch (error: any) {
    console.error('Upload logo error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('file type') || error.message.includes('file size') || error.message.includes('2MB')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to upload logo' });
  }
});

// DELETE /branding/:tenantId/logo - Remove tenant logo
router.delete('/:tenantId/logo', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // TODO: Verify user is admin of this tenant (add auth middleware)

    await brandingService.deleteLogo(tenantId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete logo error:', error);

    if (error.message.includes('not found') || error.message.includes('No logo')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to delete logo' });
  }
});

// POST /branding/:tenantId/reset - Reset branding to defaults
router.post('/:tenantId/reset', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // TODO: Verify user is admin of this tenant (add auth middleware)

    const branding = await brandingService.resetBranding(tenantId);
    res.json(branding);
  } catch (error: any) {
    console.error('Reset branding error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to reset branding' });
  }
});

export default router;
