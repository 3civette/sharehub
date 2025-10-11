import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract test for POST /api/admin/branding/validate-colors per branding-validation.contract.json
describe('POST /api/admin/branding/validate-colors', () => {
  let authToken: string;
  const TEST_ADMIN_EMAIL = 'admin@sharehub.test';
  const TEST_ADMIN_PASSWORD = 'ShareHub2025!';

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request('http://localhost:3001')
      .post('/auth/login')
      .send({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD
      });

    authToken = loginResponse.body.token;
  });

  it('should return valid=true for 3Civette default colors (gold + black)', async () => {
    const validColors = {
      primary: '#D4AF37',      // Gold
      secondary: '#0B0B0C',    // Black
      background: '#FFFFFF'    // White
    };

    const response = await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validColors)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema
    expect(response.body).toHaveProperty('valid', true);
    expect(response.body).toHaveProperty('warnings');
    expect(response.body.warnings).toEqual([]);
    expect(response.body).toHaveProperty('contrastRatios');
    expect(response.body.contrastRatios).toHaveProperty('primary');
    expect(response.body.contrastRatios).toHaveProperty('secondary');

    // Gold on white should pass AA (ratio >= 4.5)
    expect(response.body.contrastRatios.primary).toBeGreaterThanOrEqual(4.5);
    // Black on white should pass AAA (ratio >= 7.0)
    expect(response.body.contrastRatios.secondary).toBeGreaterThanOrEqual(7.0);
  });

  it('should return valid=false for poor contrast primary color (yellow)', async () => {
    const invalidColors = {
      primary: '#FFFF00',      // Yellow - poor contrast on white
      secondary: '#0B0B0C',    // Black - good
      background: '#FFFFFF'
    };

    const response = await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidColors)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify validation failed
    expect(response.body).toHaveProperty('valid', false);
    expect(response.body.warnings).toHaveLength(1);
    expect(response.body.warnings[0]).toContain('Primary color');
    expect(response.body.warnings[0]).toContain('WCAG AA');

    // Yellow on white should fail AA (ratio < 4.5)
    expect(response.body.contrastRatios.primary).toBeLessThan(4.5);

    // Should include recommendation
    expect(response.body).toHaveProperty('recommendations');
    expect(response.body.recommendations).toHaveProperty('primary');
    expect(response.body.recommendations.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should return valid=false for poor contrast secondary color', async () => {
    const invalidColors = {
      primary: '#D4AF37',      // Gold - good
      secondary: '#FFFF00',    // Yellow - poor
      background: '#FFFFFF'
    };

    const response = await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidColors)
      .expect(200);

    expect(response.body.valid).toBe(false);
    expect(response.body.warnings.length).toBeGreaterThan(0);
    expect(response.body.warnings[0]).toContain('Secondary color');
    expect(response.body.contrastRatios.secondary).toBeLessThan(4.5);
  });

  it('should return valid=false for both colors failing contrast', async () => {
    const invalidColors = {
      primary: '#FFFF00',
      secondary: '#FFD700',
      background: '#FFFFFF'
    };

    const response = await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidColors)
      .expect(200);

    expect(response.body.valid).toBe(false);
    expect(response.body.warnings).toHaveLength(2);
    expect(response.body.contrastRatios.primary).toBeLessThan(4.5);
    expect(response.body.contrastRatios.secondary).toBeLessThan(4.5);
    expect(response.body.recommendations).toHaveProperty('primary');
    expect(response.body.recommendations).toHaveProperty('secondary');
  });

  it('should accept lowercase hex colors', async () => {
    const colors = {
      primary: '#d4af37',
      secondary: '#0b0b0c',
      background: '#ffffff'
    };

    const response = await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(colors)
      .expect(200);

    expect(response.body).toHaveProperty('valid');
    expect(response.body).toHaveProperty('contrastRatios');
  });

  it('should return 400 for invalid hex format (missing #)', async () => {
    const invalidInput = {
      primary: 'D4AF37',
      secondary: '#0B0B0C',
      background: '#FFFFFF'
    };

    const response = await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.message).toContain('hex');
  });

  it('should return 400 for invalid hex format (wrong length)', async () => {
    const invalidInput = {
      primary: '#D4AF',
      secondary: '#0B0B0C',
      background: '#FFFFFF'
    };

    await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);
  });

  it('should return 400 for invalid hex format (invalid characters)', async () => {
    const invalidInput = {
      primary: '#GGGGGG',
      secondary: '#0B0B0C',
      background: '#FFFFFF'
    };

    await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);
  });

  it('should return 400 for missing required field (primary)', async () => {
    const invalidInput = {
      secondary: '#0B0B0C',
      background: '#FFFFFF'
    };

    await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);
  });

  it('should return 400 for missing required field (secondary)', async () => {
    const invalidInput = {
      primary: '#D4AF37',
      background: '#FFFFFF'
    };

    await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);
  });

  it('should return 400 for missing required field (background)', async () => {
    const invalidInput = {
      primary: '#D4AF37',
      secondary: '#0B0B0C'
    };

    await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);
  });

  it('should return 401 for missing auth token', async () => {
    const colors = {
      primary: '#D4AF37',
      secondary: '#0B0B0C',
      background: '#FFFFFF'
    };

    await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .send(colors)
      .expect(401);
  });

  it('should return 401 for invalid auth token', async () => {
    const colors = {
      primary: '#D4AF37',
      secondary: '#0B0B0C',
      background: '#FFFFFF'
    };

    await request('http://localhost:3001')
      .post('/api/admin/branding/validate-colors')
      .set('Authorization', 'Bearer invalid-token')
      .send(colors)
      .expect(401);
  });
});
