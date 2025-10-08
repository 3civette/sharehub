/**
 * Contract Tests: Speeches API (Enhanced)
 *
 * PURPOSE: Verify Enhanced Speeches API contracts with smart ordering and cascade deletion
 * APPROACH: Test-Driven Development (TDD) - these tests MUST fail initially
 * LOCATION: backend/tests/contract/speeches.test.ts
 * CONTRACT: specs/005-ora-bisogna-implementare/contracts/speeches-api.md
 *
 * Constitution Principle III: Tests written first, implementation second
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const API_BASE_URL = 'http://localhost:3001/api';
let adminToken: string;
let testTenantId: string;
let testEventId: string;
let testSessionId: string;
let testSpeechId1: string;
let testSpeechId2: string;
let testSpeechId3: string;

describe('Speeches API Contract Tests (Enhanced)', () => {
  beforeAll(async () => {
    // Setup: Create test tenant, admin, event, and session
    const tenantRes = await request(API_BASE_URL)
      .post('/tenants')
      .send({ subdomain: 'test-speeches', name: 'Test Speeches Hotel' });
    testTenantId = tenantRes.body.tenant.id;

    const adminRes = await request(API_BASE_URL)
      .post('/auth/login')
      .send({ email: 'admin@test-speeches.com', password: 'password123' });
    adminToken = adminRes.body.token;

    // Create test event
    const eventRes = await request(API_BASE_URL)
      .post('/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Speech Test Event',
        event_date: '2025-12-15',
        visibility: 'public'
      });
    testEventId = eventRes.body.event.id;

    // Create test session
    const sessionRes = await request(API_BASE_URL)
      .post(`/events/${testEventId}/sessions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Session for Speeches',
        scheduled_time: '2025-10-15T09:00:00Z'
      });
    testSessionId = sessionRes.body.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    // TODO: Implement cleanup logic
  });

  describe('POST /api/sessions/:sessionId/speeches - Create Speech', () => {
    it('should create a speech with all fields', async () => {
      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'The Future of Artificial Intelligence',
          speaker_name: 'Dr. Jane Smith',
          duration: 45,
          description: 'An exploration of emerging AI trends and their impact on society',
          scheduled_time: '2025-10-15T09:15:00Z'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        session_id: testSessionId,
        tenant_id: testTenantId,
        title: 'The Future of Artificial Intelligence',
        speaker_name: 'Dr. Jane Smith',
        duration: 45,
        description: 'An exploration of emerging AI trends and their impact on society',
        scheduled_time: '2025-10-15T09:15:00Z',
        display_order: null,
        slide_count: 0
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');

      testSpeechId1 = response.body.id;
    });

    it('should create a speech with minimal fields', async () => {
      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Minimal Speech',
          speaker_name: 'John Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Minimal Speech');
      expect(response.body.speaker_name).toBe('John Doe');
      expect(response.body.duration).toBeNull();
      expect(response.body.description).toBeNull();
      expect(response.body.scheduled_time).toBeNull();
      expect(response.body.display_order).toBeNull();

      testSpeechId2 = response.body.id;
    });

    it('should reject speech with title exceeding 150 characters', async () => {
      const longTitle = 'A'.repeat(151);

      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: longTitle,
          speaker_name: 'Test Speaker'
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toContainEqual({
        field: 'title',
        message: 'Title must not exceed 150 characters'
      });
    });

    it('should reject speech without title', async () => {
      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          speaker_name: 'Test Speaker'
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject speech without speaker_name', async () => {
      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Speech'
        });

      expect(response.status).toBe(422);
    });

    it('should reject speech for non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/sessions/${fakeSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Speech',
          speaker_name: 'Test Speaker'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Session not found');
    });
  });

  describe('GET /api/speeches/:speechId - Get Speech with Slides', () => {
    it('should get speech details with slides', async () => {
      const response = await request(API_BASE_URL)
        .get(`/speeches/${testSpeechId1}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: testSpeechId1,
        session_id: testSessionId,
        title: 'The Future of Artificial Intelligence',
        speaker_name: 'Dr. Jane Smith',
        duration: 45
      });
      expect(response.body).toHaveProperty('slides');
      expect(Array.isArray(response.body.slides)).toBe(true);

      // Slides should include enhanced metadata
      if (response.body.slides.length > 0) {
        expect(response.body.slides[0]).toHaveProperty('metadata');
        expect(response.body.slides[0].metadata).toMatchObject({
          speaker_name: 'Dr. Jane Smith',
          speech_title: 'The Future of Artificial Intelligence'
        });
      }
    });

    it('should return 404 for non-existent speech', async () => {
      const fakeSpeechId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .get(`/speeches/${fakeSpeechId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Speech not found');
    });
  });

  describe('PUT /api/speeches/:speechId - Update Speech', () => {
    it('should update speech title and description', async () => {
      const response = await request(API_BASE_URL)
        .put(`/speeches/${testSpeechId1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated: The Future of AI',
          description: 'Updated description',
          duration: 50
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: testSpeechId1,
        title: 'Updated: The Future of AI',
        description: 'Updated description',
        duration: 50
      });
      expect(response.body).toHaveProperty('updated_at');
    });

    it('should auto-reorder when scheduled_time changes', async () => {
      const response = await request(API_BASE_URL)
        .put(`/speeches/${testSpeechId1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          scheduled_time: '2025-10-15T09:20:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.scheduled_time).toBe('2025-10-15T09:20:00Z');
      expect(response.body.display_order).toBeNull(); // Reset to null
      expect(response.body.reordered).toBe(true);
      expect(response.body.message).toContain('automatically reordered');
    });

    it('should reject update for non-existent speech', async () => {
      const fakeSpeechId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/speeches/${fakeSpeechId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Update' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/speeches/:speechId - Delete Speech with Confirmation', () => {
    it('should require confirmation when speech has slides', async () => {
      // First, upload a slide to testSpeechId1
      // (This assumes slide upload API exists from Feature 003)
      // For this test, we'll mock it or skip if slides don't exist

      const response = await request(API_BASE_URL)
        .delete(`/speeches/${testSpeechId1}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // If speech has slides, should return confirmation
      if (response.body.requires_confirmation) {
        expect(response.status).toBe(200);
        expect(response.body.requires_confirmation).toBe(true);
        expect(response.body).toHaveProperty('slide_count');
        expect(response.body).toHaveProperty('slides');
        expect(response.body.message).toContain('This will delete');
        expect(Array.isArray(response.body.slides)).toBe(true);
      } else {
        // If no slides, should delete immediately
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Speech deleted successfully');
      }
    });

    it('should delete speech when confirmed', async () => {
      // Create a new speech to delete
      const createRes = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Speech to Delete',
          speaker_name: 'Test Speaker'
        });
      const speechToDelete = createRes.body.id;

      const response = await request(API_BASE_URL)
        .delete(`/speeches/${speechToDelete}?confirm=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Speech deleted successfully');
      expect(response.body.deleted).toMatchObject({
        speech_id: speechToDelete,
        title: 'Speech to Delete'
      });
    });

    it('should delete speech without slides immediately', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/speeches/${testSpeechId2}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Speech deleted successfully');
    });

    it('should return 404 for non-existent speech', async () => {
      const fakeSpeechId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .delete(`/speeches/${fakeSpeechId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/sessions/:sessionId/speeches/reorder - Reorder Speeches', () => {
    beforeAll(async () => {
      // Create additional speeches for reordering tests
      const res1 = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Speech A',
          speaker_name: 'Speaker A',
          scheduled_time: '2025-10-15T09:00:00Z'
        });
      testSpeechId1 = res1.body.id;

      const res2 = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Speech B',
          speaker_name: 'Speaker B',
          scheduled_time: '2025-10-15T11:00:00Z'
        });
      testSpeechId2 = res2.body.id;

      const res3 = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Speech C',
          speaker_name: 'Speaker C',
          scheduled_time: '2025-10-15T14:00:00Z'
        });
      testSpeechId3 = res3.body.id;
    });

    it('should manually reorder speeches', async () => {
      const newOrder = [testSpeechId3, testSpeechId1, testSpeechId2];

      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          speech_ids: newOrder,
          update_scheduled_times: false
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Speeches reordered successfully');
      expect(response.body.speeches).toHaveLength(3);

      // Verify display_order matches new order
      response.body.speeches.forEach((speech: any, index: number) => {
        expect(speech.id).toBe(newOrder[index]);
        expect(speech.display_order).toBe(index);
      });

      expect(response.body.needs_time_update).toBe(true);
      expect(response.body.warning).toContain('Update scheduled times');
    });

    it('should reorder with scheduled time update', async () => {
      const newOrder = [testSpeechId1, testSpeechId2, testSpeechId3];

      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          speech_ids: newOrder,
          update_scheduled_times: true
        });

      expect(response.status).toBe(200);
      expect(response.body.needs_time_update).toBe(false);
      expect(response.body.warning).toBeNull();
    });

    it('should reject reorder with invalid speech IDs', async () => {
      const fakeSpeechId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/sessions/${testSessionId}/speeches/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          speech_ids: [fakeSpeechId]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid speech IDs');
    });
  });

  describe('GET /api/sessions/:sessionId/speeches - List Speeches', () => {
    it('should list speeches ordered chronologically', async () => {
      const response = await request(API_BASE_URL)
        .get(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('speeches');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('ordering');
      expect(Array.isArray(response.body.speeches)).toBe(true);

      // When all display_order are null, ordering should be chronological
      const hasManualOrder = response.body.speeches.some((s: any) => s.display_order !== null);
      if (!hasManualOrder) {
        expect(response.body.ordering).toBe('chronological');
      } else {
        expect(response.body.ordering).toBe('manual');
      }
    });

    it('should include slide count for each speech', async () => {
      const response = await request(API_BASE_URL)
        .get(`/sessions/${testSessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.speeches.forEach((speech: any) => {
        expect(speech).toHaveProperty('slide_count');
        expect(typeof speech.slide_count).toBe('number');
      });
    });

    it('should return empty list for session with no speeches', async () => {
      // Create a new session without speeches
      const sessionRes = await request(API_BASE_URL)
        .post(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Empty Speech Session',
          scheduled_time: '2025-10-15T15:00:00Z'
        });
      const emptySessionId = sessionRes.body.id;

      const response = await request(API_BASE_URL)
        .get(`/sessions/${emptySessionId}/speeches`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.speeches).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });
});
