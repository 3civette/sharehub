import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

// Integration test for Scenario 1: Create Event Flow
// Tests admin event creation with token generation and tenant isolation
describe('Integration Test: Create Event Flow', () => {
  let authToken: string;
  let tenantId: string;
  const TEST_ADMIN_EMAIL = 'admin@sharehub.test';
  const TEST_ADMIN_PASSWORD = 'ShareHub2025!';
  const BASE_URL = 'http://localhost:3001';

  // Supabase client for direct database queries
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Test data cleanup
  const createdEventIds: string[] = [];

  beforeAll(async () => {
    // Login as admin to get authentication token
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
    expect(authToken.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    // Cleanup: delete created events and their tokens
    if (createdEventIds.length > 0) {
      // Delete private event tokens first
      await supabase
        .from('private_event_tokens')
        .delete()
        .in('event_id', createdEventIds);

      // Delete events
      await supabase
        .from('events')
        .delete()
        .in('id', createdEventIds);
    }
  });

  it('should successfully login as admin and save token', async () => {
    // Already tested in beforeAll, but explicit test
    expect(authToken).toBeDefined();
    expect(typeof authToken).toBe('string');
    expect(authToken.length).toBeGreaterThan(20);
  });

  it('should create public event without generating tokens', async () => {
    const eventInput = {
      event_name: 'Summer Conference 2025',
      event_date: '2025-08-15',
      description: 'Annual summer conference for all staff',
      visibility: 'public'
    };

    const response = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventInput)
      .expect('Content-Type', /json/)
      .expect(201);

    // Verify response structure
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('tenant_id', tenantId);
    expect(response.body).toHaveProperty('event_name', eventInput.event_name);
    expect(response.body).toHaveProperty('event_date', eventInput.event_date);
    expect(response.body).toHaveProperty('visibility', 'public');

    const eventId = response.body.id;
    createdEventIds.push(eventId);

    // Verify no tokens generated for public event
    const { data: tokens, error } = await supabase
      .from('private_event_tokens')
      .select('*')
      .eq('event_id', eventId);

    expect(error).toBeNull();
    expect(tokens).toHaveLength(0);
  });

  it('should create private event and generate organizer and participant tokens', async () => {
    const eventInput = {
      event_name: 'Executive Board Meeting',
      event_date: '2025-09-10',
      description: 'Q3 strategic planning session',
      visibility: 'private'
    };

    const response = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventInput)
      .expect(201);

    // Verify event created
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('visibility', 'private');
    expect(response.body).toHaveProperty('tenant_id', tenantId);

    const eventId = response.body.id;
    createdEventIds.push(eventId);

    // Verify tokens generated
    const { data: tokens, error } = await supabase
      .from('private_event_tokens')
      .select('*')
      .eq('event_id', eventId);

    expect(error).toBeNull();
    expect(tokens).toBeDefined();
    expect(tokens!.length).toBe(2);

    // Verify token types
    const tokenTypes = tokens!.map(t => t.token_type).sort();
    expect(tokenTypes).toEqual(['organizer', 'participant']);

    // Verify tokens are unique
    const tokenValues = tokens!.map(t => t.token);
    expect(tokenValues[0]).not.toBe(tokenValues[1]);

    // Verify tokens have correct tenant_id
    tokens!.forEach(token => {
      expect(token.tenant_id).toBe(tenantId);
      expect(token.token).toBeTruthy();
      expect(token.token.length).toBeGreaterThan(10);
    });
  });

  it('should enforce tenant isolation - cannot see other tenant events', async () => {
    // Create an event for current tenant
    const myEventInput = {
      event_name: 'My Tenant Event',
      event_date: '2025-10-15',
      description: 'Event for my tenant only',
      visibility: 'public'
    };

    const myEventResponse = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(myEventInput)
      .expect(201);

    const myEventId = myEventResponse.body.id;
    createdEventIds.push(myEventId);

    // Manually create an event for a different tenant (directly in DB)
    const otherTenantId = '00000000-0000-0000-0000-000000000099';
    const { data: otherEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        tenant_id: otherTenantId,
        event_name: 'Other Tenant Event',
        event_date: '2025-11-20',
        description: 'Event for different tenant',
        visibility: 'public',
        status: 'active',
        created_by: '00000000-0000-0000-0000-000000000001'
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(otherEvent).toBeDefined();

    // List events for current tenant
    const listResponse = await request(BASE_URL)
      .get('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(listResponse.body).toHaveProperty('events');
    const eventIds = listResponse.body.events.map((e: any) => e.id);

    // Should include my event
    expect(eventIds).toContain(myEventId);

    // Should NOT include other tenant's event
    expect(eventIds).not.toContain(otherEvent!.id);

    // Verify all returned events belong to current tenant
    listResponse.body.events.forEach((event: any) => {
      expect(event.tenant_id).toBe(tenantId);
    });

    // Cleanup other tenant's event
    await supabase
      .from('events')
      .delete()
      .eq('id', otherEvent!.id);
  });

  it('should return 401 when creating event without authentication', async () => {
    const eventInput = {
      event_name: 'Unauthorized Event',
      event_date: '2025-12-01',
      visibility: 'public'
    };

    await request(BASE_URL)
      .post('/admin/events')
      .send(eventInput)
      .expect(401);
  });

  it('should return 400 when creating event with invalid data', async () => {
    const invalidInput = {
      // Missing required field: event_name
      event_date: '2025-08-15',
      visibility: 'public'
    };

    const response = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/required|event_name/i);
  });

  it('should return 400 when creating event with past date', async () => {
    const pastEventInput = {
      event_name: 'Past Event',
      event_date: '2020-01-15',
      visibility: 'public'
    };

    const response = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(pastEventInput)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/future|past|event_date/i);
  });

  it('should return 400 when creating event with invalid visibility', async () => {
    const invalidInput = {
      event_name: 'Test Event',
      event_date: '2025-08-15',
      visibility: 'invalid-visibility'
    };

    const response = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/visibility/i);
  });
});
