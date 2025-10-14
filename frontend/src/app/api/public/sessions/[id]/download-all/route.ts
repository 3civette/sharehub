/**
 * Session Bulk Download API Route
 * Feature: 011-il-momento-di - Public Event Page
 *
 * GET /api/public/sessions/[id]/download-all
 *
 * Downloads all slides in a session as a ZIP file.
 * Uses streaming ZIP generation to handle large file sets efficiently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePresignedDownloadUrl } from '@/lib/r2';
import archiver from 'archiver';
import type { Database } from '@/types/database.types';

// Initialize Supabase client for API route
// Using service role key to bypass RLS
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: sessionId } = params;

    // =========================================================================
    // Step 1: Fetch session with speeches and slides
    // =========================================================================
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        event_id,
        speeches:speeches(
          id,
          title,
          slides:slides(
            id,
            filename,
            r2_key,
            deleted_at
          )
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error(`Session not found: ${sessionId}`, sessionError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // =========================================================================
    // Step 2: Collect all slides from all speeches in the session
    // =========================================================================
    const allSlides: Array<{ filename: string; r2_key: string }> = [];

    for (const speech of (session.speeches as any[]) || []) {
      for (const slide of (speech.slides as any[]) || []) {
        if (slide.r2_key && !slide.deleted_at) {
          allSlides.push({
            filename: slide.filename,
            r2_key: slide.r2_key
          });
        }
      }
    }

    if (allSlides.length === 0) {
      return NextResponse.json(
        { error: 'No slides found in this session' },
        { status: 404 }
      );
    }

    // =========================================================================
    // Step 3: Generate safe ZIP filename
    // =========================================================================
    // Sanitize session title for filename
    const safeSessionTitle = session.title
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    const zipFilename = `${safeSessionTitle}.zip`;

    // =========================================================================
    // Step 4: Create streaming ZIP response
    // =========================================================================
    // Note: Next.js Edge Runtime doesn't support streams in the same way
    // We need to buffer in memory or use a different approach
    // For serverless functions, we'll use a memory-based approach

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 6 } // Compression level (0-9)
    });

    // Collect archive data in memory
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    // =========================================================================
    // Step 5: Fetch slides from R2 and add to archive
    // =========================================================================
    for (const slide of allSlides) {
      try {
        // Generate presigned download URL (5 minutes expiry for internal use)
        const downloadUrl = await generatePresignedDownloadUrl(slide.r2_key, 300);

        // Fetch file from R2
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          console.error(`Failed to fetch slide ${slide.filename}: ${response.statusText}`);
          continue; // Skip this slide and continue with others
        }

        // Get file buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Add file to archive with original filename
        archive.append(buffer, { name: slide.filename });

      } catch (error) {
        console.error(`Error processing slide ${slide.filename}:`, error);
        // Continue with other slides even if one fails
      }
    }

    // =========================================================================
    // Step 6: Finalize archive and wait for completion
    // =========================================================================
    await archive.finalize();

    // Wait for all chunks to be collected
    await new Promise((resolve) => {
      archive.on('end', resolve);
    });

    // Combine all chunks into single buffer
    const zipBuffer = Buffer.concat(chunks);

    // =========================================================================
    // Step 7: Return ZIP file as response
    // =========================================================================
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/public/sessions/[id]/download-all:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// No caching for ZIP downloads
export const dynamic = 'force-dynamic';
