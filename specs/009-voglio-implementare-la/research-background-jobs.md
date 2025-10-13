# Research: Background Job Patterns for Retroactive Thumbnail Generation

**Feature**: 009-voglio-implementare-la (Thumbnail Generation)
**Date**: 2025-10-13
**Context**: Serverless architecture (Netlify Functions + Next.js API Routes + Cloudflare R2)

## Executive Summary

This research explores background job patterns for retroactively generating thumbnails for existing slides when an event admin enables the thumbnail feature. The solution must work within serverless constraints (10-second function timeout, stateless execution) while providing progress tracking and error recovery.

**Recommended Approach**: Database-driven queue with incremental processing via scheduled Netlify functions, combined with real-time progress tracking using Supabase Realtime subscriptions.

---

## 1. Queue Management for Batch Processing Existing Slides

### Decision: Database-as-Queue Pattern

**Rationale**:
- Serverless environments lack persistent in-memory queues (Redis, RabbitMQ)
- Supabase PostgreSQL already available and scales well for moderate throughput
- Natural fit with existing thumbnail_status column ('pending', 'processing', 'completed', 'failed')
- No additional infrastructure costs or complexity

**Implementation Pattern**:

```sql
-- Queue query: Get next batch of slides needing thumbnails
SELECT id, r2_key, mime_type, speech_id, session_id, tenant_id
FROM slides
WHERE thumbnail_status = 'pending'
  AND deleted_at IS NULL
  AND r2_key IS NOT NULL
ORDER BY uploaded_at ASC  -- FIFO processing
LIMIT 50;  -- Process 50 slides per batch
```

**Queue State Machine**:
```
pending → processing → completed
    ↓
  failed (with retry logic)
```

**Key Benefits**:
- Existing slides automatically queued when thumbnail_status defaults to 'pending'
- Atomic state transitions via database transactions
- Built-in persistence and crash recovery
- Query flexibility for filtering by event, session, or tenant

**Alternatives Considered**:
1. **External Queue Service (AWS SQS/Redis)**:
   - **Rejected**: Adds infrastructure cost and complexity
   - **Rejected**: Requires additional authentication and network latency
   - **Rejected**: Overkill for estimated throughput (250 slides/week)

2. **In-Memory Queue in Netlify Function**:
   - **Rejected**: Stateless serverless functions lose state between invocations
   - **Rejected**: Cannot survive function cold starts or crashes

---

## 2. Incremental Processing Patterns (Only Slides Without Thumbnails)

### Decision: Status-Based Incremental Processing with Batching

**Rationale**:
- Avoids reprocessing slides that already have thumbnails
- Respects Netlify Function timeout (10 seconds per invocation)
- Allows graceful recovery from failures without losing progress

**Implementation Pattern**:

```typescript
// Scheduled function runs every 5 minutes
export async function POST(request: NextRequest) {
  const BATCH_SIZE = 50; // Process 50 slides per run
  const TIMEOUT_BUFFER_MS = 2000; // Reserve 2s for cleanup
  const startTime = Date.now();

  // Step 1: Query pending slides with row-level locking
  const { data: pendingSlides } = await supabase
    .from('slides')
    .select('id, r2_key, mime_type, file_size')
    .eq('thumbnail_status', 'pending')
    .is('deleted_at', null)
    .not('r2_key', 'is', null)
    .order('uploaded_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (!pendingSlides || pendingSlides.length === 0) {
    return NextResponse.json({ message: 'No pending thumbnails' });
  }

  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  // Step 2: Process slides one by one until timeout
  for (const slide of pendingSlides) {
    // Check timeout (leave 2s buffer for cleanup)
    if (Date.now() - startTime > (10000 - TIMEOUT_BUFFER_MS)) {
      console.log(`Timeout approaching, stopping at ${processedCount} slides`);
      break;
    }

    try {
      // Mark as processing (prevents duplicate processing)
      await supabase
        .from('slides')
        .update({ thumbnail_status: 'processing' })
        .eq('id', slide.id);

      // Generate thumbnail (async API call)
      const thumbnailBuffer = await generateThumbnail(slide);

      // Upload to R2
      const thumbnailKey = slide.r2_key.replace(/\.(pdf|pptx?)$/i, '-thumb.jpg');
      await R2.uploadFile(thumbnailKey, thumbnailBuffer, 'image/jpeg');

      // Mark as completed
      await supabase
        .from('slides')
        .update({
          thumbnail_status: 'completed',
          thumbnail_r2_key: thumbnailKey,
          thumbnail_generated_at: new Date().toISOString(),
        })
        .eq('id', slide.id);

      successCount++;
    } catch (error) {
      errorCount++;

      // Mark as failed (will be retried later)
      await supabase
        .from('slides')
        .update({
          thumbnail_status: 'failed',
          thumbnail_error: error.message,
        })
        .eq('id', slide.id);
    }

    processedCount++;
  }

  return NextResponse.json({
    processed: processedCount,
    success: successCount,
    errors: errorCount,
    remaining: pendingSlides.length - processedCount,
  });
}
```

