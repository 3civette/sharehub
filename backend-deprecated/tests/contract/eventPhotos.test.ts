/**
 * Contract Tests: Event Photos API
 *
 * PURPOSE: Verify Event Photos API contracts match spec before implementation exists
 * APPROACH: Test-Driven Development (TDD) - these tests MUST fail initially
 * LOCATION: backend/tests/contract/eventPhotos.test.ts
 * CONTRACT: specs/005-ora-bisogna-implementare/contracts/event-photos-api.md
 *
 * Constitution Principle III: Tests written first, implementation second
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import { loginAsAdmin, createTestEvent, deleteTestEvent, supabase } from '../helpers/testSetup';

const API_BASE_URL = 'http://localhost:3001';
let adminToken: string;
let testTenantId: string;
let testEventId: string;
let testPhotoId: string;
let testCoverPhotoId: string;

describe('Event Photos API Contract Tests', () => {
  beforeAll(async () => {
    // Login as existing admin
    const { token, tenantId } = await loginAsAdmin();
    adminToken = token;
    testTenantId = tenantId;

    // Create test event
    const event = await createTestEvent(testTenantId, {
      slug: 'photo-test-event',
      name: 'Photo Test Event',
      date: '2025-12-15',
      visibility: 'public'
    });
    testEventId = event.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test event and photos
    if (testEventId) {
      // Delete photos first
      await supabase.from('event_photos').delete().eq('event_id', testEventId);
      await deleteTestEvent(testEventId);
    }
  });

  describe('POST /api/events/:eventId/photos - Upload Event Photo', () => {
    it('should upload a photo as cover image', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('is_cover', 'true')
        .attach('photo', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toMatchObject({
        event_id: testEventId,
        tenant_id: testTenantId,
        is_cover: true,
        display_order: 0
      });
      expect(response.body).toHaveProperty('storage_path');
      expect(response.body).toHaveProperty('url');
      expect(response.body.file_size).toBeGreaterThan(0);
      expect(response.body.mime_type).toBe('image/jpeg');

      testCoverPhotoId = response.body.id;
    });

    it('should upload a gallery photo (not cover)', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photo', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.is_cover).toBe(false);
      expect(response.body.display_order).toBeGreaterThan(0);

      testPhotoId = response.body.id;
    });

    it('should reject file larger than 50MB', async () => {
      // Create a large file for testing
      const largeFilePath = path.join(__dirname, '../fixtures/large-file.jpg');

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photo', largeFilePath);

      expect(response.status).toBe(413);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('File too large');
    });

    it('should reject invalid file type', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test.pdf');

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photo', testFilePath);

      expect(response.status).toBe(415);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid file type');
      expect(response.body.allowed_types).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    });

    it('should reject request without authentication', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

      const response = await request(API_BASE_URL)
        .post(`/events/${testEventId}/photos`)
        .attach('photo', testImagePath);

      expect(response.status).toBe(401);
    });

    it('should reject upload for non-existent event', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const fakeEventId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .post(`/events/${fakeEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photo', testImagePath);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Event not found');
    });
  });

  describe('GET /api/events/:eventId/photos - List Event Photos', () => {
    it('should list all photos for an event', async () => {
      const response = await request(API_BASE_URL)
        .get(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('photos');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('cover');
      expect(Array.isArray(response.body.photos)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);

      // Cover photo should be included
      expect(response.body.cover).toMatchObject({
        id: testCoverPhotoId,
        url: expect.any(String)
      });

      // Photos should be ordered by display_order
      const displayOrders = response.body.photos.map((p: any) => p.display_order);
      const sortedOrders = [...displayOrders].sort((a, b) => a - b);
      expect(displayOrders).toEqual(sortedOrders);
    });

    it('should return empty list for event with no photos', async () => {
      // Create a new event without photos
      const emptyEvent = await createTestEvent(testTenantId, {
        slug: 'empty-photo-event',
        name: 'Empty Photo Event',
        date: '2025-12-20',
        visibility: 'public'
      });

      const response = await request(API_BASE_URL)
        .get(`/api/events/${emptyEvent.id}/photos`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.photos).toEqual([]);
      expect(response.body.total).toBe(0);
      expect(response.body.cover).toBeNull();

      // Cleanup
      await deleteTestEvent(emptyEvent.id);
    });
  });

  describe('PUT /api/events/:eventId/photos/:photoId/set-cover - Set Cover Image', () => {
    it('should set a gallery photo as cover', async () => {
      const response = await request(API_BASE_URL)
        .put(`/events/${testEventId}/photos/${testPhotoId}/set-cover`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Cover image updated');
      expect(response.body.photo).toMatchObject({
        id: testPhotoId,
        is_cover: true
      });
      expect(response.body.previous_cover).toMatchObject({
        id: testCoverPhotoId,
        is_cover: false
      });
    });

    it('should reject setting non-existent photo as cover', async () => {
      const fakePhotoId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/events/${testEventId}/photos/${fakePhotoId}/set-cover`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Photo not found');
    });
  });

  describe('PUT /api/events/:eventId/photos/reorder - Reorder Photos', () => {
    it('should reorder gallery photos', async () => {
      // First, get current photos to get their IDs
      const listRes = await request(API_BASE_URL)
        .get(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`);

      const galleryPhotos = listRes.body.photos.filter((p: any) => !p.is_cover);
      const photoIds = galleryPhotos.map((p: any) => p.id).reverse(); // Reverse order

      const response = await request(API_BASE_URL)
        .put(`/events/${testEventId}/photos/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ photo_ids: photoIds });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Photos reordered successfully');
      expect(response.body.photos).toHaveLength(photoIds.length);

      // Verify display_order matches new order
      response.body.photos.forEach((photo: any, index: number) => {
        expect(photo.id).toBe(photoIds[index]);
        expect(photo.display_order).toBe(index + 1); // Gallery starts at 1
      });
    });

    it('should reject reorder with invalid photo IDs', async () => {
      const fakePhotoId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .put(`/events/${testEventId}/photos/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ photo_ids: [fakePhotoId] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid photo IDs');
    });
  });

  describe('DELETE /api/events/:eventId/photos/:photoId - Delete Photo', () => {
    it('should delete a gallery photo', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/events/${testEventId}/photos/${testCoverPhotoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Photo deleted successfully');
      expect(response.body.deleted).toMatchObject({
        id: testCoverPhotoId,
        filename: expect.any(String)
      });
    });

    it('should reject deleting cover photo when gallery photos exist', async () => {
      // Upload a new cover
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const uploadRes = await request(API_BASE_URL)
        .post(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('is_cover', 'true')
        .attach('photo', testImagePath);
      const newCoverId = uploadRes.body.id;

      // Try to delete cover while gallery exists
      const response = await request(API_BASE_URL)
        .delete(`/events/${testEventId}/photos/${newCoverId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot delete cover image');
      expect(response.body.message).toContain('Set another photo as cover');
      expect(response.body.gallery_count).toBeGreaterThan(0);
    });

    it('should delete cover photo if it is the last photo', async () => {
      // First, delete all gallery photos
      const listRes = await request(API_BASE_URL)
        .get(`/events/${testEventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`);

      const galleryPhotos = listRes.body.photos.filter((p: any) => !p.is_cover);
      for (const photo of galleryPhotos) {
        await request(API_BASE_URL)
          .delete(`/events/${testEventId}/photos/${photo.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }

      // Now delete cover
      const cover = listRes.body.photos.find((p: any) => p.is_cover);
      const response = await request(API_BASE_URL)
        .delete(`/events/${testEventId}/photos/${cover.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject deleting non-existent photo', async () => {
      const fakePhotoId = '00000000-0000-0000-0000-000000000000';

      const response = await request(API_BASE_URL)
        .delete(`/events/${testEventId}/photos/${fakePhotoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Photo not found');
    });
  });
});
