import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '../services/activityLogger';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tenants/:tenantId/branding
router.get('/tenants/:tenantId/branding', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const { data, error } = await supabase
      .from('tenants')
      .select('branding_config')
      .eq('id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      throw error;
    }

    res.json({ branding_config: data.branding_config });
  } catch (error: any) {
    console.error('Get tenant branding error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tenants/:tenantId/branding
router.put('/tenants/:tenantId/branding', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { branding_config } = req.body;

    const { error } = await supabase
      .from('tenants')
      .update({ branding_config })
      .eq('id', tenantId);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      throw error;
    }

    // Log activity
    await logActivity({
      tenant_id: tenantId,
      actor_type: 'admin',
      action_type: 'branding_updated',
      metadata: { type: 'hotel_branding' }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update tenant branding error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/events/:eventId/branding
router.put('/events/:eventId/branding', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { branding_overrides } = req.body;

    // Get event details for logging
    const { data: event } = await supabase
      .from('events')
      .select('tenant_id')
      .eq('id', eventId)
      .single();

    const { error } = await supabase
      .from('events')
      .update({ branding_overrides })
      .eq('id', eventId);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Event not found' });
      }
      throw error;
    }

    // Log activity
    if (event) {
      await logActivity({
        tenant_id: event.tenant_id,
        event_id: eventId,
        actor_type: 'admin',
        action_type: 'branding_updated',
        metadata: { type: 'event_branding' }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update event branding error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