**Incremental Processing Strategy**:
- Query only slides with `thumbnail_status = 'pending'`
- Process in FIFO order (oldest uploads first)
- Mark slides as 'processing' immediately to avoid duplicate work
- Continue until timeout buffer reached (2 seconds before hard limit)
- Next scheduled run picks up remaining slides

**Key Benefits**:
- No reprocessing of completed thumbnails
- Graceful handling of partial batches
- Automatic resume on next scheduled run
- Clear progress tracking via status column

**Edge Cases**:
1. **Stale 'processing' status** (function crashed mid-batch):
   - **Solution**: Background cleanup job resets 'processing' → 'pending' after 15 minutes
   ```sql
   UPDATE slides
   SET thumbnail_status = 'pending'
   WHERE thumbnail_status = 'processing'
     AND updated_at < NOW() - INTERVAL '15 minutes';
   ```

2. **Failed thumbnail generation**:
   - **Solution**: Mark as 'failed', retry with exponential backoff (3 attempts max)
   - **Solution**: Manual retry via admin UI button

---

## 3. Progress Tracking UI for Admin Visibility

### Decision: Supabase Realtime + Database-Driven Progress Counter

**Rationale**:
- Supabase Realtime provides built-in WebSocket pub/sub (no extra cost)
- Database aggregation queries give accurate progress counts
- Admin UI updates in real-time without polling
- Compatible with serverless architecture (no persistent connections needed)

**Implementation Pattern**:

**Backend: Progress API Endpoint**
```typescript
// GET /api/thumbnails/progress?event_id={eventId}
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get('event_id');

  // Aggregate thumbnail status for event
  const { data: statusCounts } = await supabase
    .from('slides')
    .select('thumbnail_status')
    .eq('event_id', eventId)
    .is('deleted_at', null);

  const counts = {
    total: statusCounts.length,
    pending: statusCounts.filter(s => s.thumbnail_status === 'pending').length,
    processing: statusCounts.filter(s => s.thumbnail_status === 'processing').length,
    completed: statusCounts.filter(s => s.thumbnail_status === 'completed').length,
    failed: statusCounts.filter(s => s.thumbnail_status === 'failed').length,
  };

  return NextResponse.json({
    ...counts,
    progress_percentage: Math.round((counts.completed / counts.total) * 100),
    estimated_time_remaining_seconds: counts.pending * 2, // 2s per thumbnail avg
  });
}
```

**Frontend: Real-Time Progress Component**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ThumbnailProgressProps {
  eventId: string;
}

