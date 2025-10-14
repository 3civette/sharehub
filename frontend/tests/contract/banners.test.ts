import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract tests for Banner Advertisement System API
// Feature: 010-ok-now-i
// Specification: specs/010-ok-now-i/contracts/banners.yml

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_ADMIN_EMAIL = 'admin@sharehub.test';
const TEST_ADMIN_PASSWORD = 'ShareHub2025!';

describe('Banner API Contract Tests', () => {
  let authToken: string;
  let validEventId: string;
  let validTenantId: string;

  beforeAll(async () => {
    // TODO: Login to get auth token from Supabase
    // For now, this test will fail as the endpoints don't exist yet
    // This is expected for TDD approach

    // Mock IDs for testing
    validEventId = '00000000-0000-0000-0000-000000000001';
    validTenantId = '00000000-0000-0000-0000-000000000002';
  });

  // ===================
  // T006: POST /api/events/[id]/banners - Upload Banner
  // ===================
  describe('POST /api/events/[id]/banners', () => {
    it.todo('should successfully upload banner to available slot', async () => {
      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake-jpeg-data'), 'banner-slot-1.jpg')
        .field('slot_number', '1')
        .field('click_url', 'https://example.com/sponsor')
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify response schema
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('event_id', validEventId);
      expect(response.body).toHaveProperty('slot_number', 1);
      expect(response.body).toHaveProperty('storage_path');
      expect(response.body).toHaveProperty('filename', 'banner-slot-1.jpg');
      expect(response.body).toHaveProperty('file_size');
      expect(response.body).toHaveProperty('mime_type');
      expect(response.body).toHaveProperty('click_url', 'https://example.com/sponsor');
      expect(response.body).toHaveProperty('is_active', true);
      expect(response.body).toHaveProperty('created_at');

      // Verify storage_path format (tenant-{id}/event-{id}/banner-{id}-slot-{num}.ext)
      expect(response.body.storage_path).toMatch(
        /^tenant-[^/]+\/event-[^/]+\/banner-[^/]+-slot-\d+\.(jpg|png|webp)$/
      );

      // Verify banner ID is valid UUID
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it.todo('should accept banner without click_url (optional field)', async () => {
      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake-image-data'), 'banner-no-url.png')
        .field('slot_number', '2')
        .expect(201);

      expect(response.body.click_url).toBeNull();
    });

    it.todo('should reject file larger than 5MB', async () => {
      const largeFile = Buffer.alloc(5242881); // 5MB + 1 byte

      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'huge-banner.jpg')
        .field('slot_number', '1')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('FILE_SIZE_EXCEEDS_LIMIT');
      expect(response.body.message).toContain('5MB');
      expect(response.body.field).toBe('file_size');
    });

    it.todo('should reject invalid file types (only JPEG/PNG/WebP allowed)', async () => {
      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake-pdf-data'), 'banner.pdf')
        .field('slot_number', '1')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('INVALID_FILE_TYPE');
      expect(response.body.message).toContain('JPEG, PNG, WebP');
      expect(response.body.field).toBe('mime_type');
    });

    it.todo('should accept all allowed file types (JPEG, PNG, WebP)', async () => {
      const allowedFiles = [
        { buffer: Buffer.from('jpeg-data'), filename: 'banner.jpg', mimetype: 'image/jpeg' },
        { buffer: Buffer.from('png-data'), filename: 'banner.png', mimetype: 'image/png' },
        { buffer: Buffer.from('webp-data'), filename: 'banner.webp', mimetype: 'image/webp' },
      ];

      for (const file of allowedFiles) {
        const response = await request(BASE_URL)
          .post(`/api/events/${validEventId}/banners`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', file.buffer, file.filename)
          .field('slot_number', '1');

        expect(response.status).toBe(201);
        expect(response.body.mime_type).toBe(file.mimetype);
      }
    });

    it.todo('should reject invalid slot_number (must be 1-5)', async () => {
      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('image-data'), 'banner.jpg')
        .field('slot_number', '6')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('INVALID_SLOT_NUMBER');
      expect(response.body.message).toContain('1 and 5');
      expect(response.body.field).toBe('slot_number');
    });

    it.todo('should reject duplicate banner for same slot (uniqueness constraint)', async () => {
      // First upload should succeed
      await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('image-data'), 'banner1.jpg')
        .field('slot_number', '3')
        .expect(201);

      // Second upload to same slot should fail
      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('image-data'), 'banner2.jpg')
        .field('slot_number', '3')
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.error).toBe('SLOT_ALREADY_OCCUPIED');
      expect(response.body.message).toContain('Slot 3');
      expect(response.body.field).toBe('slot_number');
    });

    it.todo('should reject invalid click_url format', async () => {
      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('image-data'), 'banner.jpg')
        .field('slot_number', '1')
        .field('click_url', 'not-a-valid-url')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('INVALID_URL_FORMAT');
      expect(response.body.field).toBe('click_url');
    });

    it.todo('should reject request without authentication', async () => {
      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .attach('file', Buffer.from('image-data'), 'banner.jpg')
        .field('slot_number', '1')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it.todo('should reject request from non-admin user (tenant isolation)', async () => {
      const otherTenantToken = 'token-for-different-tenant';

      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .attach('file', Buffer.from('image-data'), 'banner.jpg')
        .field('slot_number', '1')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('FORBIDDEN');
      expect(response.body.message).toContain('tenant');
    });

    it.todo('should complete upload within 10 seconds (performance requirement)', async () => {
      const testFile = Buffer.alloc(5242880); // 5MB (max size)

      const startTime = Date.now();

      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile, 'large-banner.jpg')
        .field('slot_number', '1');

      const duration = Date.now() - startTime;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(10000); // Performance target: <10s
    });
  });

  // ===================
  // T007: GET /api/events/[id]/banners - List Banners
  // ===================
  describe('GET /api/events/[id]/banners', () => {
    it.todo('should return all banners for event (including inactive)', async () => {
      const response = await request(BASE_URL)
        .get(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify each banner has required fields
      response.body.forEach((banner: any) => {
        expect(banner).toHaveProperty('id');
        expect(banner).toHaveProperty('event_id', validEventId);
        expect(banner).toHaveProperty('slot_number');
        expect(banner).toHaveProperty('storage_path');
        expect(banner).toHaveProperty('filename');
        expect(banner).toHaveProperty('file_size');
        expect(banner).toHaveProperty('mime_type');
        expect(banner).toHaveProperty('is_active');
        expect(banner).toHaveProperty('created_at');
      });

      // Verify slot_numbers are within valid range
      response.body.forEach((banner: any) => {
        expect(banner.slot_number).toBeGreaterThanOrEqual(1);
        expect(banner.slot_number).toBeLessThanOrEqual(5);
      });
    });

    it.todo('should return empty array for event with no banners', async () => {
      const eventWithNoBanners = '00000000-0000-0000-0000-000000000099';

      const response = await request(BASE_URL)
        .get(`/api/events/${eventWithNoBanners}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it.todo('should not include soft-deleted banners', async () => {
      const response = await request(BASE_URL)
        .get(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify none have deleted_at set
      response.body.forEach((banner: any) => {
        expect(banner.deleted_at).toBeNull();
      });
    });

    it.todo('should require authentication', async () => {
      const response = await request(BASE_URL)
        .get(`/api/events/${validEventId}/banners`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it.todo('should enforce tenant isolation (RLS)', async () => {
      const otherTenantToken = 'token-for-different-tenant';

      const response = await request(BASE_URL)
        .get(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('FORBIDDEN');
    });

    it.todo('should respond within 500ms (performance requirement)', async () => {
      const startTime = Date.now();

      const response = await request(BASE_URL)
        .get(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });

  // ===================
  // T008: PATCH /api/banners/[id] - Update Banner
  // ===================
  describe('PATCH /api/banners/[id]', () => {
    let bannerId: string;

    beforeAll(() => {
      bannerId = '00000000-0000-0000-0000-000000000003';
    });

    it.todo('should successfully update banner active status', async () => {
      const response = await request(BASE_URL)
        .patch(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_active: false })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe(bannerId);
      expect(response.body.is_active).toBe(false);
      expect(response.body.updated_at).toBeTruthy();
    });

    it.todo('should successfully update click_url', async () => {
      const newUrl = 'https://new-sponsor.com';

      const response = await request(BASE_URL)
        .patch(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ click_url: newUrl })
        .expect(200);

      expect(response.body.click_url).toBe(newUrl);
    });

    it.todo('should allow removing click_url (set to null)', async () => {
      const response = await request(BASE_URL)
        .patch(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ click_url: null })
        .expect(200);

      expect(response.body.click_url).toBeNull();
    });

    it.todo('should reject update with invalid click_url', async () => {
      const response = await request(BASE_URL)
        .patch(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ click_url: 'invalid-url' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('INVALID_URL_FORMAT');
      expect(response.body.field).toBe('click_url');
    });

    it.todo('should reject update of immutable fields (slot_number, storage_path, etc.)', async () => {
      const response = await request(BASE_URL)
        .patch(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ slot_number: 5 }) // Immutable field
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('IMMUTABLE_FIELD');
      expect(response.body.field).toBe('slot_number');
    });

    it.todo('should require authentication', async () => {
      const response = await request(BASE_URL)
        .patch(`/api/banners/${bannerId}`)
        .send({ is_active: false })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it.todo('should enforce tenant isolation', async () => {
      const otherTenantToken = 'token-for-different-tenant';

      const response = await request(BASE_URL)
        .patch(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .send({ is_active: false })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('FORBIDDEN');
    });

    it.todo('should return 404 for non-existent banner', async () => {
      const nonExistentId = '00000000-0000-0000-0000-999999999999';

      const response = await request(BASE_URL)
        .patch(`/api/banners/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_active: false })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('BANNER_NOT_FOUND');
    });

    it.todo('should respond within 500ms (performance requirement)', async () => {
      const startTime = Date.now();

      const response = await request(BASE_URL)
        .patch(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_active: false });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });

  // ===================
  // T009: DELETE /api/banners/[id] - Soft Delete Banner
  // ===================
  describe('DELETE /api/banners/[id]', () => {
    let bannerId: string;

    beforeAll(() => {
      bannerId = '00000000-0000-0000-0000-000000000004';
    });

    it.todo('should successfully soft-delete banner', async () => {
      const response = await request(BASE_URL)
        .delete(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('deleted');
      expect(response.body.id).toBe(bannerId);
      expect(response.body.deleted_at).toBeTruthy();
    });

    it.todo('should allow banner deletion to free up slot', async () => {
      // Delete existing banner in slot 2
      await request(BASE_URL)
        .delete(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should now be able to upload new banner to slot 2
      const response = await request(BASE_URL)
        .post(`/api/events/${validEventId}/banners`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('new-image'), 'new-banner.jpg')
        .field('slot_number', '2')
        .expect(201);

      expect(response.body.slot_number).toBe(2);
    });

    it.todo('should require authentication', async () => {
      const response = await request(BASE_URL)
        .delete(`/api/banners/${bannerId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it.todo('should enforce tenant isolation', async () => {
      const otherTenantToken = 'token-for-different-tenant';

      const response = await request(BASE_URL)
        .delete(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.error).toBe('FORBIDDEN');
    });

    it.todo('should return 404 for non-existent banner', async () => {
      const nonExistentId = '00000000-0000-0000-0000-999999999999';

      const response = await request(BASE_URL)
        .delete(`/api/banners/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('BANNER_NOT_FOUND');
    });

    it.todo('should also delete file from Supabase Storage', async () => {
      // This test verifies file cleanup happens
      const response = await request(BASE_URL)
        .delete(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // TODO: Verify file no longer exists in Supabase Storage
      // const { data, error } = await supabase.storage
      //   .from('banners')
      //   .download(response.body.storage_path);
      // expect(error).toBeTruthy();
    });

    it.todo('should respond within 500ms (performance requirement)', async () => {
      const startTime = Date.now();

      const response = await request(BASE_URL)
        .delete(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });

  // ===================
  // T010: GET /api/public/events/[slug]/banners - Public Banner Access
  // ===================
  describe('GET /api/public/events/[slug]/banners', () => {
    const publicEventSlug = 'test-event-2025';

    it.todo('should return only active banners for public event (no auth required)', async () => {
      const response = await request(BASE_URL)
        .get(`/api/public/events/${publicEventSlug}/banners`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All banners should be active
      response.body.forEach((banner: any) => {
        expect(banner.is_active).toBe(true);
        expect(banner.deleted_at).toBeNull();
      });

      // Should not include tenant_id (security)
      response.body.forEach((banner: any) => {
        expect(banner).not.toHaveProperty('tenant_id');
      });
    });

    it.todo('should not return inactive banners', async () => {
      const response = await request(BASE_URL)
        .get(`/api/public/events/${publicEventSlug}/banners`)
        .expect(200);

      // Filter should only return active banners
      expect(response.body.every((b: any) => b.is_active === true)).toBe(true);
    });

    it.todo('should return 404 for private event (visibility check)', async () => {
      const privateEventSlug = 'private-event-2025';

      const response = await request(BASE_URL)
        .get(`/api/public/events/${privateEventSlug}/banners`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('EVENT_NOT_PUBLIC');
    });

    it.todo('should return empty array for public event with no active banners', async () => {
      const eventWithNoBanners = 'event-no-banners';

      const response = await request(BASE_URL)
        .get(`/api/public/events/${eventWithNoBanners}/banners`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it.todo('should include signed URLs for banner images', async () => {
      const response = await request(BASE_URL)
        .get(`/api/public/events/${publicEventSlug}/banners`)
        .expect(200);

      response.body.forEach((banner: any) => {
        expect(banner).toHaveProperty('image_url');
        expect(banner.image_url).toContain('supabase');
        expect(banner.image_url).toMatch(/^https?:\/\//);
      });
    });

    it.todo('should respond within 2 seconds (performance requirement)', async () => {
      const startTime = Date.now();

      const response = await request(BASE_URL)
        .get(`/api/public/events/${publicEventSlug}/banners`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // <2s for public page load
    });

    it.todo('should support CORS for public access', async () => {
      const response = await request(BASE_URL)
        .get(`/api/public/events/${publicEventSlug}/banners`)
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });
  });
});
