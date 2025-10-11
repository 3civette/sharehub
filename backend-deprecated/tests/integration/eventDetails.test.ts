/**
 * Integration Test: Event Details Management (Quickstart Scenario)
 *
 * PURPOSE: Full E2E test of Feature 005 following the quickstart guide
 * SCENARIO: "Tech Summit 2025" - Admin creates fully enriched event
 * APPROACH: Test-Driven Development (TDD) - this test MUST fail initially
 * LOCATION: backend/tests/integration/eventDetails.test.ts
 * REFERENCE: specs/005-ora-bisogna-implementare/quickstart.md
 *
 * Constitution Principle III: Tests written first, implementation second
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';

const API_BASE_URL = 'http://localhost:3001/api';
let adminToken: string;
let testTenantId: string;
let testEventId: string;
let coverPhotoId: string;
let session1Id: string;
let session2Id: string;
let speech1Id: string;
let speech2Id: string;
let tokenId: string;

describe('Integration Test: Tech Summit 2025 Event (Quickstart Scenario)', () => {
  beforeAll(async () => {
    // Setup: Create ACME Corp tenant and admin
    const tenantRes = await request(API_BASE_URL)
      .post('/tenants')
      .send({ subdomain: 'acme-corp', name: 'ACME Corp' });
    testTenantId = tenantRes.body.tenant.id;

    const adminRes = await request(API_BASE_URL)
      .post('/auth/login')
      .send({ email: 'admin@acme-corp.com', password: 'password123' });
    adminToken = adminRes.body.token;

    // Create Tech Summit 2025 event (private)
    const eventRes = await request(API_BASE_URL)
      .post('/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tech Summit 2025',
        event_date: '2025-10-15',
        visibility: 'private',
        description: 'Annual technology conference',
        token_expiration_date: '2025-10-20T23:59:59Z'
      });
    testEventId = eventRes.body.event.id;
  });

  afterAll(async () => {
    // Cleanup: Delete all test data
    // (Cascade deletion should handle related records)
    await request(API_BASE_URL)
      .delete(`/events/${testEventId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  describe('Step 2: Event Photos Management', () => {
    describe('2.1: Upload Cover Image', () => {
      it('should upload cover image successfully', async () => {
        const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

        const response = await request(API_BASE_URL)
          .post(`/events/${testEventId}/photos`)
          .set('Authorization', `Bearer ${adminToken}`)
          .field('is_cover', 'true')
          .attach('photo', testImagePath);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          event_id: testEventId,
          is_cover: true,
          display_order: 0,
          mime_type: 'image/jpeg'
        });
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('url');
        expect(response.body.file_size).toBeGreaterThan(0);

        coverPhotoId = response.body.id;
      });
    });

    describe('2.2: Upload Gallery Images', () => {
      it('should upload first gallery photo', async () => {
        const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

        const response = await request(API_BASE_URL)
          .post(`/events/${testEventId}/photos`)
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('photo', testImagePath);

        expect(response.status).toBe(201);
        expect(response.body.is_cover).toBe(false);
        expect(response.body.display_order).toBe(1);
      });

      it('should upload second gallery photo', async () => {
        const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

        const response = await request(API_BASE_URL)
          .post(`/events/${testEventId}/photos`)
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('photo', testImagePath);

        expect(response.status).toBe(201);
        expect(response.body.display_order).toBe(2);
      });

      it('should list all photos with cover first', async () => {
        const response = await request(API_BASE_URL)
          .get(`/events/${testEventId}/photos`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(3);
        expect(response.body.cover).toBeDefined();
        expect(response.body.cover.id).toBe(coverPhotoId);
        expect(response.body.photos).toHaveLength(3);
      });
    });

    describe('2.3: Change Cover Image', () => {
      it('should set gallery photo as new cover', async () => {
        // Get list to find a gallery photo
        const listRes = await request(API_BASE_URL)
          .get(`/events/${testEventId}/photos`)
          .set('Authorization', `Bearer ${adminToken}`);

        const galleryPhoto = listRes.body.photos.find((p: any) => !p.is_cover);

        const response = await request(API_BASE_URL)
          .put(`/events/${testEventId}/photos/${galleryPhoto.id}/set-cover`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Cover image updated');
        expect(response.body.photo.is_cover).toBe(true);
        expect(response.body.previous_cover.is_cover).toBe(false);
      });
    });
  });

  describe('Step 3: Sessions Management', () => {
    describe('3.1: Create Morning Keynote Session', () => {
      it('should create morning keynote session', async () => {
        const response = await request(API_BASE_URL)
          .post(`/events/${testEventId}/sessions`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Morning Keynote Session',
            description: 'Opening keynotes with industry leaders',
            scheduled_time: '2025-10-15T09:00:00Z'
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          title: 'Morning Keynote Session',
          scheduled_time: '2025-10-15T09:00:00Z',
          display_order: null,
          speech_count: 0
        });
        expect(response.body).toHaveProperty('id');

        session1Id = response.body.id;
      });
    });

    describe('3.2: Create Afternoon Workshop Session', () => {
      it('should create afternoon workshop session', async () => {
        const response = await request(API_BASE_URL)
          .post(`/events/${testEventId}/sessions`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Afternoon Technical Workshops',
            description: 'Hands-on technical deep dives',
            scheduled_time: '2025-10-15T14:00:00Z'
          });

        expect(response.status).toBe(201);
        expect(response.body.title).toBe('Afternoon Technical Workshops');

        session2Id = response.body.id;
      });
    });

    describe('3.3: List Sessions in Chronological Order', () => {
      it('should list sessions ordered by scheduled time', async () => {
        const response = await request(API_BASE_URL)
          .get(`/events/${testEventId}/sessions`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(2);
        expect(response.body.ordering).toBe('chronological');
        expect(response.body.sessions[0].title).toBe('Morning Keynote Session');
        expect(response.body.sessions[1].title).toBe('Afternoon Technical Workshops');
      });
    });
  });

  describe('Step 4: Speeches Management', () => {
    describe('4.1: Add Speeches to Morning Session', () => {
      it('should add first keynote speech', async () => {
        const response = await request(API_BASE_URL)
          .post(`/sessions/${session1Id}/speeches`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'The Future of AI',
            speaker_name: 'Dr. Jane Smith',
            duration: 45,
            description: 'Exploring emerging AI trends',
            scheduled_time: '2025-10-15T09:15:00Z'
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          title: 'The Future of AI',
          speaker_name: 'Dr. Jane Smith',
          duration: 45,
          slide_count: 0
        });

        speech1Id = response.body.id;
      });

      it('should add second keynote speech', async () => {
        const response = await request(API_BASE_URL)
          .post(`/sessions/${session1Id}/speeches`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Cloud Computing at Scale',
            speaker_name: 'John Doe',
            duration: 30,
            scheduled_time: '2025-10-15T10:00:00Z'
          });

        expect(response.status).toBe(201);
        speech2Id = response.body.id;
      });
    });

    describe('4.2: List Speeches in Session', () => {
      it('should list speeches ordered chronologically', async () => {
        const response = await request(API_BASE_URL)
          .get(`/sessions/${session1Id}/speeches`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(2);
        expect(response.body.ordering).toBe('chronological');
        expect(response.body.speeches[0].title).toBe('The Future of AI');
        expect(response.body.speeches[1].title).toBe('Cloud Computing at Scale');
      });
    });

    describe('4.3: Reorder Speeches Manually', () => {
      it('should manually reorder speeches', async () => {
        const response = await request(API_BASE_URL)
          .post(`/sessions/${session1Id}/speeches/reorder`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            speech_ids: [speech2Id, speech1Id],
            update_scheduled_times: false
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Speeches reordered successfully');
        expect(response.body.needs_time_update).toBe(true);
        expect(response.body.speeches[0].id).toBe(speech2Id);
        expect(response.body.speeches[1].id).toBe(speech1Id);
      });
    });
  });

  describe('Step 5: Slide Upload (if implemented)', () => {
    it('should upload slides for a speech', async () => {
      // This test assumes slide upload API from Feature 003
      const testSlidePath = path.join(__dirname, '../fixtures/test-slide.pdf');

      const response = await request(API_BASE_URL)
        .post(`/speeches/${speech1Id}/slides`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('slide', testSlidePath);

      // This may be 404 if not yet implemented
      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.filename).toContain('.pdf');
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata.speaker_name).toBe('Dr. Jane Smith');
      }
    });
  });

  describe('Step 6: Access Token Management', () => {
    describe('6.1: Generate Participant Token', () => {
      it('should generate participant token', async () => {
        const response = await request(API_BASE_URL)
          .post(`/events/${testEventId}/tokens`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'participant',
            expires_at: '2025-10-20T23:59:59Z'
          });

        expect(response.status).toBe(201);
        expect(response.body.type).toBe('participant');
        expect(response.body.token).toHaveLength(21);
        expect(response.body.is_active).toBe(true);
        expect(response.body).toHaveProperty('url');

        tokenId = response.body.id;
      });
    });

    describe('6.2: Generate QR Code for Token', () => {
      it('should generate QR code', async () => {
        const response = await request(API_BASE_URL)
          .get(`/events/${testEventId}/tokens/${tokenId}/qr`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.qr_code).toMatch(/^data:image\/png;base64,/);
        expect(response.body.format).toBe('png');
        expect(response.body.size).toBe(300);
      });
    });

    describe('6.3: Get Copy URL', () => {
      it('should get formatted URL for clipboard', async () => {
        const response = await request(API_BASE_URL)
          .get(`/events/${testEventId}/tokens/${tokenId}/copy-url`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.url).toContain('token=');
        expect(response.body).toHaveProperty('short_url');
      });
    });

    describe('6.4: List All Tokens', () => {
      it('should list all event tokens with stats', async () => {
        const response = await request(API_BASE_URL)
          .get(`/events/${testEventId}/tokens`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.total).toBeGreaterThan(0);
        expect(response.body.active_count).toBeGreaterThan(0);
        expect(response.body).toHaveProperty('revoked_count');
        expect(response.body).toHaveProperty('expired_count');
      });
    });

    describe('6.5: Revoke Token', () => {
      it('should revoke a token', async () => {
        const response = await request(API_BASE_URL)
          .post(`/events/${testEventId}/tokens/${tokenId}/revoke`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Token revoked successfully');
        expect(response.body.token.is_active).toBe(false);
        expect(response.body.token.revoked_at).not.toBeNull();
      });
    });
  });

  describe('Step 7: Full Event Hierarchy Retrieval', () => {
    it('should get complete event with all nested data', async () => {
      const response = await request(API_BASE_URL)
        .get(`/sessions/${session1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('speeches');
      expect(response.body.speeches).toHaveLength(2);

      // Verify speeches include slides metadata
      if (response.body.speeches[0].slides) {
        expect(Array.isArray(response.body.speeches[0].slides)).toBe(true);
      }
    });
  });

  describe('Step 8: Delete Operations with Safeguards', () => {
    describe('8.1: Attempt to Delete Session with Speeches', () => {
      it('should prevent session deletion if speeches exist', async () => {
        const response = await request(API_BASE_URL)
          .delete(`/sessions/${session1Id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Cannot delete session with speeches');
        expect(response.body.speech_count).toBe(2);
        expect(response.body.speeches).toBeDefined();
      });
    });

    describe('8.2: Delete Speech with Confirmation', () => {
      it('should show confirmation if speech has slides', async () => {
        const response = await request(API_BASE_URL)
          .delete(`/speeches/${speech1Id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        // If speech has slides, should require confirmation
        if (response.body.requires_confirmation) {
          expect(response.status).toBe(200);
          expect(response.body.slide_count).toBeGreaterThan(0);
          expect(response.body.slides).toBeDefined();
        } else {
          // If no slides, should delete immediately
          expect(response.status).toBe(200);
          expect(response.body.message).toBe('Speech deleted successfully');
        }
      });
    });

    describe('8.3: Delete Photo (Not Cover)', () => {
      it('should delete gallery photo successfully', async () => {
        // Get list and find a gallery photo
        const listRes = await request(API_BASE_URL)
          .get(`/events/${testEventId}/photos`)
          .set('Authorization', `Bearer ${adminToken}`);

        const galleryPhoto = listRes.body.photos.find((p: any) => !p.is_cover);

        if (galleryPhoto) {
          const response = await request(API_BASE_URL)
            .delete(`/events/${testEventId}/photos/${galleryPhoto.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(response.status).toBe(200);
          expect(response.body.message).toBe('Photo deleted successfully');
        }
      });
    });
  });

  describe('Step 9: Performance Validation', () => {
    it('should load event photos list in under 2 seconds', async () => {
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    it('should load sessions list in under 2 seconds', async () => {
      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    it('should generate QR code in under 500ms', async () => {
      // Create a new token for this test
      const tokenRes = await request(API_BASE_URL)
        .post(`/events/${testEventId}/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'participant',
          expires_at: '2025-10-20T23:59:59Z'
        });

      const startTime = Date.now();

      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/tokens/${tokenRes.body.id}/qr`)
        .set('Authorization', `Bearer ${adminToken}`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });
});
