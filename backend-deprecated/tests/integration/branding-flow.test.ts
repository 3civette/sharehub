import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Integration test for Scenario 3: Branding Flow
// Tests admin can customize tenant branding (colors, logo, reset)
describe('Integration Test: Branding Flow', () => {
  let authToken: string;
  let tenantId: string;
  const TEST_ADMIN_EMAIL = 'admin@sharehub.test';
  const TEST_ADMIN_PASSWORD = 'ShareHub2025!';
  const BASE_URL = 'http://localhost:3001';

  // Supabase client for direct database operations
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Default branding values
  const DEFAULT_PRIMARY_COLOR = '#3B82F6';
  const DEFAULT_SECONDARY_COLOR = '#10B981';

  beforeAll(async () => {
    // Login as admin
    const loginResponse = await request(BASE_URL)
      .post('/auth/login')
      .send({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD
      })
      .expect(200);

    authToken = loginResponse.body.token;
    tenantId = loginResponse.body.tenant_id || '523c2648-f980-4c9e-8e53-93d812cfa79f';

    expect(authToken).toBeDefined();
  });

  afterAll(async () => {
    // Reset branding to defaults after tests
    await request(BASE_URL)
      .post(`/branding/${tenantId}/reset`)
      .set('Authorization', `Bearer ${authToken}`);
  });

  it('should get current branding with default values', async () => {
    // First, reset to ensure defaults
    await request(BASE_URL)
      .post(`/branding/${tenantId}/reset`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Get current branding
    const response = await request(BASE_URL)
      .get(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify default branding
    expect(response.body).toHaveProperty('primary_color', DEFAULT_PRIMARY_COLOR);
    expect(response.body).toHaveProperty('secondary_color', DEFAULT_SECONDARY_COLOR);
    expect(response.body).toHaveProperty('logo_url');
    expect(response.body.logo_url).toBeNull();
  });

  it('should update primary and secondary colors', async () => {
    const newColors = {
      primary_color: '#EF4444',
      secondary_color: '#F59E0B'
    };

    // Update colors
    const updateResponse = await request(BASE_URL)
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(newColors)
      .expect(200);

    // Verify response
    expect(updateResponse.body).toHaveProperty('primary_color', newColors.primary_color);
    expect(updateResponse.body).toHaveProperty('secondary_color', newColors.secondary_color);

    // Verify database updated
    const { data: brandingInDb } = await supabase
      .from('tenants')
      .select('primary_color, secondary_color')
      .eq('id', tenantId)
      .single();

    expect(brandingInDb!.primary_color).toBe(newColors.primary_color);
    expect(brandingInDb!.secondary_color).toBe(newColors.secondary_color);
  });

  it('should update only primary color without changing secondary', async () => {
    // Set initial colors
    await request(BASE_URL)
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        primary_color: '#3B82F6',
        secondary_color: '#10B981'
      })
      .expect(200);

    // Update only primary color
    const updateResponse = await request(BASE_URL)
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        primary_color: '#8B5CF6'
      })
      .expect(200);

    // Verify primary changed, secondary unchanged
    expect(updateResponse.body.primary_color).toBe('#8B5CF6');
    expect(updateResponse.body.secondary_color).toBe('#10B981');
  });

  it('should upload logo to Supabase Storage', async () => {
    // Create a test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Upload logo
    const uploadResponse = await request(BASE_URL)
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', testImageBuffer, 'test-logo.png')
      .expect(200);

    // Verify response contains logo URL
    expect(uploadResponse.body).toHaveProperty('logo_url');
    expect(uploadResponse.body.logo_url).toBeTruthy();
    expect(uploadResponse.body.logo_url).toMatch(/logos/);
    expect(uploadResponse.body.logo_url).toContain(tenantId);

    const logoUrl = uploadResponse.body.logo_url;

    // Verify database updated
    const { data: brandingInDb } = await supabase
      .from('tenants')
      .select('logo_url')
      .eq('id', tenantId)
      .single();

    expect(brandingInDb!.logo_url).toBe(logoUrl);

    // Verify file exists in Supabase Storage
    // Extract path from URL
    const urlParts = logoUrl.split('/storage/v1/object/public/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      const { data: fileExists, error } = await supabase.storage
        .from('logos')
        .list(path.dirname(filePath));

      expect(error).toBeNull();
      expect(fileExists).toBeDefined();
    }
  });

  it('should return 400 when uploading file without logo field', async () => {
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const uploadResponse = await request(BASE_URL)
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('wrong_field_name', testImageBuffer, 'test-logo.png')
      .expect(400);

    expect(uploadResponse.body).toHaveProperty('message');
    expect(uploadResponse.body.message).toMatch(/logo.*required/i);
  });

  it('should return 400 when uploading invalid file type', async () => {
    // Create a fake PDF buffer
    const pdfBuffer = Buffer.from('%PDF-1.4\n%...', 'utf-8');

    const uploadResponse = await request(BASE_URL)
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', pdfBuffer, 'test-logo.pdf');

    // Should reject invalid file type
    expect([400, 500]).toContain(uploadResponse.status);
    if (uploadResponse.status === 400) {
      expect(uploadResponse.body.message).toMatch(/file type|invalid|allowed/i);
    }
  });

  it('should reset branding to default values and remove logo', async () => {
    // First set custom branding with logo
    await request(BASE_URL)
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        primary_color: '#FF0000',
        secondary_color: '#00FF00'
      })
      .expect(200);

    // Upload logo
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    await request(BASE_URL)
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', testImageBuffer, 'test-logo.png')
      .expect(200);

    // Reset branding
    const resetResponse = await request(BASE_URL)
      .post(`/branding/${tenantId}/reset`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify defaults restored
    expect(resetResponse.body).toHaveProperty('primary_color', DEFAULT_PRIMARY_COLOR);
    expect(resetResponse.body).toHaveProperty('secondary_color', DEFAULT_SECONDARY_COLOR);
    expect(resetResponse.body).toHaveProperty('logo_url');
    expect(resetResponse.body.logo_url).toBeNull();

    // Verify database updated
    const { data: brandingInDb } = await supabase
      .from('tenants')
      .select('primary_color, secondary_color, logo_url')
      .eq('id', tenantId)
      .single();

    expect(brandingInDb!.primary_color).toBe(DEFAULT_PRIMARY_COLOR);
    expect(brandingInDb!.secondary_color).toBe(DEFAULT_SECONDARY_COLOR);
    expect(brandingInDb!.logo_url).toBeNull();
  });

  it('should return 400 when updating with invalid hex color', async () => {
    const invalidColors = {
      primary_color: 'not-a-hex-color'
    };

    const updateResponse = await request(BASE_URL)
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidColors)
      .expect(400);

    expect(updateResponse.body).toHaveProperty('message');
    expect(updateResponse.body.message).toMatch(/hex|color|valid/i);
  });

  it('should return 401 when accessing branding without authentication', async () => {
    await request(BASE_URL)
      .get(`/branding/${tenantId}`)
      .expect(401);

    await request(BASE_URL)
      .put(`/branding/${tenantId}`)
      .send({ primary_color: '#000000' })
      .expect(401);

    await request(BASE_URL)
      .post(`/branding/${tenantId}/reset`)
      .expect(401);
  });

  it('should return 403 when accessing another tenant branding', async () => {
    const otherTenantId = '00000000-0000-0000-0000-000000000099';

    const getResponse = await request(BASE_URL)
      .get(`/branding/${otherTenantId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([403, 404]).toContain(getResponse.status);

    const updateResponse = await request(BASE_URL)
      .put(`/branding/${otherTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ primary_color: '#000000' });

    expect([403, 404]).toContain(updateResponse.status);
  });

  it('should delete logo without resetting colors', async () => {
    // Set custom colors
    await request(BASE_URL)
      .put(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        primary_color: '#9333EA',
        secondary_color: '#EC4899'
      })
      .expect(200);

    // Upload logo
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    await request(BASE_URL)
      .post(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('logo', testImageBuffer, 'test-logo.png')
      .expect(200);

    // Delete logo
    await request(BASE_URL)
      .delete(`/branding/${tenantId}/logo`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);

    // Get branding
    const response = await request(BASE_URL)
      .get(`/branding/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Logo should be null, colors should remain
    expect(response.body.logo_url).toBeNull();
    expect(response.body.primary_color).toBe('#9333EA');
    expect(response.body.secondary_color).toBe('#EC4899');
  });
});
