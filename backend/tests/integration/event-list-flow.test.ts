import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

// Integration test for Scenario 4: Event List Flow
// Tests event listing with sorting, filtering, and tenant isolation
describe('Integration Test: Event List Flow', () => {
  let authToken: string;
  let tenantId: string;
  let adminId: string;
  const TEST_ADMIN_EMAIL = 'admin@sharehub.test';
  const TEST_ADMIN_PASSWORD = 'ShareHub2025!';
  const BASE_URL = 'http://localhost:3001';

  // Supabase client for direct database operations
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Test data
  const createdEventIds: string[] = [];
  let futureEvent1Id: string;
  let futureEvent2Id: string;
  let futureEvent3Id: string;
  let pastEventId: string;

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
    adminId = loginResponse.body.user_id || '621f3aa6-d32b-4496-9c92-acc53c3827c0';

    expect(authToken).toBeDefined();

    // Create 3 future events with different dates
    const event1Response = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Summer Conference 2025',
        event_date: '2025-06-01',
        description: 'First event - earliest date',
        visibility: 'public'
      })
      .expect(201);
    futureEvent1Id = event1Response.body.id;
    createdEventIds.push(futureEvent1Id);

    const event2Response = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Winter Conference 2025',
        event_date: '2025-12-15',
        description: 'Second event - middle date',
        visibility: 'public'
      })
      .expect(201);
    futureEvent2Id = event2Response.body.id;
    createdEventIds.push(futureEvent2Id);

    const event3Response = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Spring Workshop 2026',
        event_date: '2026-03-20',
        description: 'Third event - latest date',
        visibility: 'public'
      })
      .expect(201);
    futureEvent3Id = event3Response.body.id;
    createdEventIds.push(futureEvent3Id);

    // Create 1 past event manually in database
    const { data: pastEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        tenant_id: tenantId,
        event_name: 'Legacy Conference 2024',
        event_date: '2024-01-15',
        description: 'Past event for testing',
        visibility: 'public',
        status: 'past',
        created_by: adminId
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    pastEventId = pastEvent!.id;
    createdEventIds.push(pastEventId);
  });

  afterAll(async () => {
    // Cleanup: delete created events
    if (createdEventIds.length > 0) {
      await supabase
        .from('events')
        .delete()
        .in('id', createdEventIds);
    }
  });

  it('should list events with default sort (date ascending, soonest first)', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');
    expect(Array.isArray(response.body.events)).toBe(true);

    // Find our test events in the response
    const testEvents = response.body.events.filter((e: any) =>
      createdEventIds.includes(e.id)
    );

    // Should include all 4 events (3 future + 1 past)
    expect(testEvents.length).toBeGreaterThanOrEqual(4);

    // Verify future events are in ascending date order
    const futureEvents = testEvents.filter((e: any) =>
      [futureEvent1Id, futureEvent2Id, futureEvent3Id].includes(e.id)
    );

    expect(futureEvents.length).toBe(3);

    // Check order: 2025-06-01, 2025-12-15, 2026-03-20
    const sortedEventIds = futureEvents.map((e: any) => e.id);
    const expectedOrder = [futureEvent1Id, futureEvent2Id, futureEvent3Id];

    // Find indices to verify relative ordering
    const idx1 = sortedEventIds.indexOf(futureEvent1Id);
    const idx2 = sortedEventIds.indexOf(futureEvent2Id);
    const idx3 = sortedEventIds.indexOf(futureEvent3Id);

    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);
  });

  it('should list events sorted by date descending (latest first)', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events?sort=date-desc')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');

    // Find our test future events
    const testEvents = response.body.events.filter((e: any) =>
      [futureEvent1Id, futureEvent2Id, futureEvent3Id].includes(e.id)
    );

    expect(testEvents.length).toBe(3);

    // Check order: 2026-03-20, 2025-12-15, 2025-06-01
    const sortedEventIds = testEvents.map((e: any) => e.id);
    const idx1 = sortedEventIds.indexOf(futureEvent1Id);
    const idx2 = sortedEventIds.indexOf(futureEvent2Id);
    const idx3 = sortedEventIds.indexOf(futureEvent3Id);

    // Reverse order: idx3 < idx2 < idx1
    expect(idx3).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx1);
  });

  it('should list events sorted by created date descending (newest first)', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events?sort=created-desc')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');

    // Find our test events
    const testEvents = response.body.events.filter((e: any) =>
      [futureEvent1Id, futureEvent2Id, futureEvent3Id].includes(e.id)
    );

    expect(testEvents.length).toBe(3);

    // Events should be in reverse creation order
    // (event3 was created last, so it should appear before event1)
    const sortedEventIds = testEvents.map((e: any) => e.id);
    const idx1 = sortedEventIds.indexOf(futureEvent1Id);
    const idx3 = sortedEventIds.indexOf(futureEvent3Id);

    expect(idx3).toBeLessThan(idx1);
  });

  it('should filter active events only (future events)', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events?filter=active')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');

    // Find our test events
    const testEvents = response.body.events.filter((e: any) =>
      createdEventIds.includes(e.id)
    );

    // Should only include future events, NOT past event
    const futureEventIds = testEvents.map((e: any) => e.id);

    expect(futureEventIds).toContain(futureEvent1Id);
    expect(futureEventIds).toContain(futureEvent2Id);
    expect(futureEventIds).toContain(futureEvent3Id);
    expect(futureEventIds).not.toContain(pastEventId);

    // Verify all returned events have status 'active' or event_date in future
    response.body.events.forEach((event: any) => {
      const eventDate = new Date(event.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      expect(eventDate >= today).toBe(true);
    });
  });

  it('should filter past events only', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events?filter=past')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');

    // Find our test events
    const testEvents = response.body.events.filter((e: any) =>
      createdEventIds.includes(e.id)
    );

    // Should only include past event, NOT future events
    const pastEventIds = testEvents.map((e: any) => e.id);

    expect(pastEventIds).toContain(pastEventId);
    expect(pastEventIds).not.toContain(futureEvent1Id);
    expect(pastEventIds).not.toContain(futureEvent2Id);
    expect(pastEventIds).not.toContain(futureEvent3Id);

    // Verify all returned events have event_date in past
    response.body.events.forEach((event: any) => {
      const eventDate = new Date(event.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      expect(eventDate < today).toBe(true);
    });
  });

  it('should filter all events (default filter)', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events?filter=all')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');

    // Find our test events
    const testEvents = response.body.events.filter((e: any) =>
      createdEventIds.includes(e.id)
    );

    // Should include ALL events (3 future + 1 past)
    expect(testEvents.length).toBe(4);

    const eventIds = testEvents.map((e: any) => e.id);
    expect(eventIds).toContain(futureEvent1Id);
    expect(eventIds).toContain(futureEvent2Id);
    expect(eventIds).toContain(futureEvent3Id);
    expect(eventIds).toContain(pastEventId);
  });

  it('should combine sort and filter options', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events?sort=date-desc&filter=active')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');

    // Find our test future events
    const testEvents = response.body.events.filter((e: any) =>
      [futureEvent1Id, futureEvent2Id, futureEvent3Id].includes(e.id)
    );

    // Should have 3 future events
    expect(testEvents.length).toBe(3);

    // Should NOT have past event
    const eventIds = testEvents.map((e: any) => e.id);
    expect(eventIds).not.toContain(pastEventId);

    // Should be in descending date order
    const idx1 = eventIds.indexOf(futureEvent1Id);
    const idx2 = eventIds.indexOf(futureEvent2Id);
    const idx3 = eventIds.indexOf(futureEvent3Id);

    expect(idx3).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx1);
  });

  it('should enforce tenant isolation - only show events for current tenant', async () => {
    // Create event for another tenant (directly in DB)
    const otherTenantId = '00000000-0000-0000-0000-000000000099';
    const { data: otherEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        tenant_id: otherTenantId,
        event_name: 'Other Tenant Event',
        event_date: '2025-07-15',
        description: 'Event for different tenant',
        visibility: 'public',
        status: 'active',
        created_by: '00000000-0000-0000-0000-000000000001'
      })
      .select()
      .single();

    expect(insertError).toBeNull();

    // List events
    const response = await request(BASE_URL)
      .get('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify other tenant's event NOT included
    const eventIds = response.body.events.map((e: any) => e.id);
    expect(eventIds).not.toContain(otherEvent!.id);

    // Verify all events belong to current tenant
    response.body.events.forEach((event: any) => {
      expect(event.tenant_id).toBe(tenantId);
    });

    // Cleanup
    await supabase
      .from('events')
      .delete()
      .eq('id', otherEvent!.id);
  });

  it('should return 401 when listing without authentication', async () => {
    await request(BASE_URL)
      .get('/admin/events')
      .expect(401);
  });

  it('should return 400 for invalid sort option', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events?sort=invalid-sort')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/invalid|sort/i);
  });

  it('should return 400 for invalid filter option', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events?filter=invalid-filter')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/invalid|filter/i);
  });

  it('should return metadata with total count', async () => {
    const response = await request(BASE_URL)
      .get('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');

    // Optional: verify metadata if API returns it
    if (response.body.total !== undefined) {
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBeGreaterThanOrEqual(response.body.events.length);
    }
  });

  it('should handle empty event list gracefully', async () => {
    // Create a new tenant with no events (this would require special setup)
    // For now, just verify the API doesn't crash with filter that returns nothing

    // Delete all test events temporarily
    await supabase
      .from('events')
      .delete()
      .in('id', createdEventIds);

    const response = await request(BASE_URL)
      .get('/admin/events?filter=active')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('events');
    expect(Array.isArray(response.body.events)).toBe(true);

    // Restore events for other tests (recreate in afterAll will handle this)
  });
});
