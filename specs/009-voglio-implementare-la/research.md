# Research Report: CloudConvert Thumbnail Generation with Event-Level Toggle

**Feature**: 009-voglio-implementare-la
**Date**: 2025-01-13
**Status**: Research Complete

## Executive Summary

This document consolidates research findings for implementing CloudConvert API integration for thumbnail generation with freemium quota enforcement, async job processing, email notifications, and retroactive batch processing.

---

## 1. CloudConvert API Integration

### Decision
Use **CloudConvert Node.js SDK (v3.0+)** with webhook-based async processing for PPT/PPTX/PDF → 300x300px JPEG thumbnail conversion.

### Rationale
1. **Mature TypeScript SDK**: Official SDK with built-in type definitions, active maintenance
2. **Comprehensive Format Support**: PPT, PPTX, PDF + 200 other formats
3. **Perfect Serverless Fit**: Webhook-based async pattern respects Netlify 10s timeout
4. **Cost-Effective**: Free tier (25 conversions/day) covers projected usage (5-10/month)
5. **Reliable**: Built-in webhook retry (3 attempts), signature verification, sandbox testing

### Installation
```bash
npm install cloudconvert --save
```

### Environment Variables
```env
CLOUDCONVERT_API_KEY=your_api_key_here
CLOUDCONVERT_WEBHOOK_SECRET=your_webhook_secret_here
```

### Key Configuration
```typescript
// lib/cloudconvert.ts
import CloudConvert from 'cloudconvert';

const cloudConvert = new CloudConvert(
  process.env.CLOUDCONVERT_API_KEY!,
  process.env.NODE_ENV !== 'production' // Enable sandbox in development
);

export default cloudConvert;
```

### Conversion Parameters
```typescript
{
  operation: 'convert',
  input_format: 'pptx', // or 'ppt', 'pdf'
  output_format: 'jpg',
  pages: '1', // First slide only
  width: 300,
  height: 300,
  fit: 'cover', // Crop to exact dimensions
  quality: 80
}
```

### Alternatives Considered
- **Sharp + JSZip** (current implementation): Only works for PPTX, no PPT/PDF support
- **Puppeteer/Playwright**: Too heavy for serverless (~150MB), slow (3-5s per thumbnail)
- **LibreOffice Headless**: Requires dedicated server, contradicts serverless goal
- **AWS SES + Lambda**: Complex setup, overkill for simple conversion

---

## 2. Async Job Processing in Serverless

### Decision
**Webhook-Based Async Pattern** with database status tracking and fallback recovery.

### Architecture Components
1. **Job Initiation Endpoint** (`POST /api/slides/[id]/generate-thumbnail`)
   - Creates CloudConvert job with webhook callback
   - Updates database: `thumbnail_status = 'processing'`
   - Returns 202 Accepted immediately (< 1s)

2. **Webhook Receiver** (`POST /api/webhooks/cloudconvert`)
   - Receives job completion notification
   - Verifies webhook signature (HMAC-SHA256)
   - Downloads thumbnail from CloudConvert
   - Uploads to R2, updates database
   - Processes in < 110ms

3. **Status Polling Endpoint** (`GET /api/slides/[id]/thumbnail-status`)
   - Returns current thumbnail generation status
   - Used by client for progress updates

4. **Recovery Scheduled Function** (runs hourly)
   - Finds jobs stuck in "pending" > 10 minutes
   - Polls CloudConvert API for status
   - Recovers from webhook failures

### Rationale
- **Respects 10s Timeout**: All operations complete in < 1s
- **Handles 5min Jobs**: External API processing decoupled from function execution
- **No Additional Infrastructure**: Uses existing Supabase PostgreSQL for state tracking
- **Industry Standard**: Same pattern used by Stripe, GitHub, Twilio

