/**
 * useThumbnailProgress Hook
 * Feature: 009-voglio-implementare-la (CloudConvert Thumbnail Generation)
 * Purpose: Subscribe to real-time thumbnail generation progress updates
 */

import { useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface ThumbnailUpdate {
  slide_id: string;
  thumbnail_status: 'pending' | 'processing' | 'completed' | 'failed' | 'none';
  thumbnail_r2_key: string | null;
  thumbnail_generated_at: string | null;
}

export interface UseThumbnailProgressOptions {
  /**
   * Event ID to filter slide updates (recommended for better performance)
   */
  eventId?: string;

  /**
   * Speech IDs to filter slide updates (use when watching specific speeches)
   */
  speechIds?: string[];

  /**
   * Callback when thumbnail status changes
   */
  onUpdate?: (update: ThumbnailUpdate) => void;

  /**
   * Callback when subscription encounters an error
   */
  onError?: (error: Error) => void;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Subscribe to real-time thumbnail generation progress updates
 *
 * This hook uses Supabase Realtime to listen for changes to the slides table,
 * specifically for thumbnail_status and thumbnail_r2_key updates.
 *
 * @example
 * ```typescript
 * // In DashboardSessionsSpeeches component
 * useThumbnailProgress({
 *   eventId: eventId,
 *   onUpdate: (update) => {
 *     // Update local speech state
 *     setSpeeches(prevSpeeches =>
 *       prevSpeeches.map(speech => {
 *         const updatedSlide = speech.slides?.find(s => s.id === update.slide_id);
 *         if (updatedSlide) {
 *           return {
 *             ...speech,
 *             thumbnail_status: update.thumbnail_status,
 *             first_slide_thumbnail: update.thumbnail_r2_key,
 *           };
 *         }
 *         return speech;
 *       })
 *     );
 *   },
 *   debug: true,
 * });
 * ```
 */
export function useThumbnailProgress(options: UseThumbnailProgressOptions = {}) {
  const { eventId, speechIds, onUpdate, onError, debug = false } = options;

  const supabaseRef = useRef(createClientComponentClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (debug) {
        console.log(`[useThumbnailProgress] ${message}`, ...args);
      }
    },
    [debug]
  );

  useEffect(() => {
    // Skip if no update callback provided
    if (!onUpdate) {
      log('No onUpdate callback provided, skipping subscription');
      return;
    }

    const supabase = supabaseRef.current;

    // Create unique channel name based on filters
    const channelName = eventId
      ? `thumbnail-progress-event-${eventId}`
      : speechIds
      ? `thumbnail-progress-speeches-${speechIds.join('-')}`
      : 'thumbnail-progress-global';

    log('Setting up Realtime subscription', { channelName, eventId, speechIds });

    // Create Realtime channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'slides',
          filter: eventId
            ? `speeches.sessions.event_id=eq.${eventId}`
            : undefined, // Filter by event if provided
        },
        (payload) => {
          log('Received slide update', payload);

          // Extract updated fields
          const newData = payload.new as any;

          // Only process if thumbnail-related fields changed
          const thumbnailFieldsChanged =
            'thumbnail_status' in newData ||
            'thumbnail_r2_key' in newData ||
            'thumbnail_generated_at' in newData;

          if (!thumbnailFieldsChanged) {
            log('Non-thumbnail update, ignoring');
            return;
          }

          // If speechIds filter provided, check if slide belongs to one of the speeches
          if (speechIds && speechIds.length > 0) {
            if (!speechIds.includes(newData.speech_id)) {
              log('Slide not in filtered speechIds, ignoring');
              return;
            }
          }

          // Construct update object
          const update: ThumbnailUpdate = {
            slide_id: newData.id,
            thumbnail_status: newData.thumbnail_status,
            thumbnail_r2_key: newData.thumbnail_r2_key,
            thumbnail_generated_at: newData.thumbnail_generated_at,
          };

          log('Calling onUpdate with', update);
          onUpdate(update);
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          log('Successfully subscribed to Realtime channel');
        } else if (status === 'CHANNEL_ERROR' && error) {
          log('Channel error', error);
          if (onError) {
            onError(new Error(`Realtime channel error: ${error.message}`));
          }
        } else if (status === 'TIMED_OUT') {
          log('Subscription timed out');
          if (onError) {
            onError(new Error('Realtime subscription timed out'));
          }
        } else if (status === 'CLOSED') {
          log('Channel closed');
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      log('Cleaning up Realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [eventId, speechIds, onUpdate, onError, log]);

  // Return cleanup function for manual unsubscribe (optional)
  return useCallback(() => {
    if (channelRef.current) {
      log('Manual cleanup triggered');
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [log]);
}

/**
 * Alternative hook for tracking single slide thumbnail progress
 * Useful for dedicated slide detail pages
 */
export function useSlideThumbnailProgress(
  slideId: string,
  onUpdate?: (update: ThumbnailUpdate) => void
) {
  const supabaseRef = useRef(createClientComponentClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!onUpdate || !slideId) return;

    const supabase = supabaseRef.current;
    const channelName = `thumbnail-progress-slide-${slideId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'slides',
          filter: `id=eq.${slideId}`,
        },
        (payload) => {
          const newData = payload.new as any;

          // Only process if thumbnail-related fields changed
          const thumbnailFieldsChanged =
            'thumbnail_status' in newData ||
            'thumbnail_r2_key' in newData ||
            'thumbnail_generated_at' in newData;

          if (!thumbnailFieldsChanged) return;

          const update: ThumbnailUpdate = {
            slide_id: newData.id,
            thumbnail_status: newData.thumbnail_status,
            thumbnail_r2_key: newData.thumbnail_r2_key,
            thumbnail_generated_at: newData.thumbnail_generated_at,
          };

          onUpdate(update);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [slideId, onUpdate]);
}
