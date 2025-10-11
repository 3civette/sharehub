/**
 * POST /api/cleanup
 * Scheduled function to delete slides older than 48 hours
 *
 * Feature: 008-voglio-implementare-la - Serverless Architecture with R2 Storage
 * Contract: specs/008-voglio-implementare-la/contracts/cleanup-scheduled.yml
 * Trigger: Netlify Scheduled Functions (every 6 hours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import R2 from '@/lib/r2';
import type { CleanupResponse, CleanupError } from '@/types/slide';

// =============================================================================
// Constants
// =============================================================================

const RETENTION_HOURS = 48;
const BATCH_SIZE = 1000; // Process up to 1000 slides per run

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const errors: CleanupError[] = [];
  let deletedCount = 0;
  let processedCount = 0;

  try {
    // -------------------------------------------------------------------------
    // Step 1: Verify this is a scheduled function call (optional security)
    // -------------------------------------------------------------------------
    const netlifyEvent = request.headers.get('x-netlify-event');

    // In production, you might want to verify this is a legitimate Netlify call
    // For now, we'll log it for debugging
    console.log(`[Cleanup] Triggered by: ${netlifyEvent || 'manual'}`);

    // -------------------------------------------------------------------------
    // Step 2: Initialize Supabase client with service role key
    // -------------------------------------------------------------------------
    // Use service role key to bypass RLS (cleanup needs access to all tenants)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // -------------------------------------------------------------------------
    // Step 3: Query slides older than 48 hours
    // -------------------------------------------------------------------------
    const cutoffTime = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();

    console.log(`[Cleanup] Querying slides uploaded before: ${cutoffTime}`);

    const { data: expiredSlides, error: queryError } = await supabase
      .from('slides')
      .select('id, r2_key, filename, file_size, uploaded_at, tenant_id')
      .lt('uploaded_at', cutoffTime)
      .is('deleted_at', null)
      .not('r2_key', 'is', null)
      .order('uploaded_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queryError) {
      console.error('[Cleanup] Query error:', queryError);
      return NextResponse.json(
        {
          error: 'CLEANUP_FAILED',
          message: 'Failed to query expired slides',
          details: queryError.message,
        },
        { status: 500 }
      );
    }

    if (!expiredSlides || expiredSlides.length === 0) {
      console.log('[Cleanup] No expired slides found');
      const executionTime = Date.now() - startTime;
      const nextRun = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

      const response: CleanupResponse = {
        deleted_count: 0,
        processed_count: 0,
        errors: [],
        execution_time_ms: executionTime,
        next_run: nextRun,
      };

      return NextResponse.json(response, { status: 200 });
    }

    console.log(`[Cleanup] Found ${expiredSlides.length} expired slides`);
    processedCount = expiredSlides.length;

    // -------------------------------------------------------------------------
    // Step 4: Delete slides from R2 and update database
    // -------------------------------------------------------------------------
    for (const slide of expiredSlides) {
      try {
        // Delete from R2
        console.log(`[Cleanup] Deleting R2 object: ${slide.r2_key}`);
        await R2.deleteObject(slide.r2_key);

        // Mark as deleted in database
        const { error: updateError } = await supabase
          .from('slides')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', slide.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        deletedCount++;
        console.log(`[Cleanup] Successfully deleted slide ${slide.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Cleanup] Failed to delete slide ${slide.id}:`, errorMessage);

        errors.push({
          slide_id: slide.id,
          r2_key: slide.r2_key,
          error: errorMessage,
        });

        // Continue processing other slides even if one fails
      }
    }

    // -------------------------------------------------------------------------
    // Step 5: Log summary
    // -------------------------------------------------------------------------
    const executionTime = Date.now() - startTime;
    console.log(`[Cleanup] Summary:`);
    console.log(`  - Processed: ${processedCount} slides`);
    console.log(`  - Deleted: ${deletedCount} slides`);
    console.log(`  - Errors: ${errors.length}`);
    console.log(`  - Execution time: ${executionTime}ms`);

    if (errors.length > 0) {
      console.error(`[Cleanup] Errors encountered:`, JSON.stringify(errors, null, 2));
    }

    // -------------------------------------------------------------------------
    // Step 6: Calculate next run time
    // -------------------------------------------------------------------------
    const nextRun = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    // -------------------------------------------------------------------------
    // Step 7: Return response
    // -------------------------------------------------------------------------
    const response: CleanupResponse = {
      deleted_count: deletedCount,
      processed_count: processedCount,
      errors: errors,
      execution_time_ms: executionTime,
      next_run: nextRun,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('[Cleanup] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'CLEANUP_FAILED',
        message: 'Cleanup job failed to complete',
        details: error instanceof Error ? error.message : 'Unknown error',
        deleted_count: deletedCount,
        processed_count: processedCount,
        errors: errors,
        execution_time_ms: executionTime,
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Export runtime configuration
// =============================================================================
export const runtime = 'nodejs'; // Use Node.js runtime for AWS SDK compatibility
export const maxDuration = 10; // Allow up to 10 seconds for cleanup to complete