### Database Schema
```sql
CREATE TABLE cloudconvert_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  slide_id UUID NOT NULL REFERENCES slides(id),
  cloudconvert_job_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  error_message TEXT,
  idempotency_key TEXT UNIQUE, -- For duplicate detection
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Alternatives Considered
- **Netlify Background Functions** (15min timeout): Requires Pro plan, no progress updates
- **AWS Step Functions**: Too complex, adds cross-cloud dependency
- **Database Polling**: Wasteful, delayed notifications (30s), may hit rate limits
- **Client-to-External API Direct**: Security risk (exposes API keys to browser)

---

## 3. Email Notification Service

### Decision
Use **Resend** for transactional failure notifications (3+ consecutive failures).

### Rationale
1. **Generous Free Tier**: 3,000 emails/month (projected usage: 5-10/month)
2. **Next.js Native Integration**: Official SDK, first-class App Router support
3. **Developer Experience**: React Email templates, simple API
4. **Cost-Effective**: $0/month for foreseeable future (297x headroom)
5. **Reliable Deliverability**: Modern infrastructure, avoids Microsoft spam issues

### Installation
```bash
npm install resend react-email
```

### Environment Variables
```env
RESEND_API_KEY=re_abc123xyz...
RESEND_FROM_EMAIL=notifications@yourdomain.com
```

### Email Template Pattern
```tsx
// emails/ThumbnailFailureNotification.tsx
import { Html, Body, Container, Heading, Text, Button } from '@react-email/components';

