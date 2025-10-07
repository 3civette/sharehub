// Admin Settings Routes
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)

import express from 'express';
import * as settingsService from '../services/settingsService';

const router = express.Router();

// GET /settings/:tenantId - Get tenant settings
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // TODO: Verify user is admin of this tenant (add auth middleware)

    const settings = await settingsService.getSettings(tenantId);
    res.json(settings);
  } catch (error: any) {
    console.error('Get settings error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// PUT /settings/:tenantId - Update tenant settings
router.put('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const input = req.body;

    // TODO: Verify user is admin of this tenant (add auth middleware)

    // Ignore billing_info if provided (read-only field)
    const { billing_info, id, ...updateData } = input;

    const settings = await settingsService.updateSettings(tenantId, updateData);
    res.json(settings);
  } catch (error: any) {
    console.error('Update settings error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    if (
      error.message.includes('Hotel name') ||
      error.message.includes('email') ||
      error.message.includes('phone') ||
      error.message.includes('characters')
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to update settings' });
  }
});

export default router;
