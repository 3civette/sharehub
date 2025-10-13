/**
 * Contract Tests: CloudConvert Webhook & Email Notifications
 * Feature: 009-voglio-implementare-la
 * Contract: specs/009-voglio-implementare-la/contracts/cloudconvert-webhook.yml
 *           specs/009-voglio-implementare-la/contracts/email-notifications.yml
 *
 * TDD Approach: These tests are written BEFORE implementation
 * Expected: ALL TESTS SHOULD FAIL until implementation is complete
 *
 * NOTE: Full webhook signature verification tests require mocking CloudConvert API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.CLOUDCONVERT_WEBHOOK_SECRET || 'test-webhook-secret';

// Test data IDs
let testTenantId: string;
let testEventId: string;
let testSessionId: string;
let testSpeechId: string;
let testSlideId: string;
let testJobId: string;
let cloudConvertJobId: string;

describe('POST /api/webhooks/cloudconvert', () => {
  beforeAll(async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create test data
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Tenant Webhook',
        subdomain: `test-webhook-${Date.now()}`,
      })
      .select()
      .single();
    testTenantId = tenant!.id;

    const { data: event } = await supabase
      .from('events')
      .insert({
        tenant_id: testTenantId,
        name: 'Test Event',
        event_date: '2025-02-01',
        thumbnail_generation_enabled: true,
      })
      .select()
      .single();
    testEventId = event!.id;

    const { data: session } = await supabase
      .from('sessions')
      .insert({
        event_id: testEventId,
        tenant_id: testTenantId,
        name: 'Test Session',
      })
      .select()
      .single();
    testSessionId = session!.id;

    const { data: speech } = await supabase
      .from('speeches')
      .insert({
        session_id: testSessionId,
        tenant_id: testTenantId,
        title: 'Test Speech',
      })
      .select()
      .single();
    testSpeechId = speech!.id;

    const { data: slide } = await supabase
      .from('slides')
      .insert({
        speech_id: testSpeechId,
        tenant_id: testTenantId,
        filename: 'test.pptx',
        file_size: 1024,
        mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        r2_key: `tenants/${testTenantId}/events/${testEventId}/slides/test.pptx`,
        uploaded_by: 'admin:test',
        thumbnail_status: 'processing',
      })
      .select()
      .single();
    testSlideId = slide!.id;

    // Create cloudconvert_jobs record
    cloudConvertJobId = `cc-job-${Date.now()}`;
    const { data: job } = await supabase
      .from('cloudconvert_jobs')
      .insert({
        tenant_id: testTenantId,
        slide_id: testSlideId,
        cloudconvert_job_id: cloudConvertJobId,
        status: 'processing',
      })
      .select()
      .single();
    testJobId = job!.id;
  });

  afterAll(async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.from('cloudconvert_jobs').delete().eq('id', testJobId);
    await supabase.from('slides').delete().eq('id', testSlideId);
    await supabase.from('speeches').delete().eq('id', testSpeechId);
    await supabase.from('sessions').delete().eq('id', testSessionId);
    await supabase.from('events').delete().eq('id', testEventId);
    await supabase.from('tenants').delete().eq('id', testTenantId);
  });

  function generateWebhookSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');
  }

  it('should process successful webhook and mark thumbnail as completed', async () => {
    const webhookPayload = {
      event: 'job.finished',
      job: {
        id: cloudConvertJobId,
        status: 'finished',
        created_at: '2025-01-13T10:00:00Z',
        finished_at: '2025-01-13T10:02:15Z',
        tasks: [
          {
            id: 'task-123',
            operation: 'convert',
            status: 'finished',
            result: {
              files: [
                {
                  filename: 'thumbnail.jpg',
                  url: 'https://storage.cloudconvert.com/test/thumbnail.jpg',
                },
              ],
            },
          },
        ],
      },
    };

    const signature = generateWebhookSignature(webhookPayload);

    const response = await fetch(`${API_BASE_URL}/api/webhooks/cloudconvert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CloudConvert-Signature': signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Webhook processed successfully',
      job_id: cloudConvertJobId,
      thumbnail_status: 'completed',
    });

    // Verify database state
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: slide } = await supabase
      .from('slides')
      .select('thumbnail_status, thumbnail_r2_key')
      .eq('id', testSlideId)
      .single();

    expect(slide!.thumbnail_status).toBe('completed');
    expect(slide!.thumbnail_r2_key).toBeDefined();

    const { data: job } = await supabase
      .from('cloudconvert_jobs')
      .select('status, completed_at, webhook_received_at')
      .eq('id', testJobId)
      .single();

    expect(job!.status).toBe('completed');
    expect(job!.completed_at).not.toBeNull();
    expect(job!.webhook_received_at).not.toBeNull();
  });

  it('should handle failed webhook and create failure log', async () => {
    const webhookPayload = {
      event: 'job.failed',
      job: {
        id: cloudConvertJobId,
        status: 'error',
        created_at: '2025-01-13T10:00:00Z',
        finished_at: '2025-01-13T10:02:15Z',
        tasks: [
          {
            id: 'task-123',
            operation: 'convert',
            status: 'error',
            message: 'Conversion failed: File is corrupted',
          },
        ],
      },
    };

    const signature = generateWebhookSignature(webhookPayload);

    const response = await fetch(`${API_BASE_URL}/api/webhooks/cloudconvert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CloudConvert-Signature': signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      thumbnail_status: 'failed',
    });

    // Verify database state
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: slide } = await supabase
      .from('slides')
      .select('thumbnail_status')
      .eq('id', testSlideId)
      .single();

    expect(slide!.thumbnail_status).toBe('failed');

    const { data: job } = await supabase
      .from('cloudconvert_jobs')
      .select('status, error_message')
      .eq('id', testJobId)
      .single();

    expect(job!.status).toBe('failed');
    expect(job!.error_message).toBeDefined();

    // Verify failure log created
    const { data: failureLog } = await supabase
      .from('thumbnail_failure_log')
      .select('*')
      .eq('slide_id', testSlideId)
      .single();

    expect(failureLog).toBeDefined();
    expect(failureLog!.error_type).toBe('cloudconvert_api_error');
  });

  it('should return 400 with invalid webhook signature', async () => {
    const webhookPayload = {
      event: 'job.finished',
      job: {
        id: cloudConvertJobId,
        status: 'finished',
      },
    };

    const invalidSignature = 'invalid-signature-123';

    const response = await fetch(`${API_BASE_URL}/api/webhooks/cloudconvert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CloudConvert-Signature': invalidSignature,
      },
      body: JSON.stringify(webhookPayload),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'INVALID_SIGNATURE',
      message: expect.stringContaining('signature'),
    });
  });

  it('should return 400 when job not found in database', async () => {
    const webhookPayload = {
      event: 'job.finished',
      job: {
        id: 'non-existent-job-id',
        status: 'finished',
      },
    };

    const signature = generateWebhookSignature(webhookPayload);

    const response = await fetch(`${API_BASE_URL}/api/webhooks/cloudconvert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CloudConvert-Signature': signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'JOB_NOT_FOUND',
    });
  });

  it('should handle idempotent webhook processing', async () => {
    // Mark job as already completed
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase
      .from('cloudconvert_jobs')
      .update({ status: 'completed' })
      .eq('id', testJobId);

    const webhookPayload = {
      event: 'job.finished',
      job: {
        id: cloudConvertJobId,
        status: 'finished',
        tasks: [],
      },
    };

    const signature = generateWebhookSignature(webhookPayload);

    const response = await fetch(`${API_BASE_URL}/api/webhooks/cloudconvert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CloudConvert-Signature': signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.message).toContain('already processed');
  });
});

describe('Email Notifications (Integration)', () => {
  it('should trigger email notification after 3 consecutive failures', async () => {
    // TODO: Implement email notification tests
    // Requires Resend API mocking or test mode
    // Test will verify:
    // 1. Email sent after 3+ failures
    // 2. Email contains correct failure details
    // 3. Email sent to correct admin email
    expect(true).toBe(true); // Placeholder
  });
});
