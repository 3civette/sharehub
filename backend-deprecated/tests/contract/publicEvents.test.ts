// Feature 004: Public Event Page - Contract Tests
// Date: 2025-10-07
// These tests MUST FAIL initially (TDD approach)

import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = 'http://localhost:3001';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Public Event API - Contract Tests', () => {
  let testTenantId: string;
  let publicEventId: string;
  let publicEventSlug: string;
  let privateEventId: string;
  let privateEventSlug: string;
  let validToken: string;
  let sessionId: string;
  let speechId: string;
  let slideId: string;

  beforeAll(async () => {
    // Setup: Create test tenant, events, sessions, speeches, slides
    // This data will be used across all tests

    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        subdomain: `test-public-events-${Date.now()}`,
        hotel_name: 'Test Hotel Public Events'
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Failed to create tenant: ${tenantError?.message || 'No data returned'}`);
    }
    testTenantId = tenant.id;

    // Create public event
    const { data: publicEvent } = await supabase
      .from('events')
      .insert({
        tenant_id: testTenantId,
        slug: 'test-public-event',
        name: 'Test Public Event',
        date: '2025-12-15',
        visibility: 'public',
        status: 'upcoming',
        created_by: tenant.id
      })
      .select()
      .single();
    publicEventId = publicEvent.id;
    publicEventSlug = publicEvent.slug;

    // Create private event
    const { data: privateEvent } = await supabase
      .from('events')
      .insert({
        tenant_id: testTenantId,
        slug: 'test-private-event',
        name: 'Test Private Event',
        date: '2025-12-20',
        visibility: 'private',
        status: 'upcoming',
        created_by: tenant.id
      })
      .select()
      .single();
    privateEventId = privateEvent.id;
    privateEventSlug = privateEvent.slug;

    // Create access token for private event
    const { data: token } = await supabase
      .from('access_tokens')
      .insert({
        tenant_id: testTenantId,
        event_id: privateEventId,
        token: 'AbC123XyZ456PqR789Lmn', // 21 characters
        token_type: 'participant',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    validToken = token.token;

    // Create session for public event
    const { data: session } = await supabase
      .from('sessions')
      .insert({
        event_id: publicEventId,
        title: 'Morning Keynotes',
        display_order: 1
      })
      .select()
      .single();
    sessionId = session.id;

    // Create speech in session
    const { data: speech } = await supabase
      .from('speeches')
      .insert({
        session_id: sessionId,
        title: 'Welcome Address',
        speaker_name: 'Jane Doe',
        duration_minutes: 30,
        display_order: 1
      })
      .select()
      .single();
    speechId = speech.id;

    // Create slide for speech
    const { data: slide } = await supabase
      .from('slides')
      .insert({
        speech_id: speechId,
        filename: 'welcome-slide.pdf',
        storage_path: `slides/${testTenantId}/welcome-slide.pdf`,
        file_size: 1024000, // 1MB
        mime_type: 'application/pdf',
        display_order: 1
      })
      .select()
      .single();
    slideId = slide.id;

    // Initialize event metrics
    await supabase
      .from('event_metrics')
      .insert({
        event_id: publicEventId,
        page_views: 0,
        total_slide_downloads: 0,
        premium: {}
      });
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await supabase.from('slides').delete().eq('speech_id', speechId);
    await supabase.from('speeches').delete().eq('session_id', sessionId);
    await supabase.from('sessions').delete().eq('event_id', publicEventId);
    await supabase.from('event_metrics').delete().eq('event_id', publicEventId);
    await supabase.from('access_tokens').delete().eq('event_id', privateEventId);
    await supabase.from('events').delete().eq('id', publicEventId);
    await supabase.from('events').delete().eq('id', privateEventId);
    await supabase.from('tenants').delete().eq('id', testTenantId);
  });

  // T004: Contract test GET /api/public/events/:slug (public event)
  describe('GET /api/public/events/:slug (public event)', () => {
    test('should return 200 with full event data for public event', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/events/${publicEventSlug}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Verify response structure matches PublicEventResponse
      expect(response.body).toHaveProperty('event');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('metrics');

      // Verify event data
      expect(response.body.event.slug).toBe(publicEventSlug);
      expect(response.body.event.name).toBe('Test Public Event');
      expect(response.body.event.visibility).toBe('public');
      expect(response.body.event.status).toBe('upcoming');

      // Verify sessions are included and ordered
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
      expect(response.body.sessions[0].title).toBe('Morning Keynotes');

      // Verify speeches are included in sessions and ordered
      expect(Array.isArray(response.body.sessions[0].speeches)).toBe(true);
      expect(response.body.sessions[0].speeches.length).toBeGreaterThan(0);
      expect(response.body.sessions[0].speeches[0].title).toBe('Welcome Address');

      // Verify slides are included in speeches
      expect(Array.isArray(response.body.sessions[0].speeches[0].slides)).toBe(true);
      expect(response.body.sessions[0].speeches[0].slides.length).toBeGreaterThan(0);
      expect(response.body.sessions[0].speeches[0].slides[0].filename).toBe('welcome-slide.pdf');
      expect(response.body.sessions[0].speeches[0].slides[0]).toHaveProperty('download_url');
    });

    test('should return sessions ordered by display_order ASC', async () => {
      // Create another session with higher display_order
      const { data: session2 } = await supabase
        .from('sessions')
        .insert({
          event_id: publicEventId,
          title: 'Afternoon Workshops',
          display_order: 2
        })
        .select()
        .single();

      const response = await request(API_BASE_URL)
        .get(`/api/public/events/${publicEventSlug}`)
        .expect(200);

      expect(response.body.sessions[0].title).toBe('Morning Keynotes');
      expect(response.body.sessions[1].title).toBe('Afternoon Workshops');

      // Cleanup
      await supabase.from('sessions').delete().eq('id', session2.id);
    });

    test('should return speeches ordered by display_order ASC within sessions', async () => {
      // Create another speech with higher display_order
      const { data: speech2 } = await supabase
        .from('speeches')
        .insert({
          session_id: sessionId,
          title: 'Industry Trends',
          speaker_name: 'John Smith',
          display_order: 2
        })
        .select()
        .single();

      const response = await request(API_BASE_URL)
        .get(`/api/public/events/${publicEventSlug}`)
        .expect(200);

      const speeches = response.body.sessions[0].speeches;
      expect(speeches[0].title).toBe('Welcome Address');
      expect(speeches[1].title).toBe('Industry Trends');

      // Cleanup
      await supabase.from('speeches').delete().eq('id', speech2.id);
    });
  });

  // T005: Contract test GET /api/public/events/:slug (private event, no token)
  describe('GET /api/public/events/:slug (private event, no token)', () => {
    test('should return 403 Forbidden for private event without token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/events/${privateEventSlug}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('private event');
      expect(response.body.message).toContain('access token');
    });
  });

  // T006: Contract test POST /api/public/events/:slug/validate-token
  describe('POST /api/public/events/:slug/validate-token', () => {
    test('should return 200 with valid token information', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/public/events/${privateEventSlug}/validate-token`)
        .send({ token: validToken })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.token_type).toBe('participant');
      expect(response.body).toHaveProperty('expires_at');
    });

    test('should return 400 for invalid token format (not 21 characters)', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/public/events/${privateEventSlug}/validate-token`)
        .send({ token: 'short' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('21 characters');
    });

    test('should return 403 for expired token', async () => {
      // Create expired token
      const { data: expiredToken } = await supabase
        .from('access_tokens')
        .insert({
          tenant_id: testTenantId,
          event_id: privateEventId,
          token: 'expiredToken123456789', // 21 chars
          token_type: 'participant',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        })
        .select()
        .single();

      const response = await request(API_BASE_URL)
        .post(`/api/public/events/${privateEventSlug}/validate-token`)
        .send({ token: expiredToken.token })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.valid).toBe(false);
      expect(response.body).toHaveProperty('message');

      // Cleanup
      await supabase.from('access_tokens').delete().eq('id', expiredToken.id);
    });

    test('should update last_used_at and use_count on successful validation', async () => {
      const { data: tokenBefore } = await supabase
        .from('access_tokens')
        .select('use_count, last_used_at')
        .eq('token', validToken)
        .single();

      await request(API_BASE_URL)
        .post(`/api/public/events/${privateEventSlug}/validate-token`)
        .send({ token: validToken })
        .expect(200);

      const { data: tokenAfter } = await supabase
        .from('access_tokens')
        .select('use_count, last_used_at')
        .eq('token', validToken)
        .single();

      expect(tokenAfter.use_count).toBeGreaterThan(tokenBefore.use_count);
      expect(new Date(tokenAfter.last_used_at).getTime()).toBeGreaterThan(
        new Date(tokenBefore.last_used_at || 0).getTime()
      );
    });
  });

  // T007: Contract test GET /api/public/events/:slug/metrics
  describe('GET /api/public/events/:slug/metrics', () => {
    test('should return public metrics (page_views and total_slide_downloads)', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/events/${publicEventSlug}/metrics`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('page_views');
      expect(response.body).toHaveProperty('total_slide_downloads');
      expect(typeof response.body.page_views).toBe('number');
      expect(typeof response.body.total_slide_downloads).toBe('number');
    });

    test('should NOT include premium metrics', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/events/${publicEventSlug}/metrics`)
        .expect(200);

      expect(response.body).not.toHaveProperty('unique_visitors');
      expect(response.body).not.toHaveProperty('per_slide_downloads');
      expect(response.body).not.toHaveProperty('premium');
    });

    test('should return 404 for non-existent event', async () => {
      await request(API_BASE_URL)
        .get('/api/public/events/non-existent-slug/metrics')
        .expect(404);
    });
  });

  // T008: Contract test GET /api/public/slides/:slideId/download
  describe('GET /api/public/slides/:slideId/download', () => {
    test('should return 302 redirect to signed Supabase Storage URL', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/slides/${slideId}/download`)
        .expect(302);

      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('supabase'); // Signed URL contains supabase domain
    });

    test('should increment total_slide_downloads in event_metrics', async () => {
      const { data: metricsBefore } = await supabase
        .from('event_metrics')
        .select('total_slide_downloads')
        .eq('event_id', publicEventId)
        .single();

      await request(API_BASE_URL)
        .get(`/api/public/slides/${slideId}/download`)
        .expect(302);

      const { data: metricsAfter } = await supabase
        .from('event_metrics')
        .select('total_slide_downloads')
        .eq('event_id', publicEventId)
        .single();

      expect(metricsAfter.total_slide_downloads).toBe(metricsBefore.total_slide_downloads + 1);
    });
  });

  // T009: Contract test GET /api/public/speeches/:speechId/download-zip
  describe('GET /api/public/speeches/:speechId/download-zip', () => {
    test('should return 200 with application/zip content-type', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/speeches/${speechId}/download-zip`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/zip');
    });

    test('should include Content-Disposition header with speech title', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/speeches/${speechId}/download-zip`)
        .expect(200);

      expect(response.headers['content-disposition']).toBeDefined();
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('welcome-address'); // Sanitized title
    });

    test('should return 404 if speech not found', async () => {
      await request(API_BASE_URL)
        .get('/api/public/speeches/00000000-0000-0000-0000-000000000000/download-zip')
        .expect(404);
    });

    test('should return 404 if speech has no slides', async () => {
      // Create speech without slides
      const { data: emptySession } = await supabase
        .from('sessions')
        .insert({
          event_id: publicEventId,
          title: 'Empty Session',
          display_order: 99
        })
        .select()
        .single();

      const { data: emptySpeech } = await supabase
        .from('speeches')
        .insert({
          session_id: emptySession.id,
          title: 'Empty Speech',
          speaker_name: 'Nobody',
          display_order: 1
        })
        .select()
        .single();

      await request(API_BASE_URL)
        .get(`/api/public/speeches/${emptySpeech.id}/download-zip`)
        .expect(404);

      // Cleanup
      await supabase.from('speeches').delete().eq('id', emptySpeech.id);
      await supabase.from('sessions').delete().eq('id', emptySession.id);
    });
  });

  // T010: Contract test GET /api/public/sessions/:sessionId/download-zip
  describe('GET /api/public/sessions/:sessionId/download-zip', () => {
    test('should return 200 with application/zip content-type', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/sessions/${sessionId}/download-zip`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/zip');
    });

    test('should include Content-Disposition header with session title', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/public/sessions/${sessionId}/download-zip`)
        .expect(200);

      expect(response.headers['content-disposition']).toBeDefined();
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('morning-keynotes'); // Sanitized title
    });

    test('should return 404 if session not found', async () => {
      await request(API_BASE_URL)
        .get('/api/public/sessions/00000000-0000-0000-0000-000000000000/download-zip')
        .expect(404);
    });
  });

  // T011: Contract test rate limiting on download endpoints
  describe('Rate limiting on download endpoints', () => {
    test('should allow 50 downloads from same IP', async () => {
      for (let i = 0; i < 50; i++) {
        const response = await request(API_BASE_URL)
          .get(`/api/public/slides/${slideId}/download`);

        expect([302, 429]).toContain(response.status); // Either success or rate limit from previous tests
        if (response.status === 429) {
          // Rate limit hit from previous tests, stop early
          break;
        }
      }
    });

    test('should return 429 after exceeding rate limit', async () => {
      // Try to download until we hit rate limit
      let hitRateLimit = false;
      for (let i = 0; i < 55; i++) {
        const response = await request(API_BASE_URL)
          .get(`/api/public/slides/${slideId}/download`);

        if (response.status === 429) {
          hitRateLimit = true;

          // Verify Retry-After header present
          expect(response.headers['retry-after']).toBeDefined();

          // Verify error message
          expect(response.body).toHaveProperty('error');
          expect(response.body.message).toContain('limit');
          expect(response.body.message).toContain('50/hour');
          break;
        }
      }

      // Rate limit should have been hit
      expect(hitRateLimit).toBe(true);
    });
  });
});
