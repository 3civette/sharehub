import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';

// Contract test for POST /branding/:tenantId/logo per contracts/branding-api.yaml
describe('POST /branding/:tenantId/logo', () => {
  let authToken: string;
  let tenantId: string;
  const TEST_ADMIN_EMAIL = 'admin@sharehub.test';
  const TEST_ADMIN_PASSWORD = 'ShareHub2025!';

  beforeAll(async () => {
    // Login to get auth token and tenant_id
    const loginResponse = await request('http://localhost:3001')
      .post('/auth/login')
      .send({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD
      });

    authToken = loginResponse.body.token;
    tenantId = loginResponse.body.tenant_id || '523c2648-f980-4c9e-8e53-93d812cfa79f';
  });

  it('should upload PNG logo and return 200 with logo_url', async () => {
    // Create a small test PNG file (1x1 pixel)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const response = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', pngBuffer, 'test-logo.png')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema
    expect(response.body).toHaveProperty('logo_url');
    expect(typeof response.body.logo_url).toBe('string');
    expect(response.body.logo_url).toContain(tenantId);

    // Verify logo URL is accessible (basic check)
    expect(response.body.logo_url).toMatch(/^https?:\/\//);
  });

  it('should upload JPG logo successfully', async () => {
    // Create a minimal valid JPEG (1x1 pixel)
    const jpgBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA',
      'base64'
    );

    const response = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', jpgBuffer, 'test-logo.jpg')
      .expect(200);

    expect(response.body).toHaveProperty('logo_url');
  });

  it('should upload SVG logo successfully', async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>';
    const svgBuffer = Buffer.from(svgContent);

    const response = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', svgBuffer, 'test-logo.svg')
      .expect(200);

    expect(response.body).toHaveProperty('logo_url');
  });

  it('should update branding.logo_url after upload', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const uploadResponse = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', pngBuffer, 'updated-logo.png')
      .expect(200);

    const logoUrl = uploadResponse.body.logo_url;

    // Verify branding GET reflects new logo
    const brandingResponse = await request('http://localhost:3001')
      .get(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(brandingResponse.body.logo_url).toBe(logoUrl);
  });

  it('should replace existing logo when uploading new one', async () => {
    // Upload first logo
    const png1Buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const response1 = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', png1Buffer, 'logo1.png')
      .expect(200);

    const firstLogoUrl = response1.body.logo_url;

    // Upload second logo
    const png2Buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const response2 = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', png2Buffer, 'logo2.png')
      .expect(200);

    const secondLogoUrl = response2.body.logo_url;

    // URLs should be different
    expect(secondLogoUrl).not.toBe(firstLogoUrl);

    // Current branding should have second logo
    const brandingResponse = await request('http://localhost:3001')
      .get(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(brandingResponse.body.logo_url).toBe(secondLogoUrl);
  });

  it('should return 400 for file exceeding 2MB', async () => {
    // Create a buffer > 2MB (2 * 1024 * 1024 bytes)
    const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1, 'a');

    const response = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', largeBuffer, 'large-logo.png')
      .expect(400);

    expect(response.body.message).toMatch(/size|large|2MB/i);
  });

  it('should return 400 for invalid file type (PDF)', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4\n');

    const response = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', pdfBuffer, 'invalid.pdf')
      .expect(400);

    expect(response.body.message).toMatch(/type|format|png|jpg|svg/i);
  });

  it('should return 400 for invalid file type (TXT)', async () => {
    const txtBuffer = Buffer.from('This is not an image');

    const response = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', txtBuffer, 'invalid.txt')
      .expect(400);

    expect(response.body.message).toMatch(/type|format/i);
  });

  it('should return 400 for missing file', async () => {
    const response = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.message).toMatch(/logo|file|required/i);
  });

  it('should return 400 for wrong field name (not "logo")', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const response = await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', pngBuffer, 'test.png') // Wrong field name
      .expect(400);

    expect(response.body.message).toMatch(/logo|field/i);
  });

  it('should return 401 for missing auth token', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .attach('logo', pngBuffer, 'test.png')
      .expect(401);
  });

  it('should return 401 for invalid auth token', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    await request('http://localhost:3001')
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', 'Bearer invalid-token')
      .attach('logo', pngBuffer, 'test.png')
      .expect(401);
  });

  it('should return 403 when uploading logo for another tenant', async () => {
    const otherTenantId = '00000000-0000-0000-0000-000000000001';
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const response = await request('http://localhost:3001')
      .post(`/branding/${otherTenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', pngBuffer, 'test.png');

    // Expect either 403 (forbidden) or 404 (not found)
    expect([403, 404]).toContain(response.status);
  });
});
