import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract test for GET /settings/:tenantId per contracts/settings-api.yaml
describe('GET /settings/:tenantId', () => {
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

  it('should get tenant settings with correct schema', async () => {
    const response = await request('http://localhost:3001')
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema matches TenantSettings schema
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('hotel_name');
    expect(response.body).toHaveProperty('contact_email');
    expect(response.body).toHaveProperty('contact_phone');
    expect(response.body).toHaveProperty('billing_info');

    // Verify types
    expect(typeof response.body.id).toBe('string');
    expect(typeof response.body.hotel_name).toBe('string');

    // contact_email and contact_phone can be null
    const email = response.body.contact_email;
    expect(email === null || typeof email === 'string').toBe(true);

    const phone = response.body.contact_phone;
    expect(phone === null || typeof phone === 'string').toBe(true);
  });

  it('should include billing_info object', async () => {
    const response = await request('http://localhost:3001')
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const billingInfo = response.body.billing_info;

    // billing_info can be null or an object
    if (billingInfo !== null) {
      expect(billingInfo).toHaveProperty('plan_name');
      expect(billingInfo).toHaveProperty('renewal_date');
      expect(billingInfo).toHaveProperty('payment_method');

      expect(typeof billingInfo.plan_name).toBe('string');
      expect(typeof billingInfo.renewal_date).toBe('string');
      expect(typeof billingInfo.payment_method).toBe('string');

      // Verify renewal_date is valid date format
      expect(billingInfo.renewal_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('should return default hotel_name if not customized', async () => {
    const response = await request('http://localhost:3001')
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // hotel_name should have a value (default or customized)
    expect(response.body.hotel_name).toBeTruthy();
    expect(response.body.hotel_name.length).toBeGreaterThanOrEqual(2);
    expect(response.body.hotel_name.length).toBeLessThanOrEqual(100);
  });

  it('should return tenant ID matching the path parameter', async () => {
    const response = await request('http://localhost:3001')
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.id).toBe(tenantId);
  });

  it('should return 401 for missing auth token', async () => {
    await request('http://localhost:3001')
      .get(`/settings/${tenantId}`)
      .expect(401);
  });

  it('should return 401 for invalid auth token', async () => {
    await request('http://localhost:3001')
      .get(`/settings/${tenantId}`)
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should return 403 when accessing another tenant settings', async () => {
    const otherTenantId = '00000000-0000-0000-0000-000000000001';

    const response = await request('http://localhost:3001')
      .get(`/settings/${otherTenantId}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Expect either 403 (forbidden) or 404 (not found)
    expect([403, 404]).toContain(response.status);
  });

  it('should return 404 for non-existent tenant', async () => {
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';

    await request('http://localhost:3001')
      .get(`/settings/${fakeTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
