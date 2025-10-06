import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /slides/:id/download
router.get('/:id/download', async (req, res) => {
  try {
    const { data: slide, error } = await supabase
      .from('slide_decks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    const { data: signedUrl } = await supabase.storage
      .from('slides')
      .createSignedUrl(slide.storage_path, 3600);

    res.json({ download_url: signedUrl.signedUrl, expires_at: new Date(Date.now() + 3600000).toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
