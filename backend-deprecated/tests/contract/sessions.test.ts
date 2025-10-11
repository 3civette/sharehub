/**
 * Contract Tests: Sessions API (Enhanced)
 *
 * PURPOSE: Verify Enhanced Sessions API contracts with smart ordering
 * APPROACH: Test-Driven Development (TDD) - these tests MUST fail initially
 * LOCATION: backend/tests/contract/sessions.test.ts
 * CONTRACT: specs/005-ora-bisogna-implementare/contracts/sessions-api.md
 *
 * Constitution Principle III: Tests written first, implementation second
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const API_BASE_URL = 'http://localhost:3001/api';
let adminToken: string;
let testTenantId: string;
let testEventId: string;
let testSessionId1: string;
let testSessionId2: string;
let testSessionId3: string;

describe('Sessions API Contract Tests (Enhanced)', () => {
  beforeAll(async () => {
    // Setup: Create test tenant, admin, and event
    const tenantRes = await request(API_BASE_URL)
      .post('/tenants')
      .send({ subdomain: 'test-sessions', name: 'Test Sessions Hotel' });
    testTenantId = tenantRes.body.tenant.id;

    const adminRes = await request(API_BASE_URL)
      .post('/auth/login')
      .send({ email: 'admin@test-sessions.com', password: 'password123' });
    adminToken = adminRes.body.token;

    // Create test event
    const eventRes = await request(API_BASE_URL)
      .post('/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Session Test Event',
        event_date: '2025-12-15',
        visibility: 'public'
      });
    testEventId = eventRes.body.event.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    // TODO: Implement cleanup logic
  });

  describe('POST /api/events/:eventId/sessions - Create Session', () => {
    it('should create a session with scheduled time', async () => {
      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Morning Keynote Session',
          description: 'Opening keynote speeches with industry leaders',
          scheduled_time: '2025-10-15T09:00:00Z'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        event_id: testEventId,
        tenant_id: testTenantId,
        title: 'Morning Keynote Session',
        description: 'Opening keynote speeches with industry leaders',
        scheduled_time: '2025-10-15T09:00:00Z',
        display_order: null,
        speech_count: 0
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');

      testSessionId1 = response.body.id;
    });

    it('should create a session without scheduled time', async () => {
      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Afternoon Workshop',
          description: 'Hands-on technical sessions'
        });

      expect(response.status).toBe(201);
      expect(response.body.scheduled_time).toBeNull();
      expect(response.body.display_order).toBeNull();

      testSessionId2 = response.body.id;
    });

    it('should reject session with title exceeding 100 characters', async () => {
      const longTitle = 'A'.repeat(101);

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: longTitle
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toContainEqual({
        field: 'title',
        message: 'Title must not exceed 100 characters'
      });
    });

    it('should reject session without title', async () => {
      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'No title provided'
        });

      expect(response.status).toBe(422);
    });
  });

  describe('GET /api/sessions/:sessionId - Get Session with Content', () => {
    it('should get session details with speeches', async () => {
      const response = await request(API_BASE_URL)
        .get(`/sessions/${testSessionId1}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: testSessionId1,
        event_id: testEventId,
        title: 'Morning Keynote Session',
        scheduled_time: '2025-10-15T09:00:00Z'
      });
      expect(response.body).toHaveProperty('speeches');
      expect(Array.isArray(response.body.speeches)).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .get(`/sessions/${fakeSessionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/sessions/:sessionId - Update Session', () => {
    it('should update session title and description', async () => {
      const response = await request(API_BASE_URL)
        .put(`/sessions/${testSessionId1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Morning Session',
          description: 'New description'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: testSessionId1,
        title: 'Updated Morning Session',
        description: 'New description'
      });
      expect(response.body).toHaveProperty('updated_at');
    });

    it('should auto-reorder when scheduled_time changes', async () => {
      const response = await request(API_BASE_URL)
        .put(`/sessions/${testSessionId1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          scheduled_time: '2025-10-15T09:30:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.scheduled_time).toBe('2025-10-15T09:30:00Z');
      expect(response.body.display_order).toBeNull(); // Reset to null
      expect(response.body.reordered).toBe(true);
      expect(response.body.message).toContain('automatically reordered');
    });

    it('should reject update for non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/sessions/${fakeSessionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Update' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/sessions/:sessionId - Delete Session', () => {
    it('should delete session without speeches', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/sessions/${testSessionId2}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(204);
    });

    it('should reject deleting session with speeches', async () => {
      // First, create a speech in testSessionId1
      await request(API_BASE_URL)
        .post(`/sessions/${testSessionId1}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Speech',
          speaker_name: 'John Doe',
          duration: 30
        });

      const response = await request(API_BASE_URL)
        .delete(`/sessions/${testSessionId1}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot delete session with speeches');
      expect(response.body.speech_count).toBeGreaterThan(0);
      expect(response.body.speeches).toBeDefined();
      expect(Array.isArray(response.body.speeches)).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .delete(`/sessions/${fakeSessionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/events/:eventId/sessions/reorder - Reorder Sessions', () => {
    beforeAll(async () => {
      // Create additional sessions for reordering tests
      const res1 = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Session A',
          scheduled_time: '2025-10-15T09:00:00Z'
        });
      testSessionId1 = res1.body.id;

      const res2 = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Session B',
          scheduled_time: '2025-10-15T11:00:00Z'
        });
      testSessionId2 = res2.body.id;

      const res3 = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Session C',
          scheduled_time: '2025-10-15T14:00:00Z'
        });
      testSessionId3 = res3.body.id;
    });

    it('should manually reorder sessions', async () => {
      const newOrder = [testSessionId3, testSessionId1, testSessionId2];

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          session_ids: newOrder,
          update_scheduled_times: false
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Sessions reordered successfully');
      expect(response.body.sessions).toHaveLength(3);

      // Verify display_order matches new order
      response.body.sessions.forEach((session: any, index: number) => {
        expect(session.id).toBe(newOrder[index]);
        expect(session.display_order).toBe(index);
      });

      expect(response.body.needs_time_update).toBe(true);
      expect(response.body.warning).toContain('Update scheduled times');
    });

    it('should reorder with scheduled time update', async () => {
      const newOrder = [testSessionId1, testSessionId2, testSessionId3];

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          session_ids: newOrder,
          update_scheduled_times: true
        });

      expect(response.status).toBe(200);
      expect(response.body.needs_time_update).toBe(false);
      expect(response.body.warning).toBeNull();
    });

    it('should reject reorder with invalid session IDs', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          session_ids: [fakeSessionId]
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/events/:eventId/sessions - List Sessions', () => {
    it('should list sessions ordered chronologically', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('ordering');
      expect(Array.isArray(response.body.sessions)).toBe(true);

      // When all display_order are null, ordering should be chronological
      const hasManualOrder = response.body.sessions.some((s: any) => s.display_order !== null);
      if (!hasManualOrder) {
        expect(response.body.ordering).toBe('chronological');
      } else {
        expect(response.body.ordering).toBe('manual');
      }
    });

    it('should include speech count for each session', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.sessions.forEach((session: any) => {
        expect(session).toHaveProperty('speech_count');
        expect(typeof session.speech_count).toBe('number');
      });
    });

    it('should return empty list for event with no sessions', async () => {
      // Create a new event without sessions
      const eventRes = await request(API_BASE_URL)
        .post('/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Empty Session Event',
          event_date: '2025-12-20',
          visibility: 'public'
        });
      const emptyEventId = eventRes.body.event.id;

      const response = await request(API_BASE_URL)
        .get(`/events/${emptyEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sessions).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });
});
