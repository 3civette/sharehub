/**
 * Contract Tests: Events API
 *
 * PURPOSE: Verify API contracts match OpenAPI spec before implementation exists
 * APPROACH: Test-Driven Development (TDD) - these tests MUST fail initially
 * LOCATION: backend/tests/contract/events.test.ts (copy this file there)
 *
 * Constitution Principle III: Tests written first, implementation second
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// NOTE: This will fail until backend/src/app.ts is implemented
const API_BASE_URL = 'http://localhost:3001/api';
let adminToken: string;
let testTenantId: string;
let testEventId: string;
let testSessionId: string;
let testSpeechId: string;
let organizerToken: string;
let participantToken: string;

describe('Events API Contract Tests', () => {
  beforeAll(async () => {
    // Setup: Create test tenant and admin (from feature 002)
    // This assumes feature 002 is already implemented
    const tenantRes = await request(API_BASE_URL)
      .post('/tenants')
      .send({ subdomain: 'test-events', name: 'Test Events Hotel' });
    testTenantId = tenantRes.body.tenant.id;

    const adminRes = await request(API_BASE_URL)
      .post('/auth/login')
      .send({ email: 'admin@test-events.com', password: 'password123' });
    adminToken = adminRes.body.token;
  });

  describe('POST /events - Create Event', () => {
    it('should create a public event', async () => {
      const response = await request(API_BASE_URL)
        .post('/events')
        .set('X-Admin-Token', adminToken)
        .send({
          name: 'Annual Conference 2025',
          date: '2025-12-15',
          description: 'Our biggest conference yet',
          visibility: 'public',
          retention_policy: 'keep_forever'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toMatchObject({
        name: 'Annual Conference 2025',
        date: '2025-12-15',
        visibility: 'public',
        status: 'upcoming'
      });
      expect(response.body.event).toHaveProperty('id');
      expect(response.body.event).toHaveProperty('slug');
      expect(response.body).not.toHaveProperty('tokens');
    });

    it('should create a private event with tokens', async () => {
      const response = await request(API_BASE_URL)
        .post('/events')
        .set('X-Admin-Token', adminToken)
        .send({
          name: 'Executive Summit',
          date: '2025-11-20',
          visibility: 'private',
          token_expiration_date: '2025-12-31T23:59:59Z'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('event');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('organizer');
      expect(response.body.tokens).toHaveProperty('participant');
      expect(response.body.tokens.organizer).toHaveLength(21); // nanoid length
      expect(response.body.tokens.participant).toHaveLength(21);

      // Save for later tests
      testEventId = response.body.event.id;
      organizerToken = response.body.tokens.organizer;
      participantToken = response.body.tokens.participant;
    });

    it('should reject private event without token expiration', async () => {
      const response = await request(API_BASE_URL)
        .post('/events')
        .set('X-Admin-Token', adminToken)
        .send({
          name: 'Invalid Event',
          date: '2025-11-20',
          visibility: 'private'
          // Missing token_expiration_date
        });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject token expiration in the past', async () => {
      const response = await request(API_BASE_URL)
        .post('/events')
        .set('X-Admin-Token', adminToken)
        .send({
          name: 'Invalid Event',
          date: '2025-11-20',
          visibility: 'private',
          token_expiration_date: '2020-01-01T00:00:00Z' // Past date
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toContain('expiration');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(API_BASE_URL)
        .post('/events')
        .send({ name: 'Test', date: '2025-12-01', visibility: 'public' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /events - List Events', () => {
    it('should list all events for tenant', async () => {
      const response = await request(API_BASE_URL)
        .get('/events')
        .set('X-Admin-Token', adminToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter events by status', async () => {
      const response = await request(API_BASE_URL)
        .get('/events?status=upcoming')
        .set('X-Admin-Token', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.events.every((e: any) => e.status === 'upcoming')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(API_BASE_URL)
        .get('/events?page=1&limit=10')
        .set('X-Admin-Token', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10
      });
      expect(response.body.pagination).toHaveProperty('total');
    });
  });

  describe('GET /events/:eventId - Get Event Details', () => {
    it('should get event details with admin token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}`)
        .set('X-Admin-Token', adminToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body.event.id).toBe(testEventId);
    });

    it('should get event details with organizer token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}?token=${organizerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
    });

    it('should get event details with participant token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}?token=${participantToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
    });

    it('should reject invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}?token=invalid-token`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_BASE_URL)
        .get(`/events/${fakeId}`)
        .set('X-Admin-Token', adminToken);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /events/:eventId - Update Event', () => {
    it('should update event details', async () => {
      const response = await request(API_BASE_URL)
        .put(`/events/${testEventId}`)
        .set('X-Admin-Token', adminToken)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
    });

    it('should require double confirmation for past events', async () => {
      // First, create a past event
      const pastEventRes = await request(API_BASE_URL)
        .post('/events')
        .set('X-Admin-Token', adminToken)
        .send({
          name: 'Past Event',
          date: '2020-01-01',
          visibility: 'public'
        });
      const pastEventId = pastEventRes.body.event.id;

      // Try to update without confirmation header
      const response = await request(API_BASE_URL)
        .put(`/events/${pastEventId}`)
        .set('X-Admin-Token', adminToken)
        .send({ name: 'Updated Past Event' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('confirmation');
    });

    it('should allow update with confirmation header', async () => {
      // Create past event
      const pastEventRes = await request(API_BASE_URL)
        .post('/events')
        .set('X-Admin-Token', adminToken)
        .send({
          name: 'Past Event 2',
          date: '2020-01-01',
          visibility: 'public'
        });
      const pastEventId = pastEventRes.body.event.id;

      // Update with confirmation header
      const response = await request(API_BASE_URL)
        .put(`/events/${pastEventId}`)
        .set('X-Admin-Token', adminToken)
        .set('X-Confirm-Past-Event', 'true')
        .send({ name: 'Updated Past Event' });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /events/:eventId/sessions - Create Session', () => {
    it('should create session with organizer token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .query({ token: organizerToken })
        .send({
          title: 'Morning Keynotes',
          description: 'Opening session',
          start_time: '2025-11-20T09:00:00Z',
          display_order: 0
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Morning Keynotes',
        display_order: 0
      });
      expect(response.body).toHaveProperty('id');
      testSessionId = response.body.id;
    });

    it('should reject participant token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .query({ token: participantToken })
        .send({
          title: 'Should Fail',
          display_order: 1
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('organizer');
    });
  });

  describe('POST /sessions/:sessionId/speeches - Create Speech', () => {
    it('should create speech with organizer token', async () => {
      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .query({ token: organizerToken })
        .send({
          title: 'Opening Remarks',
          speaker_name: 'John Doe',
          duration: 30,
          description: 'Welcome address',
          display_order: 0
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Opening Remarks',
        speaker_name: 'John Doe',
        duration: 30
      });
      testSpeechId = response.body.id;
    });
  });

  describe('POST /speeches/:speechId/slides - Upload Slide', () => {
    it('should upload slide file', async () => {
      // Create mock file buffer
      const fileBuffer = Buffer.from('mock PDF content');

      const response = await request(API_BASE_URL)
        .post(`/speeches/${testSpeechId}/slides`)
        .query({ token: organizerToken })
        .attach('file', fileBuffer, 'presentation.pdf')
        .field('display_order', '0');

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        filename: 'presentation.pdf',
        display_order: 0
      });
      expect(response.body.file_size).toBeGreaterThan(0);
    });

    it('should reject files over 100MB', async () => {
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB

      const response = await request(API_BASE_URL)
        .post(`/speeches/${testSpeechId}/slides`)
        .query({ token: organizerToken })
        .attach('file', largeBuffer, 'large.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('size');
    });

    it('should reject invalid file types', async () => {
      const fileBuffer = Buffer.from('not a presentation');

      const response = await request(API_BASE_URL)
        .post(`/speeches/${testSpeechId}/slides`)
        .query({ token: organizerToken })
        .attach('file', fileBuffer, 'file.txt');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('type');
    });
  });

  describe('GET /events/:eventId/tokens/pdf - Download Tokens PDF', () => {
    it('should generate PDF with QR codes', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/pdf`)
        .set('X-Admin-Token', adminToken);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should reject for public events', async () => {
      // Create public event
      const publicEventRes = await request(API_BASE_URL)
        .post('/events')
        .set('X-Admin-Token', adminToken)
        .send({
          name: 'Public Event',
          date: '2025-12-01',
          visibility: 'public'
        });
      const publicEventId = publicEventRes.body.event.id;

      const response = await request(API_BASE_URL)
        .get(`/events/${publicEventId}/tokens/pdf`)
        .set('X-Admin-Token', adminToken);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /events/:eventId/dashboard - Organizer Dashboard', () => {
    it('should return dashboard data with organizer token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/dashboard`)
        .query({ token: organizerToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('activity_log');
      expect(response.body).toHaveProperty('tenant_plan');
    });

    it('should reject participant token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/dashboard`)
        .query({ token: participantToken });

      expect(response.status).toBe(403);
    });

    it('should show basic metrics for free plan', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/dashboard`)
        .query({ token: organizerToken });

      expect(response.status).toBe(200);
      expect(response.body.metrics).toHaveProperty('page_views');
      expect(response.body.metrics).toHaveProperty('total_slide_downloads');

      if (response.body.tenant_plan === 'free') {
        expect(response.body.metrics.unique_visitors).toBeNull();
        expect(response.body.metrics.geographic_data).toBeNull();
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit (100 req/hour)', async () => {
      // Make 101 requests rapidly
      const requests = Array.from({ length: 101 }, () =>
        request(API_BASE_URL)
          .get(`/events/${testEventId}/public`)
          .query({ token: participantToken })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].headers).toHaveProperty('retry-after');
    });
  });

  describe('GET /events/:eventId/public - Public Event Page', () => {
    it('should access public event without token', async () => {
      // Create public event
      const publicEventRes = await request(API_BASE_URL)
        .post('/events')
        .set('X-Admin-Token', adminToken)
        .send({
          name: 'Public Conference',
          date: '2025-12-01',
          visibility: 'public'
        });
      const publicEventId = publicEventRes.body.event.id;

      const response = await request(API_BASE_URL)
        .get(`/events/${publicEventId}/public`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
      expect(response.body).toHaveProperty('sessions');
    });

    it('should reject private event without token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/public`);

      expect(response.status).toBe(403);
    });

    it('should access private event with valid token', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/public`)
        .query({ token: participantToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
    });
  });
});

/**
 * EXPECTED RESULT: All tests should FAIL initially
 *
 * These tests will pass once:
 * 1. Database schema is created (data-model.md)
 * 2. Backend services are implemented
 * 3. API routes are wired up
 * 4. Token validation middleware is implemented
 * 5. Rate limiting middleware is configured
 *
 * TDD Cycle: RED → GREEN → REFACTOR
 */
