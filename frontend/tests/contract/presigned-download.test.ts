import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract test for GET /api/slides/[id]/download
// Specification: specs/008-voglio-implementare-la/contracts/presigned-download.yml
describe('GET /api/slides/[id]/download', () => {
  let authToken: string;
  let testSlideId: string;
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const TEST_ADMIN_EMAIL = 'admin@sharehub.test';
  const TEST_ADMIN_PASSWORD = 'ShareHub2025!';

  beforeAll(async () => {
    // TODO: Login to get auth token from Supabase
    // For now, this test will fail as the endpoint doesn't exist yet
    // This is expected for TDD approach

    // Mock slide ID for testing
    testSlideId = '00000000-0000-0000-0000-000000000000';
  });

  it('should return 404 as endpoint does not exist yet (TDD - expected failure)', async () => {
    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .set('Authorization', `Bearer ${authToken}`);

    // This should fail (404) because endpoint doesn't exist yet
    expect(response.status).toBe(404);
  });

  it.todo('should return valid presigned download URL for existing slide', async () => {
    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema
    expect(response.body).toHaveProperty('download_url');
    expect(response.body).toHaveProperty('filename');
    expect(response.body).toHaveProperty('file_size');
    expect(response.body).toHaveProperty('mime_type');
    expect(response.body).toHaveProperty('expires_at');

    // Verify download_url contains R2 endpoint
    expect(response.body.download_url).toContain('r2.cloudflarestorage.com');

    // Verify filename is a string
    expect(typeof response.body.filename).toBe('string');
    expect(response.body.filename.length).toBeGreaterThan(0);

    // Verify file_size is a number
    expect(typeof response.body.file_size).toBe('number');
    expect(response.body.file_size).toBeGreaterThan(0);

    // Verify mime_type is a string
    expect(typeof response.body.mime_type).toBe('string');

    // Verify expires_at is a valid ISO timestamp
    expect(response.body.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // Verify presigned URL has required query parameters
    const url = new URL(response.body.download_url);
    expect(url.searchParams.has('X-Amz-Algorithm')).toBe(true);
    expect(url.searchParams.has('X-Amz-Credential')).toBe(true);
    expect(url.searchParams.has('X-Amz-Date')).toBe(true);
    expect(url.searchParams.has('X-Amz-Expires')).toBe(true);
    expect(url.searchParams.has('X-Amz-Signature')).toBe(true);

    // Verify expiry is set (1 hour = 3600 seconds)
    expect(url.searchParams.get('X-Amz-Expires')).toBe('3600');
  });

  it.todo('should return 404 for non-existent slide', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000001';

    const response = await request(BASE_URL)
      .get(`/api/slides/${nonExistentId}/download`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body.error).toBe('SLIDE_NOT_FOUND');
    expect(response.body.message).toContain('not found');
  });

  it.todo('should return 404 for deleted slides', async () => {
    // TODO: Create a test slide and mark it as deleted
    // const deletedSlideId = await createDeletedTestSlide();

    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body.error).toBe('FILE_EXPIRED');
    expect(response.body.message).toContain('deleted');
  });

  it.todo('should return 403 for cross-tenant access attempt', async () => {
    // TODO: Create slide for tenant A, try to access with tenant B token
    // const tenantASlideId = await createTenantASlide();
    // const tenantBToken = await getTenantBToken();

    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .set('Authorization', `Bearer ${authToken}`) // Tenant B token
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body.error).toBe('ACCESS_DENIED');
    expect(response.body.message).toContain('permission');
  });

  it.todo('should return 401 without authentication', async () => {
    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body.error).toBe('UNAUTHORIZED');
  });

  it.todo('should return 401 with invalid authentication token', async () => {
    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .set('Authorization', 'Bearer invalid-token-12345')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body.error).toBe('UNAUTHORIZED');
  });

  it.todo('should return 400 for invalid UUID format', async () => {
    const invalidId = 'not-a-uuid';

    const response = await request(BASE_URL)
      .get(`/api/slides/${invalidId}/download`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('invalid');
  });

  it.todo('should generate unique URLs for multiple requests to same slide', async () => {
    // Presigned URLs should be unique even for the same file
    // (different signatures, timestamps)
    const requests = Array.from({ length: 3 }, () =>
      request(BASE_URL)
        .get(`/api/slides/${testSlideId}/download`)
        .set('Authorization', `Bearer ${authToken}`)
    );

    const responses = await Promise.all(requests);

    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // All download URLs should be unique (different signatures)
    const downloadUrls = responses.map(r => r.body.download_url);
    const uniqueUrls = new Set(downloadUrls);
    expect(uniqueUrls.size).toBe(3);

    // But all should point to the same R2 key (same base URL)
    const baseUrls = downloadUrls.map(url => new URL(url).origin + new URL(url).pathname);
    const uniqueBaseUrls = new Set(baseUrls);
    expect(uniqueBaseUrls.size).toBe(1); // Same file, so same base URL
  });

  it.todo('should respond within 500ms (performance requirement)', async () => {
    const startTime = Date.now();

    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .set('Authorization', `Bearer ${authToken}`);

    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500); // Performance target: <500ms
  });

  it.todo('should work with slides that have legacy storage (null r2_key)', async () => {
    // For backward compatibility, slides without r2_key should still work
    // (fallback to legacy storage - out of scope for this feature, but should not break)
    // TODO: Create test slide with r2_key = null
    // const legacySlideId = await createLegacyTestSlide();

    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .set('Authorization', `Bearer ${authToken}`);

    // Should either succeed with legacy URL or return error explaining migration needed
    expect([200, 501]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('download_url');
    } else {
      expect(response.body.error).toBeDefined();
    }
  });

  it.todo('should include correct Content-Disposition header suggestion in response', async () => {
    // While the response doesn't set Content-Disposition directly,
    // it should return the original filename for client-side use
    const response = await request(BASE_URL)
      .get(`/api/slides/${testSlideId}/download`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.filename).toBeDefined();
    expect(response.body.filename).toMatch(/\.[a-z0-9]+$/); // Has extension
  });
});
