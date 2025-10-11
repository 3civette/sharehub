import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

// Integration test for Scenario 5: Settings Flow
// Tests admin can update hotel settings and view billing info (read-only)
describe('Integration Test: Settings Flow', () => {
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

  // Store original settings to restore after tests
  let originalSettings: any;

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

    // Get and store original settings
    const { data } = await supabase
      .from('tenants')
      .select('hotel_name, contact_email, contact_phone')
      .eq('id', tenantId)
      .single();

    originalSettings = data;
  });

  afterAll(async () => {
    // Restore original settings
    if (originalSettings) {
      await supabase
        .from('tenants')
        .update({
          hotel_name: originalSettings.hotel_name,
          contact_email: originalSettings.contact_email,
          contact_phone: originalSettings.contact_phone
        })
        .eq('id', tenantId);
    }
  });

  it('should get current settings with all fields', async () => {
    const response = await request(BASE_URL)
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify response structure
    expect(response.body).toHaveProperty('id', tenantId);
    expect(response.body).toHaveProperty('hotel_name');
    expect(response.body).toHaveProperty('contact_email');
    expect(response.body).toHaveProperty('contact_phone');
    expect(response.body).toHaveProperty('billing_info');

    // Verify hotel_name is not empty
    expect(response.body.hotel_name).toBeTruthy();
    expect(typeof response.body.hotel_name).toBe('string');
  });

  it('should verify billing_info is returned (read-only)', async () => {
    const response = await request(BASE_URL)
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Billing info should be present (may be null or object)
    expect(response.body).toHaveProperty('billing_info');

    // If billing_info is not null, verify structure
    if (response.body.billing_info !== null) {
      expect(typeof response.body.billing_info).toBe('object');
      // May contain: plan_name, renewal_date, payment_method, etc.
    }
  });

  it('should update hotel_name successfully', async () => {
    const newHotelName = 'Grand Plaza Hotel';

    const updateResponse = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        hotel_name: newHotelName
      })
      .expect(200);

    // Verify response
    expect(updateResponse.body).toHaveProperty('hotel_name', newHotelName);

    // Verify database updated
    const { data: settingsInDb } = await supabase
      .from('tenants')
      .select('hotel_name')
      .eq('id', tenantId)
      .single();

    expect(settingsInDb!.hotel_name).toBe(newHotelName);

    // Verify changes persist on GET
    const getResponse = await request(BASE_URL)
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(getResponse.body.hotel_name).toBe(newHotelName);
  });

  it('should update contact_email and contact_phone successfully', async () => {
    const newContactInfo = {
      contact_email: 'info@grandplaza.com',
      contact_phone: '+1-555-987-6543'
    };

    const updateResponse = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(newContactInfo)
      .expect(200);

    // Verify response
    expect(updateResponse.body).toHaveProperty('contact_email', newContactInfo.contact_email);
    expect(updateResponse.body).toHaveProperty('contact_phone', newContactInfo.contact_phone);

    // Verify database updated
    const { data: settingsInDb } = await supabase
      .from('tenants')
      .select('contact_email, contact_phone')
      .eq('id', tenantId)
      .single();

    expect(settingsInDb!.contact_email).toBe(newContactInfo.contact_email);
    expect(settingsInDb!.contact_phone).toBe(newContactInfo.contact_phone);
  });

  it('should update all fields together', async () => {
    const updateData = {
      hotel_name: 'Luxury Resort & Spa',
      contact_email: 'contact@luxuryresort.com',
      contact_phone: '+1-555-123-4567'
    };

    const updateResponse = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)
      .expect(200);

    expect(updateResponse.body).toHaveProperty('hotel_name', updateData.hotel_name);
    expect(updateResponse.body).toHaveProperty('contact_email', updateData.contact_email);
    expect(updateResponse.body).toHaveProperty('contact_phone', updateData.contact_phone);
  });

  it('should allow partial updates without changing other fields', async () => {
    // Set initial values
    await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        hotel_name: 'Initial Hotel',
        contact_email: 'initial@hotel.com',
        contact_phone: '+1-555-000-0000'
      })
      .expect(200);

    // Update only hotel_name
    const updateResponse = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        hotel_name: 'Updated Hotel'
      })
      .expect(200);

    // Verify hotel_name changed, others unchanged
    expect(updateResponse.body.hotel_name).toBe('Updated Hotel');
    expect(updateResponse.body.contact_email).toBe('initial@hotel.com');
    expect(updateResponse.body.contact_phone).toBe('+1-555-000-0000');
  });

  it('should return 400 for invalid email format', async () => {
    const invalidData = {
      contact_email: 'invalid-email'
    };

    const response = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/email|format|invalid/i);
  });

  it('should return 400 for hotel_name too short (< 2 characters)', async () => {
    const invalidData = {
      hotel_name: 'H'
    };

    const response = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/hotel.*name|characters|2/i);
  });

  it('should return 400 for hotel_name too long (> 100 characters)', async () => {
    const invalidData = {
      hotel_name: 'A'.repeat(101)
    };

    const response = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/hotel.*name|characters|100/i);
  });

  it('should allow setting contact_email to null', async () => {
    const updateData = {
      contact_email: null
    };

    const response = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.contact_email).toBeNull();

    // Verify in database
    const { data } = await supabase
      .from('tenants')
      .select('contact_email')
      .eq('id', tenantId)
      .single();

    expect(data!.contact_email).toBeNull();
  });

  it('should allow setting contact_phone to null', async () => {
    const updateData = {
      contact_phone: null
    };

    const response = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.contact_phone).toBeNull();

    // Verify in database
    const { data } = await supabase
      .from('tenants')
      .select('contact_phone')
      .eq('id', tenantId)
      .single();

    expect(data!.contact_phone).toBeNull();
  });

  it('should NOT allow updating billing_info (read-only field)', async () => {
    // Get current billing info
    const currentResponse = await request(BASE_URL)
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const originalBillingInfo = currentResponse.body.billing_info;

    // Attempt to update billing_info
    const updateData = {
      hotel_name: 'Test Hotel',
      billing_info: {
        plan_name: 'Hacked Plan',
        renewal_date: '2099-12-31',
        payment_method: 'Free Forever'
      }
    };

    const updateResponse = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);

    // Should either ignore billing_info (200) or return 400
    if (updateResponse.status === 200) {
      // Verify billing_info was NOT changed
      const verifyResponse = await request(BASE_URL)
        .get(`/settings/${tenantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Billing info should be unchanged
      expect(verifyResponse.body.billing_info).toEqual(originalBillingInfo);
    } else {
      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.message).toMatch(/billing|read.*only/i);
    }
  });

  it('should NOT allow updating tenant id', async () => {
    const updateData = {
      id: '00000000-0000-0000-0000-000000000099',
      hotel_name: 'Test Hotel'
    };

    const updateResponse = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);

    // Should either ignore id (200) or return 400
    if (updateResponse.status === 200) {
      // Verify id was NOT changed
      expect(updateResponse.body.id).toBe(tenantId);
    } else {
      expect(updateResponse.status).toBe(400);
    }
  });

  it('should return 401 when accessing settings without authentication', async () => {
    await request(BASE_URL)
      .get(`/settings/${tenantId}`)
      .expect(401);

    await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .send({ hotel_name: 'Unauthorized Update' })
      .expect(401);
  });

  it('should return 403 when accessing another tenant settings', async () => {
    const otherTenantId = '00000000-0000-0000-0000-000000000099';

    const getResponse = await request(BASE_URL)
      .get(`/settings/${otherTenantId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([403, 404]).toContain(getResponse.status);

    const updateResponse = await request(BASE_URL)
      .put(`/settings/${otherTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ hotel_name: 'Hacked Hotel' });

    expect([403, 404]).toContain(updateResponse.status);
  });

  it('should return 404 for non-existent tenant', async () => {
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';

    await request(BASE_URL)
      .get(`/settings/${fakeTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    await request(BASE_URL)
      .put(`/settings/${fakeTenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ hotel_name: 'Non-existent' })
      .expect(404);
  });

  it('should accept valid international phone formats', async () => {
    const validPhones = [
      '+1-555-123-4567',
      '+44 20 7946 0958',
      '+86 138 0013 8000',
      '(555) 123-4567'
    ];

    for (const phone of validPhones) {
      const response = await request(BASE_URL)
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

  it('should handle empty request body gracefully', async () => {
    const response = await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    // Should either return 200 (no changes) or 400 (validation error)
    expect([200, 400]).toContain(response.status);

    if (response.status === 200) {
      // Settings should be unchanged
      expect(response.body).toHaveProperty('hotel_name');
    }
  });

  it('should preserve settings after multiple updates', async () => {
    // Update 1
    await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ hotel_name: 'First Update' })
      .expect(200);

    // Update 2
    await request(BASE_URL)
      .put(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ contact_email: 'test@example.com' })
      .expect(200);

    // Verify both updates persisted
    const response = await request(BASE_URL)
      .get(`/settings/${tenantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.hotel_name).toBe('First Update');
    expect(response.body.contact_email).toBe('test@example.com');
  });
});
