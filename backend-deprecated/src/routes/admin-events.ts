// Admin Events Routes
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)

import express from 'express';
import * as eventService from '../services/eventService';

const router = express.Router();

// POST /events - Create new event
router.post('/', async (req, res) => {
  try {
    // TODO: Extract from auth middleware
    const tenantId = req.body.tenant_id || '523c2648-f980-4c9e-8e53-93d812cfa79f'; // Placeholder
    const adminId = '621f3aa6-d32b-4496-9c92-acc53c3827c0'; // Placeholder

    const input = req.body;

    const event = await eventService.createEvent(tenantId, adminId, input);
    res.status(201).json(event);
  } catch (error: any) {
    console.error('Create event error:', error);

    if (
      error.message.includes('required') ||
      error.message.includes('exceed') ||
      error.message.includes('future') ||
      error.message.includes('Visibility')
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to create event' });
  }
});

// PUT /events/:id - Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Extract from auth middleware
    const tenantId = req.body.tenant_id || '523c2648-f980-4c9e-8e53-93d812cfa79f'; // Placeholder

    const input = req.body;

    const event = await eventService.updateEvent(id, tenantId, input);
    res.json(event);
  } catch (error: any) {
    console.error('Update event error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    if (
      error.message.includes('past') ||
      error.message.includes('exceed') ||
      error.message.includes('empty') ||
      error.message.includes('future') ||
      error.message.includes('Visibility')
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to update event' });
  }
});

// GET /events - List events with sort and filter
router.get('/', async (req, res) => {
  try {
    // TODO: Extract from auth middleware
    const tenantId = req.query.tenant_id as string || '523c2648-f980-4c9e-8e53-93d812cfa79f'; // Placeholder

    const params = {
      sort: req.query.sort as 'date-asc' | 'date-desc' | 'created-desc' | undefined,
      filter: req.query.filter as 'all' | 'active' | 'past' | undefined
    };

    const result = await eventService.listEvents(tenantId, params);
    res.json(result);
  } catch (error: any) {
    console.error('List events error:', error);

    if (error.message.includes('Invalid')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to list events' });
  }
});

// GET /events/:id - Get single event
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Extract from auth middleware
    const tenantId = req.query.tenant_id as string || '523c2648-f980-4c9e-8e53-93d812cfa79f'; // Placeholder

    const event = await eventService.getEvent(id, tenantId);
    res.json(event);
  } catch (error: any) {
    console.error('Get event error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to fetch event' });
  }
});

export default router;
