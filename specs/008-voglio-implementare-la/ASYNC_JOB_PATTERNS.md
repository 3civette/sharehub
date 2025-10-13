# Research: Long-Running Jobs in Serverless Environments

**Feature**: 008-voglio-implementare-la
**Date**: 2025-10-13
**Context**: Netlify Functions with 10-second timeout, external API jobs up to 5 minutes

---

## Executive Summary

When serverless functions have a 10-second timeout but external API jobs may take up to 5 minutes to complete, you need an **async job pattern** that:
1. Returns immediately to the client (within 10s)
2. Initiates the long-running job externally
3. Receives completion notification via webhook
4. Handles failures and retries gracefully

**Recommended Pattern**: **Webhook-Based Async Job Processing with Database Status Tracking**

---

## Decision: Architecture Pattern for Async Job Processing

### Pattern: Webhook + Database Status Tracking

```
┌─────────┐  1. POST /api/jobs/initiate         ┌──────────────┐
│ Client  │ ─────────────────────────────────> │ Netlify Fn   │
│         │ <───────────────────────────────── │ (10s limit)  │
└─────────┘  2. 202 Accepted + job_id          └──────────────┘
                                                        │
                                                        │ 3. Create job record (status=pending)
                                                        ▼
                                                 ┌──────────────┐
                                                 │  Supabase    │
                                                 │  (jobs table)│
                                                 └──────────────┘
                                                        │
                                                        │ 4. Initiate external API job
                                                        ▼
                                                 ┌──────────────┐
                                                 │ External API │
                                                 │ (5min job)   │
                                                 └──────────────┘
                                                        │
                                                        │ 5. On completion (webhook)
                                                        ▼
┌─────────┐  7. GET /api/jobs/:id/status      ┌──────────────┐
│ Client  │ <───────────────────────────────  │ Netlify Fn   │
│         │  {status: completed, result: ...} │ (webhook)    │
└─────────┘                                    └──────────────┘
     │                                                │
     │ 6. Poll status every 5s                       │ 8. Update job record
     │    (or wait for webhook)                      ▼
     │                                         ┌──────────────┐
     └─────────────────────────────────────> │  Supabase    │
                                              │  (status=    │
                                              │  completed)  │
                                              └──────────────┘
```

### Implementation Flow

