import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { logActivity } from '../services/activityLogger';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /events - Create event with auto-generated tokens
router.post('/', async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      organizer_token: nanoid(21),
      participant_token: nanoid(21),
      branding_overrides: req.body.branding_overrides || {}
    };

    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity({
      tenant_id: data.tenant_id,
      event_id: data.id,
      actor_type: 'admin',
      action_type: 'event_created',
      metadata: { event_title: data.title }
    });

    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /events/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /events/:id/slides
router.get('/:id/slides', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('slide_decks')
      .select('*')
      .eq('event_id', req.params.id);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /events/:id/tokens
router.get('/:id/tokens', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('organizer_token, participant_token')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Event not found' });
      }
      throw error;
    }

    res.json({
      organizer_token: data.organizer_token,
      participant_token: data.participant_token
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
