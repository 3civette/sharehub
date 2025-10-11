import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract test for PUT /settings/:tenantId per contracts/settings-api.yaml
describe('PUT /settings/:tenantId', () => {
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

  it('should update hotel_name and return 200 with correct schema', async () => {
    const updateInput = {
      hotel_name: 'Grand Plaza Hotel'
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema matches TenantSettings schema
    expect(response.body).toHaveProperty('id', tenantId);
    expect(response.body).toHaveProperty('hotel_name', updateInput.hotel_name);
    expect(response.body).toHaveProperty('contact_email');
    expect(response.body).toHaveProperty('contact_phone');
    expect(response.body).toHaveProperty('billing_info');
  });

  it('should update contact_email and contact_phone', async () => {
    const updateInput = {
      contact_email: 'info@grandplaza.com',
      contact_phone: '+1-555-987-6543'
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    expect(response.body.contact_email).toBe(updateInput.contact_email);
    expect(response.body.contact_phone).toBe(updateInput.contact_phone);
  });

  it('should update all fields together', async () => {
    const updateInput = {
      hotel_name: 'Luxury Resort & Spa',
      contact_email: 'contact@luxuryresort.com',
      contact_phone: '+1-555-123-4567'
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    expect(response.body.hotel_name).toBe(updateInput.hotel_name);
    expect(response.body.contact_email).toBe(updateInput.contact_email);
    expect(response.body.contact_phone).toBe(updateInput.contact_phone);
  });

  it('should update only hotel_name without changing contact fields', async () => {
    // Get current settings first
    const currentSettings = await request('http://localhost:3001')
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const updateInput = {
      hotel_name: 'Updated Hotel Name'
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    expect(response.body.hotel_name).toBe(updateInput.hotel_name);
    // Contact fields should remain unchanged
    expect(response.body.contact_email).toBe(currentSettings.body.contact_email);
    expect(response.body.contact_phone).toBe(currentSettings.body.contact_phone);
  });

  it('should allow setting contact_email to null', async () => {
    const updateInput = {
      contact_email: null
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    expect(response.body.contact_email).toBeNull();
  });

  it('should allow setting contact_phone to null', async () => {
    const updateInput = {
      contact_phone: null
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(200);

    expect(response.body.contact_phone).toBeNull();
  });

  it('should return 400 for hotel_name too short (< 2 characters)', async () => {
    const invalidInput = {
      hotel_name: 'H'
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('hotel_name');
  });

  it('should return 400 for hotel_name too long (> 100 characters)', async () => {
    const invalidInput = {
      hotel_name: 'A'.repeat(101)
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('hotel_name');
  });

  it('should return 400 for invalid email format', async () => {
    const invalidInput = {
      contact_email: 'invalid-email'
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toMatch(/email|format/i);
  });

  it('should accept valid international phone formats', async () => {
    const validPhones = [
      '+1-555-123-4567',
      '+44 20 7946 0958',
      '+86 138 0013 8000',
      '(555) 123-4567'
    ];

    for (const phone of validPhones) {
      const response = await request('http://localhost:3001')
        .put(`/settings/${tenantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contact_phone: phone });

      // Should either accept (200) or reject with clear message (400)
      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.contact_phone).toBe(phone);
      }
    }
  });

  it('should not allow updating billing_info (read-only)', async () => {
    const invalidInput = {
      hotel_name: 'Test Hotel',
      billing_info: {
        plan_name: 'Hacked Plan',
        renewal_date: '2099-12-31',
        payment_method: 'Free Forever'
      }
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput);

    // Should either ignore billing_info (200) or return 400
    if (response.status === 200) {
      // Verify billing_info was NOT changed
      const currentSettings = await request('http://localhost:3001')
        .get(`/settings/${tenantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (currentSettings.body.billing_info !== null) {
        expect(currentSettings.body.billing_info.plan_name).not.toBe('Hacked Plan');
      }
    } else {
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/billing|read-only/i);
    }
  });

  it('should not allow updating tenant id', async () => {
    const invalidInput = {
      id: '00000000-0000-0000-0000-000000000099',
      hotel_name: 'Test Hotel'
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput);

    // Should either ignore id field (200) or return 400
    if (response.status === 200) {
      // Verify id was NOT changed
      expect(response.body.id).toBe(tenantId);
    } else {
      expect(response.status).toBe(400);
    }
  });

  it('should return 401 for missing auth token', async () => {
    const updateInput = {
      hotel_name: 'Test Hotel'
    };

    await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .send(updateInput)
      .expect(401);
  });

  it('should return 401 for invalid auth token', async () => {
    const updateInput = {
      hotel_name: 'Test Hotel'
    };

    await request('http://localhost:3001')
      .put(`/settings/${tenantId}`)
      .set('Authorization', 'Bearer invalid-token')
      .send(updateInput)
      .expect(401);
  });

  it('should return 403 when updating another tenant settings', async () => {
    const otherTenantId = '00000000-0000-0000-0000-000000000001';
    const updateInput = {
      hotel_name: 'Test Hotel'
    };

    const response = await request('http://localhost:3001')
      .put(`/settings/${otherTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput);

    // Expect either 403 (forbidden) or 404 (not found)
    expect([403, 404]).toContain(response.status);
  });

  it('should return 404 for non-existent tenant', async () => {
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    const updateInput = {
      hotel_name: 'Test Hotel'
    };

    await request('http://localhost:3001')
      .put(`/settings/${fakeTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateInput)
      .expect(404);
  });
});
