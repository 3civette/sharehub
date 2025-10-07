import { describe, it, expect } from 'vitest';
import request from 'supertest';

// This test will fail until T021 implements the endpoint
describe('GET /api/tenants/:tenantId/branding', () => {
  const testTenantId = '523c2648-f980-4c9e-8e53-93d812cfa79f';

  it('should return tenant branding config with correct schema', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/tenants/${testTenantId}/branding`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('branding_config');

    const config = response.body.branding_config;

    expect(config).toHaveProperty('colors');
    expect(config.colors).toHaveProperty('primary');
    expect(config.colors).toHaveProperty('secondary');

    // Verify hex color format
    expect(config.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(config.colors.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);

    expect(config).toHaveProperty('logo_url');
    expect(config).toHaveProperty('advertisements');
    expect(Array.isArray(config.advertisements)).toBe(true);
  });

  it('should return default branding for new tenant', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/tenants/${testTenantId}/branding`)
      .expect(200);

    const config = response.body.branding_config;

    // Default colors should be set
    expect(config.colors.primary).toBeDefined();
    expect(config.colors.secondary).toBeDefined();
  });

  it('should validate advertisement structure', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/tenants/${testTenantId}/branding`)
      .expect(200);

    const ads = response.body.branding_config.advertisements;

    ads.forEach((ad: any) => {
      if (ad) {
        expect(ad).toHaveProperty('image_url');
        expect(ad).toHaveProperty('link_url');
      }
    });
  });

  it('should return 404 for non-existent tenant', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request('http://localhost:3001')
      .get(`/api/tenants/${fakeId}/branding`)
      .expect(404);
  });
});