export default function ThumbnailProgress({ eventId }: ThumbnailProgressProps) {
  const supabase = createClientComponentClient();
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    percentage: 0,
  });

  useEffect(() => {
    // Initial fetch
    fetchProgress();

    // Subscribe to slide updates via Realtime
    const subscription = supabase
      .channel(`thumbnails-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'slides',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Slide updated:', payload);
          fetchProgress(); // Refresh counts
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  async function fetchProgress() {
    const res = await fetch(`/api/thumbnails/progress?event_id=${eventId}`);
    const data = await res.json();
    setProgress(data);
  }

  if (progress.total === 0) return null;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Thumbnail Generation Progress</h3>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{progress.completed} of {progress.total} thumbnails generated</span>
          <span>{progress.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <div className="font-bold text-yellow-800">{progress.pending}</div>
          <div className="text-yellow-600">Pending</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <div className="font-bold text-blue-800">{progress.processing}</div>
          <div className="text-blue-600">Processing</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <div className="font-bold text-green-800">{progress.completed}</div>
          <div className="text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <div className="font-bold text-red-800">{progress.failed}</div>
          <div className="text-red-600">Failed</div>
        </div>
      </div>

      {/* Retry Failed Button */}
      {progress.failed > 0 && (
        <button
          onClick={() => retryFailedThumbnails(eventId)}
          className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry {progress.failed} Failed Thumbnail{progress.failed !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
```

**Key Benefits**:
- Real-time updates without manual refresh
- Accurate progress tracking from database
- Minimal frontend complexity (Supabase Realtime handles WebSockets)
- No polling overhead (event-driven updates)

**Alternatives Considered**:
1. **Polling API every 5 seconds**:
   - **Rejected**: Unnecessary load on database and API endpoints
   - **Rejected**: Adds latency (5-second delay in updates)
   - **Selected for fallback**: Use as backup if Realtime subscription fails

2. **Server-Sent Events (SSE)**:
   - **Rejected**: Requires persistent connection in serverless (not ideal)
   - **Rejected**: Supabase Realtime already provides this functionality

---

## 4. Handling Failures Mid-Batch

### Decision: Idempotent Processing with Explicit Status Tracking

**Rationale**:
- Database status column (`thumbnail_status`) acts as single source of truth
- Failed thumbnails marked explicitly, never silently lost
- Retry logic built into scheduled function (automatic recovery)
- Admin UI provides manual retry for persistent failures

**Failure Recovery Patterns**:

**4.1 Function Timeout Mid-Batch**
```typescript
// Scheduled function handles graceful timeout
if (Date.now() - startTime > (10000 - TIMEOUT_BUFFER_MS)) {
  console.log('Timeout approaching, stopping batch');

  // Log progress before exit
  await logBatchProgress({
    processed: processedCount,
    remaining: pendingSlides.length - processedCount,
    next_run: new Date(Date.now() + 300000).toISOString(), // 5 min
  });

  return NextResponse.json({ status: 'partial', processed: processedCount });
}
```
**Recovery**: Next scheduled run (5 minutes later) picks up remaining slides

**4.2 External API Failure (Thumbnail Generation Service)**
```typescript
try {
  const thumbnailBuffer = await generateThumbnail(slide);
} catch (error) {
  // Mark as failed with error details
  await supabase
    .from('slides')
    .update({
      thumbnail_status: 'failed',
      thumbnail_error: error.message,
      retry_count: supabase.rpc('increment_retry_count', { slide_id: slide.id }),
    })
    .eq('id', slide.id);

  // Continue processing other slides (don't block entire batch)
  continue;
}
```
**Recovery**:
- Automatic retry after 15 minutes if `retry_count < 3`
- Manual retry via admin UI button

**4.3 R2 Upload Failure**
```typescript
try {
  await R2.uploadFile(thumbnailKey, thumbnailBuffer, 'image/jpeg');
} catch (error) {
  // Rollback: Delete partial thumbnail if exists
  await R2.deleteObject(thumbnailKey).catch(() => {});

  // Mark as failed
  await supabase
    .from('slides')
    .update({ thumbnail_status: 'failed', thumbnail_error: 'R2 upload failed' })
    .eq('id', slide.id);
}
```
**Recovery**: Automatic retry on next scheduled run

**4.4 Database Connection Lost**
```typescript
// Scheduled function handles database errors gracefully
try {
  await processBatch();
} catch (error) {
  if (error.message.includes('connection') || error.code === 'ECONNREFUSED') {
    console.error('Database connection lost, will retry on next run');

    // Return 500 to trigger Netlify retry logic
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }

  throw error; // Re-throw unexpected errors
}
```
**Recovery**: Netlify Functions automatically retry failed executions

**Idempotency Guarantees**:
1. **Status transitions are atomic** (database ACID properties)
2. **Processing marked immediately** (prevents duplicate work)
3. **Thumbnails stored with unique keys** (slide-{id}-thumb.jpg)
4. **Upsert pattern for R2 uploads** (retry overwrites partial upload)

**Monitoring & Alerting**:
```typescript
// Log failures to monitoring service
if (errorCount > BATCH_SIZE * 0.2) {
  // Alert if >20% of batch fails
  await sendAlert({
    type: 'high_thumbnail_failure_rate',
    errors: errorCount,
    batch_size: BATCH_SIZE,
    timestamp: new Date().toISOString(),
  });
}
```

---

## 5. Rate Limiting External API Calls During Batch Processing

### Decision: Token Bucket Algorithm with Database-Backed Counter

**Rationale**:
- Thumbnail generation may use external API (e.g., PDF-to-image conversion service)
- Must respect API rate limits (example: 100 requests/minute)
- Serverless stateless environment requires database-backed rate limiting
- Prevents API quota exhaustion and 429 errors

**Implementation Pattern**:

**5.1 Redis-Alternative with Supabase (Simple Counter)**
```sql
-- Create rate limiting table
CREATE TABLE api_rate_limits (
  api_name TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  max_requests_per_window INTEGER NOT NULL,
  window_duration_seconds INTEGER NOT NULL
);

-- Insert thumbnail API limits
INSERT INTO api_rate_limits (api_name, max_requests_per_window, window_duration_seconds)
VALUES ('thumbnail_generation', 100, 60); -- 100 req/min
```

**5.2 Rate Limit Check Function**
```typescript
async function checkRateLimit(apiName: string): Promise<boolean> {
  const { data: limit } = await supabase
    .from('api_rate_limits')
    .select('*')
    .eq('api_name', apiName)
    .single();

  if (!limit) return true; // No limit configured

  const windowStartTime = new Date(limit.window_start).getTime();
  const now = Date.now();
  const windowDurationMs = limit.window_duration_seconds * 1000;

  // Reset window if expired
  if (now - windowStartTime >= windowDurationMs) {
    await supabase
      .from('api_rate_limits')
      .update({
        request_count: 0,
        window_start: new Date().toISOString(),
      })
      .eq('api_name', apiName);

    return true; // New window, allow request
  }

  // Check if under limit
  return limit.request_count < limit.max_requests_per_window;
}

async function incrementRateLimit(apiName: string): Promise<void> {
  await supabase.rpc('increment_api_rate_limit', { api_name: apiName });
}
```

**5.3 Batch Processing with Rate Limiting**
```typescript
for (const slide of pendingSlides) {
  // Check rate limit before processing
  const withinLimit = await checkRateLimit('thumbnail_generation');

  if (!withinLimit) {
    console.log('Rate limit reached, stopping batch early');

    // Log remaining slides for next run
    await logPartialBatch({
      stopped_reason: 'rate_limit',
      remaining_slides: pendingSlides.length - processedCount,
    });

    break; // Stop batch, will resume on next scheduled run
  }

  try {
    // Generate thumbnail (counts toward rate limit)
    const thumbnailBuffer = await generateThumbnail(slide);

    // Increment rate limit counter
    await incrementRateLimit('thumbnail_generation');

    // Continue processing...
  } catch (error) {
    // Handle error...
  }
}
```

**5.4 Alternative: Delay-Based Rate Limiting (Simpler)**
```typescript
// Simple approach: Add delay between API calls
const REQUESTS_PER_MINUTE = 100;
const DELAY_MS = (60 / REQUESTS_PER_MINUTE) * 1000; // 600ms between requests

for (const slide of pendingSlides) {
  try {
    const thumbnailBuffer = await generateThumbnail(slide);

    // Wait before next API call
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  } catch (error) {
    // Handle error...
  }
}
```
**Trade-off**: Simpler but slower (guarantees 100 req/min but not faster)

**Rate Limiting Strategies by API Type**:

| API Service | Rate Limit | Strategy | Notes |
|-------------|------------|----------|-------|
| AWS Lambda (Thumbnail Gen) | 1000/min | Token Bucket (DB) | High throughput, need tracking |
| Cloudflare R2 | No limit | None | Free egress, no throttling |
| External PDF Service | 100/min | Delay-based | Simple, predictable |
| Supabase Database | 500/min | Built-in | Handled by connection pooler |

**Key Benefits**:
- Prevents API quota exhaustion
- Graceful degradation (stop batch early if limit reached)
- Database-backed state works in serverless
- Configurable limits per API service

**Alternatives Considered**:
1. **Redis for Rate Limiting**:
   - **Rejected**: Adds infrastructure cost and complexity
   - **Selected for high-throughput scenarios** (>1000 req/min)

2. **No Rate Limiting**:
   - **Rejected**: Risks API quota exhaustion and 429 errors
   - **Risk**: Could block all thumbnail generation for hours

---

## Architecture Decision Summary

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Admin UI (Next.js)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Enable Thumbnails Button                                │   │
│  │  → Updates event.thumbnails_enabled = true               │   │
│  │  → Sets all existing slides to thumbnail_status='pending'│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Progress Component (Real-Time)                          │   │
│  │  → Subscribes to Supabase Realtime (WebSocket)          │   │
│  │  → Updates progress bar as slides complete               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│        Netlify Scheduled Function (Every 5 minutes)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /api/thumbnails/batch-generate                     │   │
│  │  1. Query 50 pending slides (FIFO)                       │   │
│  │  2. Mark each as 'processing'                            │   │
│  │  3. Generate thumbnail (external API)                    │   │
│  │  4. Upload to R2                                         │   │
│  │  5. Mark as 'completed' or 'failed'                      │   │
│  │  6. Respect 10s timeout, 2s buffer                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  Rate Limiting: Check DB counter before API call                │
│  Idempotency: Status transitions atomic via DB                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL (Queue)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  slides table:                                           │   │
│  │  - thumbnail_status: 'pending' | 'processing' |          │   │
│  │                      'completed' | 'failed'              │   │
│  │  - thumbnail_r2_key: 'tenant-X/event-Y/slide-Z-thumb.jpg'│  │
│  │  - retry_count: 0-3                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Realtime: Publishes UPDATE events to subscribed clients         │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare R2 (Storage)                       │
│  - Original: tenant-X/event-Y/slide-Z.pdf                       │
│  - Thumbnail: tenant-X/event-Y/slide-Z-thumb.jpg                │
│  - Cleanup: Handled by existing 48h retention job               │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Phases

**Phase 1: Core Queue Processing** (2-3 days)
- [ ] Create `POST /api/thumbnails/batch-generate` scheduled function
- [ ] Implement database-as-queue pattern (query pending slides)
- [ ] Add status transitions (pending → processing → completed/failed)
- [ ] Configure Netlify scheduled trigger (every 5 minutes)
- [ ] Test with 10 slides, verify idempotency

**Phase 2: Progress Tracking UI** (1-2 days)
- [ ] Create `GET /api/thumbnails/progress?event_id={id}` endpoint
- [ ] Build `ThumbnailProgress` React component with Realtime subscription
- [ ] Add progress bar to admin event dashboard
- [ ] Test real-time updates during batch processing

**Phase 3: Error Handling & Retries** (1-2 days)
- [ ] Implement retry logic (exponential backoff, max 3 attempts)
- [ ] Add stale 'processing' cleanup job (resets after 15 min)
- [ ] Build "Retry Failed" button in admin UI
- [ ] Add error logging and monitoring

**Phase 4: Rate Limiting** (1 day)
- [ ] Create `api_rate_limits` table in Supabase
- [ ] Implement `checkRateLimit()` and `incrementRateLimit()` functions
- [ ] Add rate limit checks to batch processing loop
- [ ] Test with high-throughput scenarios

**Phase 5: Testing & Optimization** (1-2 days)
- [ ] Load test with 500+ slides
- [ ] Verify 10s timeout handling
- [ ] Optimize batch size (50 slides → 100 slides if timeout allows)
- [ ] Measure cost (Netlify function minutes, external API calls)

**Total Estimated Time**: 6-10 days

---

## Rationale: Why This Architecture Handles Serverless Constraints

### Constraint 1: 10-Second Function Timeout
**Solution**: Batch processing with explicit timeout buffer
- Process up to 50 slides per invocation (~0.2s per slide = 10s total)
- Reserve 2-second buffer for cleanup and database writes
- Next scheduled run picks up remaining slides (no data loss)

### Constraint 2: Stateless Execution
**Solution**: Database-as-queue with explicit status tracking
- Supabase PostgreSQL persists queue state between invocations
- No in-memory queues needed (Redis, RabbitMQ)
- Status column prevents duplicate processing

### Constraint 3: No Persistent Connections (WebSockets)
**Solution**: Supabase Realtime for progress updates
- Managed WebSocket service (no custom server needed)
- Handles connection lifecycle automatically
- Falls back to polling if WebSocket unavailable

### Constraint 4: Cost Optimization
**Solution**: Scheduled functions + database polling
- Runs every 5 minutes (288 invocations/day)
- Only processes slides needing thumbnails (incremental)
- Total cost: ~$0.10/month for 250 slides/week (Netlify free tier)

### Constraint 5: Unpredictable Traffic
**Solution**: Rate limiting + backpressure
- Database rate limiting prevents API quota exhaustion
- Batch processing respects timeout (graceful degradation)
- Admin UI shows progress (sets expectations)

---

## Alternatives Considered

### Alternative 1: Netlify Background Functions (15-minute timeout)
**Approach**: Single long-running function processes all slides
**Rejected Because**:
- Limited to Credit-based plans (Pro/Enterprise)
- No client feedback during execution (202 empty response)
- Harder to monitor progress mid-execution
- Risk of hitting 15-minute limit with large batches (>400 slides)

### Alternative 2: AWS Step Functions Orchestration
**Approach**: Step Functions orchestrate Lambda functions for each slide
**Rejected Because**:
- Adds AWS dependency (complicates architecture)
- Additional cost (~$0.025 per 1000 state transitions)
- Overkill for moderate throughput (250 slides/week)
- Requires cross-platform authentication (Netlify ↔ AWS)

**Selected When**: Processing >1000 slides/day or need complex orchestration

### Alternative 3: Client-Side Thumbnail Generation
**Approach**: Browser generates thumbnails using Canvas API
**Rejected Because**:
- Cannot process PDFs/PPTX reliably in browser
- Requires large client-side libraries (PDF.js = 1MB+)
- Unreliable for large files (browser crashes)
- Security concerns (access to raw file data)

### Alternative 4: Supabase Database Triggers (pg_cron)
**Approach**: PostgreSQL cron job processes queue directly
**Rejected Because**:
- Cannot call external APIs from Postgres (thumbnail generation service)
- Cannot interact with R2 (no S3 client in Postgres)
- Supabase Free tier doesn't support pg_cron extensions

**Selected When**: Pure database operations (e.g., cleanup old records)

---

## Implementation Notes

### Queue Structure

**Database Schema (Already Exists)**:
```sql
-- From migration 20250113_add_slide_thumbnails.sql
ALTER TABLE slides
  ADD COLUMN thumbnail_r2_key TEXT NULL,
  ADD COLUMN thumbnail_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN thumbnail_generated_at TIMESTAMPTZ NULL,
  ADD CONSTRAINT slides_thumbnail_status_check CHECK (
    thumbnail_status IN ('pending', 'processing', 'completed', 'failed')
  );

-- Index for efficient queue queries
CREATE INDEX idx_slides_thumbnail_status
ON slides(thumbnail_status)
WHERE deleted_at IS NULL;
```

**Queue Query Pattern**:
```typescript
// Efficient FIFO query with PostgreSQL
const { data: pendingSlides } = await supabase
  .from('slides')
  .select('id, r2_key, mime_type, file_size, speech_id, tenant_id')
  .eq('thumbnail_status', 'pending')
  .is('deleted_at', null)
  .not('r2_key', 'is', null)
  .order('uploaded_at', { ascending: true })
  .limit(BATCH_SIZE);
```

### Progress Tracking

**Real-Time Subscription (Supabase Realtime)**:
```typescript
// Frontend component subscribes to slide updates
const subscription = supabase
  .channel(`thumbnails-${eventId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'slides',
      filter: `event_id=eq.${eventId}`,
    },
    (payload) => {
      // Update progress bar in real-time
      fetchProgress();
    }
  )
  .subscribe();
```

**Polling Fallback** (if Realtime unavailable):
```typescript
// Poll every 10 seconds as backup
useEffect(() => {
  const interval = setInterval(() => {
    if (!realtimeConnected) {
      fetchProgress();
    }
  }, 10000);

  return () => clearInterval(interval);
}, [realtimeConnected]);
```

### Error Handling

**Retry Logic with Exponential Backoff**:
```typescript
async function retryThumbnailGeneration(slideId: string, retryCount: number) {
  const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
  await new Promise(resolve => setTimeout(resolve, backoffMs));

  try {
    await generateAndUploadThumbnail(slideId);
  } catch (error) {
    if (retryCount < 3) {
      await retryThumbnailGeneration(slideId, retryCount + 1);
    } else {
      // Max retries reached, mark as permanently failed
      await supabase
        .from('slides')
        .update({
          thumbnail_status: 'failed',
          thumbnail_error: 'Max retries exceeded',
        })
        .eq('id', slideId);
    }
  }
}
```

**Stale Processing Cleanup** (runs every 15 minutes):
```typescript
// Separate scheduled function: /api/thumbnails/cleanup-stale
export async function POST() {
  const { data: staleSlides } = await supabase
    .from('slides')
    .select('id')
    .eq('thumbnail_status', 'processing')
    .lt('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

  if (staleSlides && staleSlides.length > 0) {
    await supabase
      .from('slides')
      .update({ thumbnail_status: 'pending' })
      .in('id', staleSlides.map(s => s.id));

    console.log(`Reset ${staleSlides.length} stale processing slides`);
  }

  return NextResponse.json({ reset_count: staleSlides?.length || 0 });
}
```

### Rate Limiting

**Database-Backed Token Bucket**:
```sql
-- Rate limiting table
CREATE TABLE api_rate_limits (
  api_name TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  max_requests_per_window INTEGER NOT NULL,
  window_duration_seconds INTEGER NOT NULL
);

-- Function to increment counter
CREATE OR REPLACE FUNCTION increment_api_rate_limit(api_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE api_rate_limits
  SET request_count = request_count + 1
  WHERE api_name = api_name;
END;
$$ LANGUAGE plpgsql;
```

**Rate Limit Check in Batch Loop**:
```typescript
for (const slide of pendingSlides) {
  // Check rate limit before API call
  const withinLimit = await checkRateLimit('thumbnail_generation');

  if (!withinLimit) {
    console.log('Rate limit reached, stopping batch early');
    break; // Will resume on next scheduled run (5 min)
  }

  // Proceed with thumbnail generation...
  const thumbnailBuffer = await generateThumbnail(slide);
  await incrementRateLimit('thumbnail_generation');
}
```

---

## Cost Analysis

### Netlify Functions Usage
- **Scheduled Function**: Runs every 5 minutes = 288 invocations/day
- **Function Duration**: ~8 seconds per invocation (50 slides × 0.16s each)
- **Monthly Invocations**: 288 × 30 = 8,640 invocations
- **Monthly Function Minutes**: (8,640 × 8s) / 60 = 1,152 minutes
- **Netlify Pro Plan**: 100,000 function minutes/month included
- **Cost**: $0 (within free tier)

### External API Costs (Thumbnail Generation)
- **API**: Example: PDF-to-image conversion service
- **Rate**: $0.001 per thumbnail (100 free per month)
- **Monthly Volume**: 250 slides/week × 4 weeks = 1,000 thumbnails
- **Cost**: (1,000 - 100) × $0.001 = $0.90/month

### Cloudflare R2 Storage
- **Storage**: Thumbnail size ~50KB each
- **Monthly Volume**: 1,000 thumbnails × 50KB = 50MB
- **Retention**: 48 hours average
- **R2 Free Tier**: 10GB storage, 1M Class A operations, free egress
- **Cost**: $0 (within free tier)

### Supabase Database
- **Additional Queries**: ~500 status updates/day
- **Realtime Connections**: ~10 concurrent admin connections
- **Supabase Free Tier**: 500MB storage, unlimited API requests
- **Cost**: $0 (within free tier)

### Total Monthly Cost
- **Netlify Functions**: $0
- **External API**: $0.90
- **R2 Storage**: $0
- **Supabase**: $0
- **Total**: ~$0.90/month

**Cost per Thumbnail**: $0.0009 (~0.09 cents)

---

## Testing Strategy

### Unit Tests
```typescript
// Test rate limiting logic
describe('checkRateLimit', () => {
  it('allows request within limit', async () => {
    const allowed = await checkRateLimit('test_api');
    expect(allowed).toBe(true);
  });

  it('blocks request over limit', async () => {
    // Simulate 100 requests
    for (let i = 0; i < 100; i++) {
      await incrementRateLimit('test_api');
    }

    const allowed = await checkRateLimit('test_api');
    expect(allowed).toBe(false);
  });
});

// Test status transitions
describe('processThumbnail', () => {
  it('transitions pending → processing → completed', async () => {
    const slide = await createTestSlide({ thumbnail_status: 'pending' });

    await processThumbnail(slide.id);

    const updatedSlide = await getSlide(slide.id);
    expect(updatedSlide.thumbnail_status).toBe('completed');
    expect(updatedSlide.thumbnail_r2_key).toBeTruthy();
  });
});
```

### Integration Tests
```typescript
// Test full batch processing
describe('POST /api/thumbnails/batch-generate', () => {
  it('processes 50 slides within 10s timeout', async () => {
    const slides = await createTestSlides(50, { thumbnail_status: 'pending' });

    const startTime = Date.now();
    const response = await fetch('/api/thumbnails/batch-generate', { method: 'POST' });
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(10000);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.processed).toBe(50);
  });
});

// Test Realtime progress updates
describe('ThumbnailProgress component', () => {
  it('updates progress bar on status change', async () => {
    const slide = await createTestSlide({ thumbnail_status: 'pending' });
    render(<ThumbnailProgress eventId={slide.event_id} />);

    // Simulate status update
    await updateSlideStatus(slide.id, 'completed');

    // Wait for Realtime subscription to trigger
    await waitFor(() => {
      expect(screen.getByText(/1 of 1 thumbnails generated/)).toBeInTheDocument();
    });
  });
});
```

### Load Tests
```bash
# Simulate 500 slides needing thumbnails
./scripts/load-test-thumbnails.sh 500

# Expected results:
# - All 500 thumbnails generated
# - Total time: ~50 minutes (10 runs × 5 min interval)
# - Zero failures (or <5% failure rate)
# - Database performance stable (query time <100ms)
```

---

## Monitoring & Observability

### Key Metrics to Track
1. **Queue Depth**: Number of pending slides
2. **Processing Rate**: Slides processed per minute
3. **Failure Rate**: % of failed thumbnail generations
4. **API Rate Limit Usage**: Current request count vs limit
5. **Function Execution Time**: Time per batch (must be <10s)

### Logging Strategy
```typescript
// Structured logging in scheduled function
console.log(JSON.stringify({
  event: 'batch_complete',
  processed: processedCount,
  success: successCount,
  errors: errorCount,
  duration_ms: Date.now() - startTime,
  remaining_queue_depth: pendingSlides.length - processedCount,
  timestamp: new Date().toISOString(),
}));
```

### Alerts to Configure
1. **High Failure Rate**: Alert if >20% of batch fails
2. **Queue Backlog**: Alert if pending queue >500 slides
3. **Function Timeout**: Alert if execution time >9 seconds
4. **API Rate Limit Hit**: Alert if rate limit reached

---

## Conclusion

**Recommended Architecture**: Database-driven queue with scheduled batch processing via Netlify Functions, combined with Supabase Realtime for progress tracking.

**Key Advantages**:
- ✅ Works within serverless constraints (10s timeout, stateless)
- ✅ Automatic resume on failure (idempotent processing)
- ✅ Real-time progress tracking (Supabase Realtime)
- ✅ Cost-effective (~$0.90/month for 1000 thumbnails)
- ✅ No additional infrastructure (Redis, SQS, etc.)
- ✅ Graceful handling of rate limits and timeouts
- ✅ Admin visibility with retry capabilities

**Next Steps**:
1. Implement core queue processing (Phase 1)
2. Add progress tracking UI (Phase 2)
3. Build error handling and retries (Phase 3)
4. Add rate limiting (Phase 4)
5. Load test and optimize (Phase 5)

---

**References**:
- Netlify Scheduled Functions: https://docs.netlify.com/functions/scheduled-functions/
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Database-as-Queue Pattern: https://blog.cloudcraft.co/aws-architecture-pattern-for-scheduled-serverless-batch-processing/
- Token Bucket Algorithm: https://aws.amazon.com/blogs/architecture/rate-limiting-strategies-for-serverless-applications/
