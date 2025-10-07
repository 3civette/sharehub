import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract test for PUT /branding/:tenantId per contracts/branding-api.yaml
describe('PUT /branding/:tenantId', () => {
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

  it('should update both colors and return 200 with correct schema', async () => {
    const updateInput = {
      primary_color: '#EF4444',
      secondary_color: '#F59E0B'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema matches Branding schema
    expect(response.body).toHaveProperty('primary_color', updateInput.primary_color);
    expect(response.body).toHaveProperty('secondary_color', updateInput.secondary_color);
    expect(response.body).toHaveProperty('logo_url');

    // Verify hex color format
    expect(response.body.primary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(response.body.secondary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should update only primary_color', async () => {
    // Get current branding first
    const currentBranding = await request('http://localhost:3001')
      .get(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const updateInput = {
      primary_color: '#3B82F6'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    expect(response.body.primary_color).toBe(updateInput.primary_color);
    // secondary_color should remain unchanged
    expect(response.body.secondary_color).toBe(currentBranding.body.secondary_color);
  });

  it('should update only secondary_color', async () => {
    // Get current branding first
    const currentBranding = await request('http://localhost:3001')
      .get(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const updateInput = {
      secondary_color: '#10B981'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    expect(response.body.secondary_color).toBe(updateInput.secondary_color);
    // primary_color should remain unchanged
    expect(response.body.primary_color).toBe(currentBranding.body.primary_color);
  });

  it('should accept lowercase hex colors', async () => {
    const updateInput = {
      primary_color: '#abc123',
      secondary_color: '#def456'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    // Colors might be stored as lowercase or uppercase, both are valid
    expect(response.body.primary_color.toLowerCase()).toBe('#abc123');
    expect(response.body.secondary_color.toLowerCase()).toBe('#def456');
  });

  it('should accept uppercase hex colors', async () => {
    const updateInput = {
      primary_color: '#ABC123',
      secondary_color: '#DEF456'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    expect(response.body.primary_color.toLowerCase()).toBe('#abc123');
    expect(response.body.secondary_color.toLowerCase()).toBe('#def456');
  });

  it('should return 400 for invalid hex color format (missing #)', async () => {
    const invalidInput = {
      primary_color: 'EF4444'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('color');
  });

  it('should return 400 for invalid hex color format (wrong length)', async () => {
    const invalidInput = {
      primary_color: '#EF44'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('color');
  });

  it('should return 400 for invalid hex color format (invalid characters)', async () => {
    const invalidInput = {
      primary_color: '#GGGGGG'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('color');
  });

  it('should not allow updating logo_url via PUT endpoint', async () => {
    const invalidInput = {
      primary_color: '#EF4444',
      logo_url: 'https://example.com/fake-logo.png'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput);

    // Logo updates should use POST /branding/:tenantId/logo
    // The PUT endpoint should either ignore logo_url or return 400
    if (response.status === 200) {
      // If accepted, verify logo_url was NOT changed
      const currentBranding = await request('http://localhost:3001')
        .get(`/branding/${tenantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(currentBranding.body.logo_url).not.toBe('https://example.com/fake-logo.png');
    } else {
      expect(response.status).toBe(400);
    }
  });

  it('should return 401 for missing auth token', async () => {
    const updateInput = {
      primary_color: '#EF4444'
    };

    await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .send(updateInput)
      .expect(401);
  });

  it('should return 401 for invalid auth token', async () => {
    const updateInput = {
      primary_color: '#EF4444'
    };

    await request('http://localhost:3001')
      .put(`/branding/${tenantId}`)
      .set('Authorization', 'Bearer invalid-token')
      .send(updateInput)
      .expect(401);
  });

  it('should return 403 when updating another tenant branding', async () => {
    const otherTenantId = '00000000-0000-0000-0000-000000000001';
    const updateInput = {
      primary_color: '#EF4444'
    };

    const response = await request('http://localhost:3001')
      .put(`/branding/${otherTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput);

    // Expect either 403 (forbidden) or 404 (not found)
    expect([403, 404]).toContain(response.status);
  });

  it('should return 404 for non-existent tenant', async () => {
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const updateInput = {
      primary_color: '#EF4444'
    };

    await request('http://localhost:3001')
      .put(`/branding/${fakeTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(404);
  });
});