**1. Job Initiation (< 10s)**
```typescript
// POST /api/jobs/initiate
export async function POST(request: NextRequest) {
  // Step 1: Create job record in database
  const jobId = generateId();
  await supabase.from('jobs').insert({
    id: jobId,
    status: 'pending',
    created_at: new Date().toISOString(),
    webhook_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/job-complete`,
  });

  // Step 2: Initiate external API job (non-blocking)
  const externalJobId = await externalAPI.startJob({
    callback_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/job-complete?job_id=${jobId}`,
    params: { /* job parameters */ },
  });

  // Step 3: Store external job ID
  await supabase.from('jobs').update({
    external_job_id: externalJobId,
  }).eq('id', jobId);

  // Step 4: Return immediately (202 Accepted)
  return NextResponse.json(
    {
      job_id: jobId,
      status: 'pending',
      status_url: `/api/jobs/${jobId}/status`,
    },
    { status: 202 }
  );
}
```

**2. Webhook Receiver (< 10s)**
```typescript
// POST /api/webhooks/job-complete
export async function POST(request: NextRequest) {
  const body = await request.json();
  const jobId = request.nextUrl.searchParams.get('job_id');

  // Step 1: Verify webhook signature (idempotency + security)
  const signature = request.headers.get('x-webhook-signature');
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Step 2: Check if already processed (idempotency)
  const { data: existingJob } = await supabase
    .from('jobs')
    .select('status, idempotency_key')
    .eq('id', jobId)
    .single();

  const idempotencyKey = body.idempotency_key || body.event_id;
  if (existingJob.idempotency_key === idempotencyKey) {
    // Already processed - return success
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Step 3: Update job status
  await supabase.from('jobs').update({
    status: body.status === 'success' ? 'completed' : 'failed',
    result: body.result,
    error: body.error,
    completed_at: new Date().toISOString(),
    idempotency_key: idempotencyKey,
  }).eq('id', jobId);

  // Step 4: Acknowledge immediately
  return NextResponse.json({ received: true }, { status: 200 });
}
```

**3. Status Polling (Client-Side)**
```typescript
// Client polls status endpoint
async function pollJobStatus(jobId: string) {
  const maxAttempts = 60; // 5 minutes at 5s intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`/api/jobs/${jobId}/status`);
    const data = await response.json();

    if (data.status === 'completed' || data.status === 'failed') {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s delay
    attempts++;
  }

  throw new Error('Job timeout - exceeded 5 minutes');
}
```

**4. Status Endpoint (< 10s)**
```typescript
// GET /api/jobs/[id]/status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    result: job.result,
    error: job.error,
    created_at: job.created_at,
    completed_at: job.completed_at,
  });
}
```

---

## Rationale: Why This Pattern Fits Netlify/Next.js Constraints

### 1. **Respects 10-Second Timeout**
- Job initiation endpoint returns in < 1 second (just database writes + API call initiation)
- Webhook receiver processes in < 1 second (database update only)
- Status polling endpoint returns in < 100ms (single database query)

### 2. **No Backend Infrastructure Required**
- Uses Next.js API Routes (serverless on Netlify)
- Supabase for state management (no additional database needed)
- No queue infrastructure (SQS, Redis) required
- Fits existing architecture (already using Supabase)

### 3. **Handles 5-Minute Jobs**
- External API does heavy lifting (outside serverless constraints)
- Webhook decouples job completion from function execution
- Client polls or waits for real-time update

### 4. **Built-In Reliability**
- Database provides persistent state across function invocations
- Idempotency keys prevent duplicate processing
- Webhook retries handled by external API (standard practice)
- Polling provides fallback if webhook fails

### 5. **Existing Pattern Match**
- Similar to your thumbnail generation pattern (`generate-thumbnail/route.ts`)
- Already have async pattern: return 202, process in background, check status
- Reuses existing Supabase infrastructure

---

## Alternatives Considered

### Alternative 1: Netlify Background Functions

**Pattern**: Use Netlify's Background Functions feature

```typescript
// netlify/functions/process-job-background.ts
export const handler = async (event) => {
  // Can run up to 15 minutes on paid plans
  const result = await longRunningExternalAPICall();

  await supabase.from('jobs').update({
    status: 'completed',
    result: result,
  }).eq('id', jobId);

  return { statusCode: 200 };
};
```

**Pros**:
- Native Netlify feature
- Can run up to 15 minutes (Pro/Enterprise plans)
- No webhook endpoint needed
- Simpler architecture

**Cons**:
- ❌ **Requires paid plan** (Free tier excluded after Dec 2025)
- ❌ **Not available on Next.js API Routes** - only works with Netlify Functions (different directory structure)
- ❌ **No progress updates** - client can't check status during execution
- ❌ **15-minute limit may not be sufficient** for all jobs
- ❌ **Harder to test locally** - requires Netlify CLI

**Verdict**: ❌ **Not Recommended** - Requires migration from Next.js API Routes to Netlify Functions, paid plan dependency, lacks flexibility

---

### Alternative 2: Direct Client-to-External API

**Pattern**: Browser calls external API directly, backend only tracks status

```typescript
// Client-side code
const response = await fetch('https://external-api.com/jobs', {
  method: 'POST',
  body: JSON.stringify({ params }),
});
const { job_id } = await response.json();

// Poll external API directly
const result = await pollExternalAPI(job_id);
```

**Pros**:
- No serverless function involvement
- Simplest architecture
- No webhook infrastructure

**Cons**:
- ❌ **Exposes API credentials to client** (security risk)
- ❌ **No server-side validation** of job parameters
- ❌ **CORS issues** if external API doesn't support browser requests
- ❌ **No audit trail** in your database
- ❌ **Can't enforce business logic** server-side

**Verdict**: ❌ **Not Recommended** - Security and control concerns

---

### Alternative 3: Database Polling (No Webhooks)

**Pattern**: External API writes results directly to your database

```typescript
// POST /api/jobs/initiate
await externalAPI.startJob({
  database_credentials: {
    host: process.env.SUPABASE_HOST,
    table: 'jobs',
    job_id: jobId,
  },
});

// Client polls database status
const { data: job } = await supabase
  .from('jobs')
  .select('status, result')
  .eq('id', jobId)
  .single();
```

**Pros**:
- No webhook endpoint needed
- Real-time updates via Supabase subscriptions
- Simpler than webhook pattern

**Cons**:
- ❌ **Security risk** - giving external API direct database access
- ❌ **Not all APIs support this** - most use webhooks or polling
- ❌ **Database credentials exposure**
- ❌ **Violates principle of least privilege**

**Verdict**: ❌ **Not Recommended** - Security concerns outweigh simplicity

---

### Alternative 4: Polling External API (No Webhooks)

**Pattern**: Your backend polls external API for job status

```typescript
// POST /api/jobs/initiate
const externalJobId = await externalAPI.startJob(params);
await supabase.from('jobs').insert({
  id: jobId,
  external_job_id: externalJobId,
  status: 'pending',
});

// Scheduled function polls every 30s
// netlify.toml: schedule = "*/30 * * * * *"
export async function GET() {
  const { data: pendingJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'pending');

  for (const job of pendingJobs) {
    const status = await externalAPI.checkStatus(job.external_job_id);
    if (status.completed) {
      await supabase.from('jobs').update({
        status: 'completed',
        result: status.result,
      }).eq('id', job.id);
    }
  }
}
```

**Pros**:
- No webhook endpoint (simpler)
- You control polling frequency
- Works with any external API (even those without webhooks)

**Cons**:
- ❌ **Wasteful** - polls even when no jobs pending
- ❌ **Delayed notifications** - up to 30s delay before detecting completion
- ❌ **API rate limits** - excessive polling may hit rate limits
- ❌ **Scheduled function overhead** - runs even with no jobs
- ⚠️ **Not recommended for sub-minute latency requirements**

**Verdict**: ⚠️ **Use as fallback only** - Acceptable if external API doesn't support webhooks, but webhooks are preferred

---

### Alternative 5: AWS Step Functions (External Service)

**Pattern**: Use AWS Step Functions for orchestration

```typescript
// Initiate Step Function from Netlify
const execution = await stepFunctions.startExecution({
  stateMachineArn: process.env.STATE_MACHINE_ARN,
  input: JSON.stringify({ jobId, params }),
});

// Step Function waits for external API, writes to Supabase on completion
```

**Pros**:
- Purpose-built for long-running workflows
- Built-in retry logic
- Visual workflow designer
- Can wait hours/days for external API

**Cons**:
- ❌ **Additional infrastructure** - AWS account required
- ❌ **Cost** - Step Functions pricing ($0.025 per 1K transitions)
- ❌ **Complexity** - introduces new service to maintain
- ❌ **Overkill** for simple "wait for API, update DB" pattern
- ❌ **Cross-cloud complexity** (Netlify + AWS)

**Verdict**: ❌ **Not Recommended** - Too complex for this use case, contradicts "serverless simplicity" goal

---

## Implementation Notes

### 1. Database Schema

```sql
-- jobs table for tracking async operations
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed
  external_job_id TEXT, -- ID from external API
  result JSONB, -- Job result data
  error TEXT, -- Error message if failed
  idempotency_key TEXT UNIQUE, -- Prevent duplicate webhook processing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  webhook_received_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_jobs_status ON jobs(status) WHERE status = 'pending';
CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_jobs_idempotency ON jobs(idempotency_key);
```

### 2. Webhook Security

**Verify Signature** (critical for security):
```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: any, signature: string): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Alternative**: Use service-specific verification (e.g., Stripe's `stripe.webhooks.constructEvent`)

### 3. Idempotency Handling

**Pattern**: Use unique event ID from webhook provider

```typescript
// Most webhook providers send unique event IDs
const idempotencyKey =
  body.idempotency_key ||
  body.event_id ||
  body.delivery_id ||
  `${body.job_id}-${body.timestamp}`; // Fallback

// Check if already processed
const { data: existing } = await supabase
  .from('jobs')
  .select('idempotency_key')
  .eq('idempotency_key', idempotencyKey)
  .single();

if (existing) {
  console.log(`[Webhook] Duplicate detected: ${idempotencyKey}`);
  return NextResponse.json({ received: true }, { status: 200 });
}
```

### 4. Error Recovery for Failed Webhooks

**Strategy 1: Webhook Retry (External API Responsibility)**
Most webhook providers retry with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: ~1 minute
- Attempt 3: ~5 minutes
- Attempt 4: ~15 minutes
- Attempt 5+: Up to 24 hours

**Strategy 2: Fallback Polling** (in your application)
```typescript
// Scheduled function runs every hour
// netlify.toml: schedule = "0 * * * *"
export async function GET() {
  // Find jobs stuck in "pending" for > 10 minutes
  const { data: stuckJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

  for (const job of stuckJobs) {
    try {
      // Poll external API for status
      const status = await externalAPI.checkStatus(job.external_job_id);

      if (status.completed) {
        await supabase.from('jobs').update({
          status: 'completed',
          result: status.result,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
      }
    } catch (error) {
      console.error(`[Recovery] Failed to check job ${job.id}:`, error);
    }
  }
}
```

**Strategy 3: Dead Letter Queue (DLQ)**
```typescript
// Mark jobs as failed after 24 hours
const { data: expiredJobs } = await supabase
  .from('jobs')
  .select('*')
  .eq('status', 'pending')
  .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

for (const job of expiredJobs) {
  await supabase.from('jobs').update({
    status: 'failed',
    error: 'Job timeout - no webhook received after 24 hours',
    completed_at: new Date().toISOString(),
  }).eq('id', job.id);
}
```

### 5. Client-Side Patterns

**Pattern A: Polling Only**
```typescript
async function initiateJob(params: any) {
  const { job_id, status_url } = await fetch('/api/jobs/initiate', {
    method: 'POST',
    body: JSON.stringify(params),
  }).then(r => r.json());

  // Poll every 5 seconds
  while (true) {
    const status = await fetch(status_url).then(r => r.json());

    if (status.status === 'completed') {
      return status.result;
    }

    if (status.status === 'failed') {
      throw new Error(status.error);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

**Pattern B: Polling + Real-Time Updates (Supabase Subscriptions)**
```typescript
async function initiateJobWithRealtimeUpdates(params: any) {
  const { job_id } = await fetch('/api/jobs/initiate', {
    method: 'POST',
    body: JSON.stringify(params),
  }).then(r => r.json());

  return new Promise((resolve, reject) => {
    // Subscribe to job status changes
    const subscription = supabase
      .channel(`job-${job_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${job_id}`,
        },
        (payload) => {
          if (payload.new.status === 'completed') {
            subscription.unsubscribe();
            resolve(payload.new.result);
          } else if (payload.new.status === 'failed') {
            subscription.unsubscribe();
            reject(new Error(payload.new.error));
          }
        }
      )
      .subscribe();

    // Fallback: Poll every 10s in case subscription fails
    const pollInterval = setInterval(async () => {
      const { data: job } = await supabase
        .from('jobs')
        .select('status, result, error')
        .eq('id', job_id)
        .single();

      if (job.status === 'completed') {
        clearInterval(pollInterval);
        subscription.unsubscribe();
        resolve(job.result);
      } else if (job.status === 'failed') {
        clearInterval(pollInterval);
        subscription.unsubscribe();
        reject(new Error(job.error));
      }
    }, 10000);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      subscription.unsubscribe();
      reject(new Error('Job timeout'));
    }, 5 * 60 * 1000);
  });
}
```

### 6. Testing Strategies

**Test 1: Mock Webhook**
```typescript
test('Webhook updates job status correctly', async () => {
  // Create pending job
  const { data: job } = await supabase.from('jobs').insert({
    id: 'test-job-id',
    status: 'pending',
  }).select().single();

  // Simulate webhook
  const response = await fetch('/api/webhooks/job-complete?job_id=test-job-id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': generateTestSignature({ status: 'success' }),
    },
    body: JSON.stringify({
      status: 'success',
      result: { data: 'test' },
      idempotency_key: 'unique-event-123',
    }),
  });

  expect(response.status).toBe(200);

  // Verify job updated
  const { data: updatedJob } = await supabase
    .from('jobs')
    .select('status, result')
    .eq('id', 'test-job-id')
    .single();

  expect(updatedJob.status).toBe('completed');
  expect(updatedJob.result.data).toBe('test');
});
```

**Test 2: Idempotency**
```typescript
test('Duplicate webhook is idempotent', async () => {
  const payload = {
    status: 'success',
    result: { data: 'test' },
    idempotency_key: 'duplicate-key',
  };

  // Send webhook twice
  await fetch('/api/webhooks/job-complete?job_id=test-job-id', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  await fetch('/api/webhooks/job-complete?job_id=test-job-id', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // Verify job only updated once
  const { data: job } = await supabase
    .from('jobs')
    .select('webhook_received_at')
    .eq('id', 'test-job-id')
    .single();

  // Should not be updated twice (same timestamp)
  expect(job).toBeTruthy();
});
```

**Test 3: Webhook Failure + Recovery**
```typescript
test('Recovery function handles stuck jobs', async () => {
  // Create job stuck in pending (11 minutes old)
  const { data: job } = await supabase.from('jobs').insert({
    id: 'stuck-job',
    status: 'pending',
    external_job_id: 'ext-123',
    created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
  }).select().single();

  // Mock external API returns completed
  mockExternalAPI.checkStatus.mockResolvedValue({
    completed: true,
    result: { data: 'recovered' },
  });

  // Run recovery function
  await fetch('/api/jobs/recovery', { method: 'POST' });

  // Verify job recovered
  const { data: recoveredJob } = await supabase
    .from('jobs')
    .select('status, result')
    .eq('id', 'stuck-job')
    .single();

  expect(recoveredJob.status).toBe('completed');
  expect(recoveredJob.result.data).toBe('recovered');
});
```

---

## Key Architectural Decisions

### Decision 1: Webhook over Polling
**Rationale**: Webhooks provide instant notification without wasteful polling. Most modern APIs support webhooks (Stripe, GitHub, Twilio, etc.). If your external API supports webhooks, always prefer them.

**When to use polling instead**:
- External API doesn't support webhooks
- Webhook infrastructure is unreliable
- You need to aggregate status from multiple sources

### Decision 2: Database over External Queue (SQS, Redis)
**Rationale**: Your existing Supabase PostgreSQL database can track job state without introducing new infrastructure. PostgreSQL is ACID-compliant and can handle job tracking reliably.

**When to use queue instead**:
- Processing >1000 jobs/minute (database becomes bottleneck)
- Need distributed job processing across multiple workers
- Require advanced queue features (dead letter queues, priority queues)

### Decision 3: Status Polling over Server-Sent Events (SSE)
**Rationale**: SSE requires persistent connections, which aren't well-supported in serverless (connection terminates after function completes). Polling every 5 seconds is simple and works within serverless constraints.

**When to use SSE/WebSockets instead**:
- Real-time updates are critical (< 1s latency requirement)
- You have a persistent connection server (not serverless)
- Supabase Realtime subscriptions (acceptable alternative)

### Decision 4: Supabase Realtime as Optional Enhancement
**Rationale**: Supabase Realtime provides WebSocket-based updates without maintaining connections in your serverless functions. It's an excellent enhancement to polling but not a replacement (fallback polling still needed).

**Implementation**:
```typescript
// Client subscribes to job updates via Supabase Realtime
const channel = supabase.channel(`job-${jobId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'jobs',
    filter: `id=eq.${jobId}`,
  }, (payload) => {
    setJobStatus(payload.new.status);
  })
  .subscribe();

// Still poll as fallback (in case Realtime connection drops)
const pollInterval = setInterval(async () => {
  const { data } = await fetch(`/api/jobs/${jobId}/status`);
  setJobStatus(data.status);
}, 10000);
```

---

## Performance Considerations

### Latency Breakdown

**Job Initiation**:
- Database insert: ~50ms
- External API call (non-blocking): ~200ms
- Total: **~250ms** ✅ Well within 10s limit

**Webhook Processing**:
- Signature verification: ~10ms
- Idempotency check: ~50ms (database query)
- Database update: ~50ms
- Total: **~110ms** ✅ Well within 10s limit

**Status Polling**:
- Database query: ~30ms
- Total: **~30ms** ✅ Extremely fast

### Scaling Limits

**Database Connections**:
- Supabase Free Tier: 60 concurrent connections
- Each serverless function invocation uses 1 connection
- If processing >60 concurrent jobs, upgrade to paid tier or implement connection pooling

**External API Rate Limits**:
- If external API has rate limits (e.g., 100 requests/minute), queue job initiations to respect limits
- Use Supabase Edge Functions or Cloudflare Workers if rate limiting is critical

---

## Summary Table

| Pattern | Latency | Complexity | Cost | Reliability | Recommended |
|---------|---------|------------|------|-------------|-------------|
| **Webhook + DB** | 5-10s | Medium | Low | High | ✅ **Yes** |
| Netlify Background Fns | 0s (async) | Low | Medium | Medium | ❌ Paid only |
| Client-to-API | 0s | Low | Low | Low | ❌ Security risk |
| DB Polling (no webhook) | 30s | Medium | Low | Medium | ⚠️ Fallback only |
| API Polling (backend) | 30s | Medium | Low | Medium | ⚠️ Fallback only |
| AWS Step Functions | 0s | High | Medium | High | ❌ Overkill |

---

## Next Steps

1. **Implement job tracking schema** in Supabase (see Database Schema section)
2. **Create webhook endpoint** (`/api/webhooks/job-complete`)
3. **Implement status endpoint** (`/api/jobs/[id]/status`)
4. **Add idempotency checks** using event IDs from webhook provider
5. **Add webhook signature verification** for security
6. **Implement recovery scheduled function** for webhook failures (runs hourly)
7. **Test with real external API** (use webhook testing tools like Webhook.site)
8. **Add monitoring** (log webhook failures, job timeouts)

---

## References

- [Netlify Background Functions](https://docs.netlify.com/build/functions/background-functions/)
- [AWS Architecture Blog: Managing Async Workflows](https://aws.amazon.com/blogs/architecture/managing-asynchronous-workflows-with-a-rest-api/)
- [Stripe Webhooks Best Practices](https://docs.stripe.com/webhooks)
- [Google Cloud: Retries and Idempotency](https://cloud.google.com/blog/products/serverless/cloud-functions-pro-tips-retries-and-idempotency-in-action)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
