import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract test for GET /events per contracts/events-api.yaml
describe('GET /events', () => {
  let authToken: string;
  let event1Id: string; // 2025-06-01
  let event2Id: string; // 2025-12-15
  let event3Id: string; // 2026-03-20
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

    // Create test events with different dates
    const event1 = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Summer Event',
        event_date: '2025-06-01',
        visibility: 'public'
      });
    event1Id = event1.body.id;

    const event2 = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Winter Event',
        event_date: '2025-12-15',
        visibility: 'public'
      });
    event2Id = event2.body.id;

    const event3 = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Spring Event',
        event_date: '2026-03-20',
        visibility: 'private'
      });
    event3Id = event3.body.id;
  });

  it('should list all events with default sort (date-asc)', async () => {
    const response = await request('http://localhost:3001')
      .get('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema
    expect(response.body).toHaveProperty('events');
    expect(response.body).toHaveProperty('total');
    expect(Array.isArray(response.body.events)).toBe(true);
    expect(typeof response.body.total).toBe('number');
    expect(response.body.events.length).toBeGreaterThanOrEqual(3);

    // Verify events array contains Event objects
    const firstEvent = response.body.events[0];
    expect(firstEvent).toHaveProperty('id');
    expect(firstEvent).toHaveProperty('tenant_id');
    expect(firstEvent).toHaveProperty('event_name');
    expect(firstEvent).toHaveProperty('event_date');
    expect(firstEvent).toHaveProperty('visibility');
    expect(firstEvent).toHaveProperty('status');
    expect(firstEvent).toHaveProperty('created_by');
    expect(firstEvent).toHaveProperty('created_at');
    expect(firstEvent).toHaveProperty('updated_at');
  });

  it('should sort events by date ascending (soonest first)', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?sort=date-asc')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const events = response.body.events;
    // Verify our test events are in correct order
    const event1Index = events.findIndex((e: any) => e.id === event1Id);
    const event2Index = events.findIndex((e: any) => e.id === event2Id);
    const event3Index = events.findIndex((e: any) => e.id === event3Id);

    expect(event1Index).toBeGreaterThanOrEqual(0);
    expect(event2Index).toBeGreaterThanOrEqual(0);
    expect(event3Index).toBeGreaterThanOrEqual(0);

    expect(event1Index).toBeLessThan(event2Index);
    expect(event2Index).toBeLessThan(event3Index);
  });

  it('should sort events by date descending (latest first)', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?sort=date-desc')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const events = response.body.events;
    const event1Index = events.findIndex((e: any) => e.id === event1Id);
    const event2Index = events.findIndex((e: any) => e.id === event2Id);
    const event3Index = events.findIndex((e: any) => e.id === event3Id);

    expect(event3Index).toBeLessThan(event2Index);
    expect(event2Index).toBeLessThan(event1Index);
  });

  it('should sort events by created date descending', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?sort=created-desc')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const events = response.body.events;

    // Verify events are sorted by created_at DESC
    for (let i = 0; i < events.length - 1; i++) {
      const current = new Date(events[i].created_at);
      const next = new Date(events[i + 1].created_at);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }
  });

  it('should filter active events only', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?filter=active')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const events = response.body.events;

    // All returned events should have status 'active'
    events.forEach((event: any) => {
      expect(event.status).toBe('active');

      // Verify event_date >= today
      const eventDate = new Date(event.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(eventDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
    });

    // Our test events should be included (all are future)
    const hasEvent1 = events.some((e: any) => e.id === event1Id);
    const hasEvent2 = events.some((e: any) => e.id === event2Id);
    const hasEvent3 = events.some((e: any) => e.id === event3Id);
    expect(hasEvent1 || hasEvent2 || hasEvent3).toBe(true);
  });

  it('should filter past events only', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?filter=past')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const events = response.body.events;

    // All returned events should have status 'past'
    events.forEach((event: any) => {
      expect(event.status).toBe('past');

      // Verify event_date < today
      const eventDate = new Date(event.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(eventDate.getTime()).toBeLessThan(today.getTime());
    });

    // Our test events should NOT be included (all are future)
    const hasEvent1 = events.some((e: any) => e.id === event1Id);
    const hasEvent2 = events.some((e: any) => e.id === event2Id);
    const hasEvent3 = events.some((e: any) => e.id === event3Id);
    expect(hasEvent1).toBe(false);
    expect(hasEvent2).toBe(false);
    expect(hasEvent3).toBe(false);
  });

  it('should show all events with filter=all', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?filter=all')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const events = response.body.events;

    // Should include both active and past events
    const statuses = events.map((e: any) => e.status);
    const uniqueStatuses = [...new Set(statuses)];

    // Should have at least active events (past events depend on test data)
    expect(statuses).toContain('active');
  });

  it('should combine sort and filter parameters', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?sort=date-desc&filter=active')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const events = response.body.events;

    // Verify all events are active
    events.forEach((event: any) => {
      expect(event.status).toBe('active');
    });

    // Verify descending date order
    for (let i = 0; i < events.length - 1; i++) {
      const currentDate = new Date(events[i].event_date);
      const nextDate = new Date(events[i + 1].event_date);
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
    }
  });

  it('should return 400 for invalid sort parameter', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?sort=invalid-sort')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.message).toContain('sort');
  });

  it('should return 400 for invalid filter parameter', async () => {
    const response = await request('http://localhost:3001')
      .get('/events?filter=invalid-filter')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.message).toContain('filter');
  });

  it('should return 401 for missing auth token', async () => {
    await request('http://localhost:3001')
      .get('/events')
      .expect(401);
  });

  it('should return 401 for invalid auth token', async () => {
    await request('http://localhost:3001')
      .get('/events')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should only return events for the authenticated tenant', async () => {
    const response = await request('http://localhost:3001')
      .get('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const events = response.body.events;

    // Get tenant_id from first event
    if (events.length > 0) {
      const tenantId = events[0].tenant_id;

      // Verify all events have same tenant_id (multi-tenant isolation)
      events.forEach((event: any) => {
        expect(event.tenant_id).toBe(tenantId);
      });
    }
  });
});
