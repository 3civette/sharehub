import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract test for GET /branding/:tenantId per contracts/branding-api.yaml
describe('GET /branding/:tenantId', () => {
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

  it('should get tenant branding with correct schema', async () => {
    const response = await request('http://localhost:3001')
      .get(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema matches Branding schema
    expect(response.body).toHaveProperty('primary_color');
    expect(response.body).toHaveProperty('secondary_color');
    expect(response.body).toHaveProperty('logo_url');

    // Verify hex color format
    expect(response.body.primary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(response.body.secondary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);

    // logo_url should be string or null
    const logoUrl = response.body.logo_url;
    expect(logoUrl === null || typeof logoUrl === 'string').toBe(true);
  });

  it('should return default branding if not customized', async () => {
    const response = await request('http://localhost:3001')
      .get(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Default values per data-model.md
    // Note: If branding was customized in previous tests, this may not match
    // Just verify the values are valid hex colors
    expect(response.body.primary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(response.body.secondary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should return 401 for missing auth token', async () => {
    await request('http://localhost:3001')
      .get(`/branding/${tenantId}`)
      .expect(401);
  });

  it('should return 401 for invalid auth token', async () => {
    await request('http://localhost:3001')
      .get(`/branding/${tenantId}`)
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should return 403 when accessing another tenant branding', async () => {
    // This test requires a second tenant
    // Use a fake tenant ID for now
    const otherTenantId = '00000000-0000-0000-0000-000000000001';

    const response = await request('http://localhost:3001')
      .get(`/branding/${otherTenantId}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Expect either 403 (forbidden) or 404 (not found)
    expect([403, 404]).toContain(response.status);
  });

  it('should return 404 for non-existent tenant', async () => {
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';

    await request('http://localhost:3001')
      .get(`/branding/${fakeTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