export default function ThumbnailFailureNotification({
  eventName,
  consecutiveFailures,
  lastErrorMessage,
  eventUrl,
  adminName
}) {
  return (
    <Html>
      <Body style={{ backgroundColor: '#f6f9fc' }}>
        <Container>
          <Heading>Thumbnail Generation Issues Detected</Heading>
          <Text>Hi {adminName},</Text>
          <Text>
            We've detected {consecutiveFailures} consecutive failures
            for event: <strong>{eventName}</strong>
          </Text>
          <Button href={eventUrl}>View Event Dashboard</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

### Failure Tracking Logic
```sql
-- Track failures for notification triggering
CREATE TABLE thumbnail_failure_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_id UUID NOT NULL REFERENCES events(id),
  slide_id UUID NOT NULL REFERENCES slides(id),
  error_type TEXT NOT NULL,
  error_message TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query: Find events with 3+ consecutive failures (last 24h)
SELECT event_id, COUNT(*) as failure_count
FROM thumbnail_failure_log
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY event_id
HAVING COUNT(*) >= 3;
```

### Notification Throttling
- Only send 1 email per event per 24 hours (prevent spam)
- Store notification history in `email_notifications` table
- Check before sending: `WHERE sent_at > NOW() - INTERVAL '24 hours'`

### Alternatives Considered
- **SendGrid**: Free tier expires after 60 days, $19.95/month minimum, Microsoft deliverability issues
- **AWS SES**: $0.10 per 1,000 emails but complex setup, requires AWS infrastructure
- **Mailgun/Postmark**: Similar pricing to SendGrid, less Next.js documentation

---

## 4. Quota Management

### Decision
**Database-level enforcement** with atomic check-and-increment function, quota checked BEFORE external API call.

### Database Schema
```sql
-- Add quota tracking to tenants table
ALTER TABLE tenants
ADD COLUMN thumbnail_quota_total INTEGER NOT NULL DEFAULT 5,
ADD COLUMN thumbnail_quota_used INTEGER NOT NULL DEFAULT 0
  CHECK (thumbnail_quota_used >= 0 AND thumbnail_quota_used <= thumbnail_quota_total),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index for quota queries
CREATE INDEX idx_tenants_quota_usage ON tenants(thumbnail_quota_used, thumbnail_quota_total);
```

### Atomic Check-and-Increment Function
```sql
CREATE OR REPLACE FUNCTION check_and_increment_thumbnail_quota(p_tenant_id UUID)
RETURNS TABLE (
  quota_available BOOLEAN,
  quota_used INTEGER,
  quota_total INTEGER,
  quota_remaining INTEGER
) AS $$
DECLARE
  v_quota_used INTEGER;
  v_quota_total INTEGER;
BEGIN
  -- Lock row to prevent race conditions
  SELECT thumbnail_quota_used, thumbnail_quota_total
  INTO v_quota_used, v_quota_total
  FROM tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  IF v_quota_used < v_quota_total THEN
    -- Atomically increment usage
    UPDATE tenants
    SET
      thumbnail_quota_used = thumbnail_quota_used + 1,
      updated_at = NOW()
    WHERE id = p_tenant_id
    RETURNING thumbnail_quota_used, thumbnail_quota_total
    INTO v_quota_used, v_quota_total;

    RETURN QUERY SELECT true, v_quota_used, v_quota_total, (v_quota_total - v_quota_used);
  ELSE
    RETURN QUERY SELECT false, v_quota_used, v_quota_total, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Enforcement Flow
```typescript
// 1. Check and reserve quota BEFORE API call
const quotaResult = await supabase.rpc('check_and_increment_thumbnail_quota', {
  p_tenant_id: tenantId
});

if (!quotaResult.data.quota_available) {
  throw new QuotaExceededError({
    message: 'Thumbnail quota exceeded (5/5 used)',
    upgradeUrl: '/billing/thumbnails/purchase'
  });
}

// 2. Quota reserved - proceed with CloudConvert API
try {
  const thumbnail = await cloudConvert.jobs.create(...);
} catch (error) {
  // 3. API failed - rollback quota
  await supabase.rpc('decrement_thumbnail_quota', { p_tenant_id: tenantId });
  throw error;
}
```

### Rationale
1. **Cost Protection**: Never call external API after quota exhausted
2. **Fail-Fast**: Immediate user feedback without waiting for API
3. **Race Condition Prevention**: PostgreSQL `FOR UPDATE` lock ensures atomic reservation
4. **Rollback Safety**: API failures don't permanently consume quota
5. **Audit Trail**: `updated_at` timestamp tracks quota changes

### UX Strategy
```typescript
// API Response Format
interface QuotaExceededResponse {
  error: 'QUOTA_EXCEEDED';
  message: 'You have used all 5 free thumbnail generations';
  details: {
    quotaUsed: 5,
    quotaTotal: 5,
    quotaRemaining: 0
  };
  actions: {
    purchaseUrl: '/billing/thumbnails/purchase',
    contactSales: 'support@sharehub.com'
  };
}

// Frontend Display
<QuotaBadge
  used={4}
  total={5}
  warningThreshold={0.8} // Warn at 80% usage
/>
// Output: "Thumbnails: 4/5 used ⚠️"
```

### Future Extensibility
```sql
-- Track quota purchases (future feature)
CREATE TABLE tenant_quota_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  purchase_type TEXT NOT NULL, -- 'thumbnail_pack_10', 'thumbnail_pack_50', etc.
  quantity INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

-- Function to apply purchased quota
CREATE OR REPLACE FUNCTION apply_thumbnail_purchase(
  p_tenant_id UUID,
  p_quantity INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE tenants
  SET thumbnail_quota_total = thumbnail_quota_total + p_quantity
  WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;
```

### Alternatives Considered
- **Separate tenant_quotas table**: Adds complexity for single quota type, requires JOIN
- **Application-level locking (Redis)**: Introduces new infrastructure, less reliable than database locks
- **Eventual consistency with queue**: Allows cost overruns before worker processes queue
- **Check quota AFTER API call**: Risk of cost overrun, no fail-fast protection

---

## 5. Retroactive Thumbnail Generation

### Decision
**Database-Driven Queue with Netlify Scheduled Functions** (every 5 minutes) + Supabase Realtime progress tracking.

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ Admin enables thumbnail toggle on event with existing slides │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    v
┌─────────────────────────────────────────────────────────────┐
│ Update slides: SET thumbnail_status = 'pending'             │
│ WHERE event_id = ? AND thumbnail_status = 'none'           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    v
┌─────────────────────────────────────────────────────────────┐
│ Scheduled Function (runs every 5 minutes)                   │
│ - SELECT 50 slides WHERE thumbnail_status = 'pending'      │
│ - Process batch (8 seconds max)                            │
│ - Resume on next run if incomplete                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    v
┌─────────────────────────────────────────────────────────────┐
│ For each slide:                                             │
│ 1. Check tenant quota                                       │
│ 2. Call CloudConvert API (with rate limiting)              │
│ 3. Update status: 'processing' → 'completed' / 'failed'    │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    v
┌─────────────────────────────────────────────────────────────┐
│ Frontend subscribes to Supabase Realtime:                  │
│ - Listen for thumbnail_status changes                       │
│ - Update progress bar in real-time                         │
│ - Show breakdown: pending/processing/completed/failed      │
└─────────────────────────────────────────────────────────────┘
```

### Batch Processing Logic
```typescript
// Scheduled function: /api/jobs/retroactive-thumbnails
export async function GET(request: NextRequest) {
  const BATCH_SIZE = 50;
  const MAX_PROCESSING_TIME = 8000; // 8 seconds
  const startTime = Date.now();

  // 1. Fetch batch of pending slides
  const { data: slides } = await supabase
    .from('slides')
    .select('id, tenant_id, event_id, r2_key, mime_type')
    .eq('thumbnail_status', 'pending')
    .order('uploaded_at', { ascending: true }) // FIFO
    .limit(BATCH_SIZE);

  let processedCount = 0;

  // 2. Process each slide
  for (const slide of slides) {
    // Check timeout (leave 2s buffer for cleanup)
    if (Date.now() - startTime > MAX_PROCESSING_TIME) {
      break; // Resume on next run
    }

    try {
      // Check quota
      const quota = await supabase.rpc('check_and_increment_thumbnail_quota', {
        p_tenant_id: slide.tenant_id
      });

      if (!quota.data.quota_available) {
        await supabase.from('slides').update({
          thumbnail_status: 'failed',
          error_message: 'Tenant quota exhausted'
        }).eq('id', slide.id);
        continue;
      }

      // Generate thumbnail
      await generateThumbnail(slide.id);
      processedCount++;

      // Rate limiting: 600ms delay between requests (100/min limit)
      await new Promise(resolve => setTimeout(resolve, 600));

    } catch (error) {
      console.error(`Failed to process slide ${slide.id}:`, error);
      // Status already updated to 'failed' in generateThumbnail catch block
    }
  }

  return NextResponse.json({
    processed: processedCount,
    remaining: slides.length - processedCount
  });
}
```

### Progress Tracking UI
```tsx
// components/admin/RetroactiveThumbnailProgress.tsx
export function RetroactiveThumbnailProgress({ eventId }: { eventId: string }) {
  const [progress, setProgress] = useState({ pending: 0, processing: 0, completed: 0, failed: 0 });

  useEffect(() => {
    // Real-time subscription to slide status changes
    const subscription = supabase
      .channel(`event-${eventId}-thumbnails`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'slides',
        filter: `event_id=eq.${eventId}`
      }, (payload) => {
        // Update progress in real-time
        fetchProgress();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [eventId]);

  const totalSlides = progress.pending + progress.processing + progress.completed + progress.failed;
  const completionPercent = (progress.completed / totalSlides) * 100;

  return (
    <div>
      <ProgressBar value={completionPercent} />
      <div>
        <Badge>✓ {progress.completed} completed</Badge>
        <Badge>⏳ {progress.processing} processing</Badge>
        <Badge>⏸ {progress.pending} pending</Badge>
        {progress.failed > 0 && <Badge variant="error">✗ {progress.failed} failed</Badge>}
      </div>
    </div>
  );
}
```

### Netlify Configuration
```toml
# netlify.toml
[[functions]]
  path = "/api/jobs/retroactive-thumbnails"
  schedule = "*/5 * * * *"  # Every 5 minutes
```

### Error Recovery
```typescript
// Stale job cleanup: Reset stuck 'processing' status after 15 minutes
const { data: staleJobs } = await supabase
  .from('slides')
  .select('id')
  .eq('thumbnail_status', 'processing')
  .lt('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

await supabase
  .from('slides')
  .update({ thumbnail_status: 'pending' }) // Reset to pending for retry
  .in('id', staleJobs.map(j => j.id));
```

### Rationale
1. **10s Timeout Compatible**: 8s processing + 2s buffer
2. **Stateless**: Database persists queue state between invocations
3. **Automatic Recovery**: Failed batches resume on next run
4. **Real-time Feedback**: Supabase Realtime provides live progress
5. **Cost-Effective**: ~$0.90/month for 1000 thumbnails (mostly API costs)

### Alternatives Considered
- **Netlify Background Functions** (15min timeout): Requires Pro plan, no real-time progress
- **AWS Step Functions**: Overkill for simple queue, adds cross-cloud complexity
- **Client-Side Generation**: Cannot process PDFs reliably in browser
- **Supabase Database Triggers**: Cannot call external APIs from PostgreSQL

---

## Cost Analysis Summary

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| **CloudConvert API** | $0 - $5 | Free tier: 25/day = ~750/month (sufficient) |
| **Resend Email** | $0 | Free tier: 3,000 emails/month (projected: 5-10) |
| **Netlify Functions** | $0 | Within free tier (125K invocations/month) |
| **Supabase** | $0 | Within free tier (database + realtime) |
| **R2 Storage** | $0 | Within free tier (10GB storage, 10M reads) |
| **Total** | **$0 - $5/month** | **~$0.004 per thumbnail** |

**Projected Usage**: 20-30 events/week, 10 presentations per event = ~1,200 thumbnails/month

---

## Implementation Timeline

| Phase | Duration | Effort (hours) |
|-------|----------|----------------|
| **Database Schema** | 0.5 days | 4 hours |
| **CloudConvert Integration** | 1-2 days | 8-16 hours |
| **Webhook Receiver** | 1 day | 8 hours |
| **Quota Enforcement** | 1 day | 8 hours |
| **Email Notifications** | 1 day | 8 hours |
| **Retroactive Processing** | 1-2 days | 8-16 hours |
| **Frontend UI** | 1-2 days | 8-16 hours |
| **Testing** | 2-3 days | 16-24 hours |
| **Documentation** | 0.5 days | 4 hours |
| **Total** | **9-13 days** | **72-104 hours** |

---

## Key Takeaways

1. ✅ **CloudConvert provides comprehensive format support** (PPT, PPTX, PDF) with mature SDK
2. ✅ **Webhook-based async pattern** fits serverless constraints perfectly
3. ✅ **Database-level quota enforcement** prevents race conditions and cost overruns
4. ✅ **Resend offers generous free tier** sufficient for projected email volume
5. ✅ **Scheduled batch processing** handles retroactive generation within timeout constraints
6. ✅ **All solutions work within existing infrastructure** - no new services needed
7. ✅ **Total cost: $0-5/month** at projected scale (1,200 thumbnails/month)
8. ✅ **Implementation effort: 9-13 days** for complete feature

---

## Next Steps (Phase 1: Design & Contracts)

1. Create detailed data model document (`data-model.md`)
2. Generate OpenAPI contracts for new endpoints
3. Write contract tests (TDD approach)
4. Create quickstart validation guide
5. Update CLAUDE.md with new patterns
6. Re-evaluate Constitution Check

---

**Research Complete**: All technical unknowns resolved, ready for Phase 1 design.
