/**
 * Netlify Scheduled Function: Retroactive Thumbnail Generation
 * Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
 * Purpose: Daily job to generate thumbnails for existing slides without them
 *
 * Schedule: Daily at 2:00 AM UTC (low traffic time)
 * Configuration: Defined in netlify.toml
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@/lib/supabase/service-role';
import { initiateThumbnailGeneration } from '@/services/cloudConvertService';
import { hasQuotaAvailable } from '@/services/thumbnailQuotaService';

interface SlideToProcess {
  id: string;
  tenant_id: string;
  speech_id: string;
  event_id: string;
  storage_path: string;
  mime_type: string;
}

interface ProcessingResult {
  total_slides: number;
  processed: number;
  skipped: number;
  failed: number;
  quota_exhausted: number;
  errors: string[];
}

/**
 * Configuration
 */
const CONFIG = {
  // Maximum slides to process per run (prevent long-running functions)
  MAX_SLIDES_PER_RUN: 50,

  // Maximum slides to process per tenant (fairness across tenants)
  MAX_SLIDES_PER_TENANT: 10,

  // Delay between processing slides (ms) to avoid rate limiting
  PROCESSING_DELAY_MS: 2000,

  // Maximum age of slides to process (30 days)
  MAX_SLIDE_AGE_DAYS: 30,
};

/**
 * Main Scheduled Function Handler
 * Runs daily at 2:00 AM UTC
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  console.log('[Scheduled Thumbnail Generation] Starting...');

  const startTime = Date.now();
  const result: ProcessingResult = {
    total_slides: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    quota_exhausted: 0,
    errors: [],
  };

  try {
    // Step 1: Query eligible slides
    const eligibleSlides = await getEligibleSlides();
    result.total_slides = eligibleSlides.length;

    console.log(`[Scheduled Thumbnail Generation] Found ${eligibleSlides.length} eligible slides`);

    if (eligibleSlides.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No eligible slides found',
          result,
          duration_ms: Date.now() - startTime,
        }),
      };
    }

    // Step 2: Group slides by tenant for quota management
    const slidesByTenant = groupSlidesByTenant(eligibleSlides);

    // Step 3: Process slides tenant by tenant
    for (const [tenantId, slides] of Object.entries(slidesByTenant)) {
      console.log(`[Scheduled Thumbnail Generation] Processing ${slides.length} slides for tenant ${tenantId}`);

      // Check tenant quota before processing
      const hasQuota = await hasQuotaAvailable(tenantId);
      if (!hasQuota) {
        console.log(`[Scheduled Thumbnail Generation] Tenant ${tenantId} has no quota remaining, skipping`);
        result.skipped += slides.length;
        continue;
      }

      // Process slides for this tenant (up to MAX_SLIDES_PER_TENANT)
      const slidesToProcess = slides.slice(0, CONFIG.MAX_SLIDES_PER_TENANT);

      for (const slide of slidesToProcess) {
        // Check if we've exceeded max slides per run
        if (result.processed >= CONFIG.MAX_SLIDES_PER_RUN) {
          console.log(`[Scheduled Thumbnail Generation] Reached max slides per run (${CONFIG.MAX_SLIDES_PER_RUN}), stopping`);
          result.skipped += slidesByTenant[tenantId].length - result.processed;
          break;
        }

        try {
          // Initiate thumbnail generation
          const generationResult = await initiateThumbnailGeneration({
            slideId: slide.id,
            tenantId: slide.tenant_id,
            eventId: slide.event_id,
          });

          if (generationResult.success) {
            result.processed++;
            console.log(`[Scheduled Thumbnail Generation] ✓ Processed slide ${slide.id} (${generationResult.status})`);
          } else {
            if (generationResult.status === 'quota_exhausted') {
              result.quota_exhausted++;
              console.log(`[Scheduled Thumbnail Generation] ⚠ Quota exhausted for tenant ${tenantId}, moving to next tenant`);
              break; // Move to next tenant
            } else {
              result.failed++;
              result.errors.push(`Slide ${slide.id}: ${generationResult.message}`);
              console.error(`[Scheduled Thumbnail Generation] ✗ Failed to process slide ${slide.id}: ${generationResult.message}`);
            }
          }

          // Add delay to avoid rate limiting
          if (CONFIG.PROCESSING_DELAY_MS > 0) {
            await sleep(CONFIG.PROCESSING_DELAY_MS);
          }
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Slide ${slide.id}: ${errorMessage}`);
          console.error(`[Scheduled Thumbnail Generation] ✗ Error processing slide ${slide.id}:`, error);
        }
      }
    }

    const durationMs = Date.now() - startTime;

    console.log('[Scheduled Thumbnail Generation] Completed', {
      ...result,
      duration_ms: durationMs,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Scheduled thumbnail generation completed',
        result,
        duration_ms: durationMs,
      }),
    };
  } catch (error) {
    console.error('[Scheduled Thumbnail Generation] Fatal error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'SCHEDULED_FUNCTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        result,
        duration_ms: Date.now() - startTime,
      }),
    };
  }
};

/**
 * Query eligible slides for retroactive thumbnail generation
 *
 * Criteria:
 * - Slide is not deleted
 * - Slide has no thumbnail (thumbnail_r2_key is null)
 * - Slide status is not 'processing' or 'completed'
 * - Slide file type is supported (PPT/PPTX/PDF)
 * - Event has thumbnail generation enabled
 * - Slide was created within MAX_SLIDE_AGE_DAYS
 * - Event is not in the past (optional: can be removed if retroactive for past events is desired)
 */
async function getEligibleSlides(): Promise<SlideToProcess[]> {
  const supabase = createClient();

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.MAX_SLIDE_AGE_DAYS);

  const { data: slides, error } = await supabase
    .from('slides')
    .select(
      `
      id,
      tenant_id,
      speech_id,
      storage_path,
      mime_type,
      speeches!inner (
        session_id,
        sessions!inner (
          event_id,
          events!inner (
            thumbnail_generation_enabled,
            event_date
          )
        )
      )
    `
    )
    .is('deleted_at', null)
    .is('thumbnail_r2_key', null)
    .or('thumbnail_status.is.null,thumbnail_status.eq.none,thumbnail_status.eq.failed')
    .in('mime_type', [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf',
    ])
    .gte('created_at', cutoffDate.toISOString())
    .limit(CONFIG.MAX_SLIDES_PER_RUN * 2); // Fetch more than needed for filtering

  if (error) {
    console.error('[Scheduled Thumbnail Generation] Error querying eligible slides:', error);
    throw error;
  }

  if (!slides || slides.length === 0) {
    return [];
  }

  // Filter slides where event has thumbnail generation enabled
  const eligibleSlides: SlideToProcess[] = slides
    .filter((slide: any) => {
      const event = slide.speeches?.sessions?.events;
      return event?.thumbnail_generation_enabled === true;
    })
    .map((slide: any) => ({
      id: slide.id,
      tenant_id: slide.tenant_id,
      speech_id: slide.speech_id,
      event_id: slide.speeches.sessions.event_id,
      storage_path: slide.storage_path,
      mime_type: slide.mime_type,
    }));

  return eligibleSlides;
}

/**
 * Group slides by tenant for quota management
 */
function groupSlidesByTenant(
  slides: SlideToProcess[]
): Record<string, SlideToProcess[]> {
  const grouped: Record<string, SlideToProcess[]> = {};

  for (const slide of slides) {
    if (!grouped[slide.tenant_id]) {
      grouped[slide.tenant_id] = [];
    }
    grouped[slide.tenant_id].push(slide);
  }

  return grouped;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
