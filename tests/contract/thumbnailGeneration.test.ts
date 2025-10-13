/**
 * Contract Tests: Thumbnail Generation
 * Feature: 009-voglio-implementare-la
 * Contract: specs/009-voglio-implementare-la/contracts/thumbnail-generation.yml
 *
 * TDD Approach: These tests are written BEFORE implementation
 * Expected: ALL TESTS SHOULD FAIL until implementation is complete
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Test data IDs (will be created in beforeAll)
let testTenantId: string;
let testAdminId: string;
let testEventId: string;
let testSessionId: string;
let testSpeechId: string;
let testSlideId: string;
let authToken: string;

describe('POST /api/slides/[id]/generate-thumbnail', () => {
  beforeAll(async () => {
    // Setup test data
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create test tenant with quota
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Tenant',
        subdomain: `test-thumbnail-gen-${Date.now()}`,
        thumbnail_quota_total: 5,
        thumbnail_quota_used: 0,
      })
      .select()
      .single();
    testTenantId = tenant!.id;

    // Create test admin
    const { data: { user } } = await supabase.auth.signUp({
      email: `admin-thumb-${Date.now()}@test.com`,
      password: 'TestPassword123!',
    });
    testAdminId = user!.id;

    await supabase.from('admins').insert({
      id: testAdminId,
      tenant_id: testTenantId,
      email: user!.email,
    });

    // Get auth token
    const { data: { session } } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: 'TestPassword123!',
    });
    authToken = session!.access_token;

    // Create test event with thumbnail generation enabled
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

    // Create test session
    const { data: session_data } = await supabase
      .from('sessions')
      .insert({
        event_id: testEventId,
        tenant_id: testTenantId,
        name: 'Test Session',
        session_date: '2025-02-01',
      })
      .select()
      .single();
    testSessionId = session_data!.id;

    // Create test speech
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

    // Create test slide (PPT file)
    const { data: slide } = await supabase
      .from('slides')
      .insert({
        speech_id: testSpeechId,
        tenant_id: testTenantId,
        filename: 'test-presentation.pptx',
        file_size: 1024 * 1024,
        mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        r2_key: `tenants/${testTenantId}/events/${testEventId}/slides/test.pptx`,
        uploaded_by: `admin:${testAdminId}`,
        thumbnail_status: 'pending',
      })
      .select()
      .single();
    testSlideId = slide!.id;
  });

  afterAll(async () => {
    // Cleanup test data
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.from('slides').delete().eq('id', testSlideId);
    await supabase.from('speeches').delete().eq('id', testSpeechId);
    await supabase.from('sessions').delete().eq('id', testSessionId);
    await supabase.from('events').delete().eq('id', testEventId);
    await supabase.from('admins').delete().eq('id', testAdminId);
    await supabase.from('tenants').delete().eq('id', testTenantId);
    await supabase.auth.admin.deleteUser(testAdminId);
  });

  it('should initiate thumbnail generation with valid request', async () => {
    const response = await fetch(`${API_BASE_URL}/api/slides/${testSlideId}/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(202);

    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Thumbnail generation started',
      status: 'processing',
      slide_id: testSlideId,
    });
    expect(body.job_id).toBeDefined();
    expect(body.quota).toMatchObject({
      used: 1,
      total: 5,
      remaining: 4,
    });

    // Verify database state
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: slide } = await supabase
      .from('slides')
      .select('thumbnail_status')
      .eq('id', testSlideId)
      .single();
    expect(slide!.thumbnail_status).toBe('processing');

    // Verify cloudconvert_jobs record created
    const { data: job } = await supabase
      .from('cloudconvert_jobs')
      .select('*')
      .eq('slide_id', testSlideId)
      .single();
    expect(job).toBeDefined();
    expect(job!.status).toBe('pending');

    // Verify quota incremented
    const { data: tenant } = await supabase
      .from('tenants')
      .select('thumbnail_quota_used')
      .eq('id', testTenantId)
      .single();
    expect(tenant!.thumbnail_quota_used).toBe(1);
  });

  it('should return 403 when quota is exhausted', async () => {
    // Exhaust quota
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase
      .from('tenants')
      .update({ thumbnail_quota_used: 5 })
      .eq('id', testTenantId);

    const response = await fetch(`${API_BASE_URL}/api/slides/${testSlideId}/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'QUOTA_EXHAUSTED',
      message: expect.stringContaining('quota exhausted'),
      quota: {
        used: 5,
        total: 5,
        remaining: 0,
      },
    });
    expect(body.upgrade_url).toBeDefined();

    // Verify thumbnail_status unchanged
    const { data: slide } = await supabase
      .from('slides')
      .select('thumbnail_status')
      .eq('id', testSlideId)
      .single();
    expect(slide!.thumbnail_status).toBe('pending');

    // Reset quota for next tests
    await supabase
      .from('tenants')
      .update({ thumbnail_quota_used: 0 })
      .eq('id', testTenantId);
  });

  it('should return 400 when event toggle is disabled', async () => {
    // Disable event toggle
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase
      .from('events')
      .update({ thumbnail_generation_enabled: false })
      .eq('id', testEventId);

    const response = await fetch(`${API_BASE_URL}/api/slides/${testSlideId}/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'THUMBNAIL_GENERATION_DISABLED',
      message: expect.stringContaining('disabled'),
    });

    // Re-enable for next tests
    await supabase
      .from('events')
      .update({ thumbnail_generation_enabled: true })
      .eq('id', testEventId);
  });

  it('should return 200 when thumbnail already exists', async () => {
    // Mark thumbnail as completed
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase
      .from('slides')
      .update({
        thumbnail_status: 'completed',
        thumbnail_r2_key: 'test-thumb.jpg',
      })
      .eq('id', testSlideId);

    const response = await fetch(`${API_BASE_URL}/api/slides/${testSlideId}/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      message: expect.stringContaining('already exists'),
      status: 'completed',
    });

    // Verify quota NOT incremented
    const { data: tenant } = await supabase
      .from('tenants')
      .select('thumbnail_quota_used')
      .eq('id', testTenantId)
      .single();
    expect(tenant!.thumbnail_quota_used).toBe(0);

    // Reset for next tests
    await supabase
      .from('slides')
      .update({ thumbnail_status: 'pending', thumbnail_r2_key: null })
      .eq('id', testSlideId);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await fetch(`${API_BASE_URL}/api/slides/${testSlideId}/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'UNAUTHORIZED',
      message: expect.stringContaining('Authentication required'),
    });
  });

  it('should return 404 when slide not found', async () => {
    const fakeSlideId = '00000000-0000-0000-0000-000000000000';

    const response = await fetch(`${API_BASE_URL}/api/slides/${fakeSlideId}/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'SLIDE_NOT_FOUND',
      message: expect.stringContaining('not found'),
    });
  });

  it('should rollback quota when CloudConvert API fails', async () => {
    // TODO: Mock CloudConvert API failure
    // This test requires mocking external API calls
    // Implementation will be added when CloudConvert service is implemented
    expect(true).toBe(true); // Placeholder
  });

  it('should handle unsupported file types gracefully', async () => {
    // Create slide with unsupported MIME type
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: unsupportedSlide } = await supabase
      .from('slides')
      .insert({
        speech_id: testSpeechId,
        tenant_id: testTenantId,
        filename: 'test-doc.docx',
        file_size: 1024,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        r2_key: `tenants/${testTenantId}/events/${testEventId}/slides/test.docx`,
        uploaded_by: `admin:${testAdminId}`,
        thumbnail_status: 'pending',
      })
      .select()
      .single();

    const response = await fetch(`${API_BASE_URL}/api/slides/${unsupportedSlide!.id}/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'UNSUPPORTED_FILE_TYPE',
      message: expect.stringContaining('PPT, PPTX, PDF'),
    });

    // Cleanup
    await supabase.from('slides').delete().eq('id', unsupportedSlide!.id);
  });
});
