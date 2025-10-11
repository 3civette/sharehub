// Feature 004: ZIP Generation Service
// Date: 2025-10-07
// Service for generating ZIP archives of slides (per-speech or per-session)

import { Response } from 'express';
import archiver from 'archiver';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Sanitize filename for safe use in ZIP archives and filenames
 * @param name Original name
 * @returns Sanitized name (lowercase, hyphens, alphanumeric)
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate ZIP archive for all slides in a speech
 * @param speechId Speech UUID
 * @param res Express response object (for streaming)
 * @throws Error if speech not found or no slides
 */
export async function generateSpeechZip(
  speechId: string,
  res: Response
): Promise<void> {
  // 1. Get speech details
  const { data: speech, error: speechError } = await supabase
    .from('speeches')
    .select(`
      id,
      title,
      session_id,
      sessions (
        event_id,
        events (
          tenant_id
        )
      )
    `)
    .eq('id', speechId)
    .single();

  if (speechError || !speech) {
    throw new Error('Speech not found');
  }

  // 2. Get all slides for speech
  const { data: slides, error: slidesError } = await supabase
    .from('slides')
    .select('id, filename, storage_path, file_size')
    .eq('speech_id', speechId)
    .order('display_order', { ascending: true });

  if (slidesError || !slides || slides.length === 0) {
    throw new Error('No slides available for this speech');
  }

  // 3. Set response headers
  const zipFilename = `${sanitizeFilename(speech.title)}-slides.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  // 4. Create ZIP archive (streaming)
  const archive = archiver('zip', {
    zlib: { level: 6 } // Compression level (0-9)
  });

  // Pipe archive to response
  archive.pipe(res);

  // 5. Add slides to ZIP
  for (const slide of slides) {
    // Generate signed URL (60 seconds)
    const { data: signedUrlData } = await supabase.storage
      .from('slides')
      .createSignedUrl(slide.storage_path, 60);

    if (!signedUrlData?.signedUrl) {
      console.error(`Failed to generate signed URL for slide ${slide.id}`);
      continue;
    }

    // Fetch slide content from Supabase Storage
    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      console.error(`Failed to fetch slide ${slide.id}: ${response.statusText}`);
      continue;
    }

    const buffer = await response.buffer();

    // Add to ZIP with original filename
    archive.append(buffer, { name: slide.filename });
  }

  // 6. Finalize ZIP (important: triggers stream completion)
  await archive.finalize();

  // 7. Log batch download to activity_logs
  const tenantId = (speech.sessions as any).events.tenant_id;
  const eventId = (speech.sessions as any).event_id;

  await supabase.from('activity_logs').insert({
    tenant_id: tenantId,
    event_id: eventId,
    actor_type: 'anonymous',
    action_type: 'batch_download',
    metadata: {
      zip_type: 'speech',
      speech_id: speechId,
      speech_title: speech.title,
      slide_count: slides.length
    },
    timestamp: new Date().toISOString(),
    retention_days: 90
  });
}

/**
 * Generate ZIP archive for all slides in a session (organized by speech)
 * @param sessionId Session UUID
 * @param res Express response object (for streaming)
 * @throws Error if session not found or no slides
 */
export async function generateSessionZip(
  sessionId: string,
  res: Response
): Promise<void> {
  // 1. Get session details
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      id,
      title,
      event_id,
      events (
        tenant_id
      )
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error('Session not found');
  }

  // 2. Get all speeches in session
  const { data: speeches, error: speechesError } = await supabase
    .from('speeches')
    .select('id, title')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true });

  if (speechesError || !speeches || speeches.length === 0) {
    throw new Error('No speeches available for this session');
  }

  // 3. Get all slides for speeches
  const speechIds = speeches.map(sp => sp.id);
  const { data: slides, error: slidesError } = await supabase
    .from('slides')
    .select('id, speech_id, filename, storage_path, file_size, display_order')
    .in('speech_id', speechIds)
    .order('display_order', { ascending: true });

  if (slidesError || !slides || slides.length === 0) {
    throw new Error('No slides available for this session');
  }

  // 4. Set response headers
  const zipFilename = `${sanitizeFilename(session.title)}-slides.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  // 5. Create ZIP archive (streaming)
  const archive = archiver('zip', {
    zlib: { level: 6 }
  });

  archive.pipe(res);

  // 6. Add slides to ZIP (organized by speech folders)
  for (const speech of speeches) {
    const speechSlides = slides.filter(sl => sl.speech_id === speech.id);
    const speechFolderName = sanitizeFilename(speech.title);

    for (const slide of speechSlides) {
      // Generate signed URL
      const { data: signedUrlData } = await supabase.storage
        .from('slides')
        .createSignedUrl(slide.storage_path, 60);

      if (!signedUrlData?.signedUrl) {
        console.error(`Failed to generate signed URL for slide ${slide.id}`);
        continue;
      }

      // Fetch slide content
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        console.error(`Failed to fetch slide ${slide.id}: ${response.statusText}`);
        continue;
      }

      const buffer = await response.buffer();

      // Add to ZIP with folder structure: /speech-title/slide-filename.pdf
      archive.append(buffer, {
        name: `${speechFolderName}/${slide.filename}`
      });
    }
  }

  // 7. Finalize ZIP
  await archive.finalize();

  // 8. Log batch download to activity_logs
  const tenantId = (session.events as any).tenant_id;
  const eventId = session.event_id;

  await supabase.from('activity_logs').insert({
    tenant_id: tenantId,
    event_id: eventId,
    actor_type: 'anonymous',
    action_type: 'batch_download',
    metadata: {
      zip_type: 'session',
      session_id: sessionId,
      session_title: session.title,
      speech_count: speeches.length,
      slide_count: slides.length
    },
    timestamp: new Date().toISOString(),
    retention_days: 90
  });
}
