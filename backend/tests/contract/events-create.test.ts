import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Contract test for POST /events per contracts/events-api.yaml
describe('POST /events', () => {
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

  it('should create public event and return 201 with correct schema', async () => {
    const eventInput = {
      event_name: 'Summer Conference 2025',
      event_date: '2025-08-15',
      description: 'Annual summer conference for all staff',
      visibility: 'public'
    };

    const response = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventInput)
      .expect('Content-Type', /json/)
      .expect(201);

    // Verify response schema matches Event schema
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('tenant_id');
    expect(response.body).toHaveProperty('event_name', eventInput.event_name);
    expect(response.body).toHaveProperty('event_date', eventInput.event_date);
    expect(response.body).toHaveProperty('description', eventInput.description);
    expect(response.body).toHaveProperty('visibility', 'public');
    expect(response.body).toHaveProperty('status', 'active');
    expect(response.body).toHaveProperty('created_by');
    expect(response.body).toHaveProperty('created_at');
    expect(response.body).toHaveProperty('updated_at');

    // Verify UUID format
    expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(response.body.tenant_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should create private event and return 201', async () => {
    const eventInput = {
      event_name: 'Executive Board Meeting',
      event_date: '2025-09-10',
      description: 'Q3 strategic planning session',
      visibility: 'private'
    };

    const response = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventInput)
      .expect(201);

    expect(response.body.event_name).toBe(eventInput.event_name);
    expect(response.body.visibility).toBe('private');
  });

  it('should return 400 for missing required fields', async () => {
    const invalidInput = {
      event_date: '2025-08-15',
      // Missing event_name and visibility
    };

    const response = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });

  it('should return 400 for event_name exceeding 255 characters', async () => {
    const invalidInput = {
      event_name: 'A'.repeat(256),
      event_date: '2025-08-15',
      visibility: 'public'
    };

    const response = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('event_name');
  });

  it('should return 400 for description exceeding 2000 characters', async () => {
    const invalidInput = {
      event_name: 'Test Event',
      event_date: '2025-08-15',
      description: 'A'.repeat(2001),
      visibility: 'public'
    };

    const response = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('description');
  });

  it('should return 400 for past event_date', async () => {
    const invalidInput = {
      event_name: 'Past Event',
      event_date: '2020-01-15',
      visibility: 'public'
    };

    const response = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('event_date');
  });

  it('should return 400 for invalid visibility value', async () => {
    const invalidInput = {
      event_name: 'Test Event',
      event_date: '2025-08-15',
      visibility: 'invalid-value'
    };

    const response = await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidInput)
      .expect(400);

    expect(response.body.message).toContain('visibility');
  });

  it('should return 401 for missing auth token', async () => {
    const eventInput = {
      event_name: 'Test Event',
      event_date: '2025-08-15',
      visibility: 'public'
    };

    await request('http://localhost:3001')
      .post('/events')
      .send(eventInput)
      .expect(401);
  });

  it('should return 401 for invalid auth token', async () => {
    const eventInput = {
      event_name: 'Test Event',
      event_date: '2025-08-15',
      visibility: 'public'
    };

    await request('http://localhost:3001')
      .post('/events')
      .set('Authorization', 'Bearer invalid-token')
      .send(eventInput)
      .expect(401);
  });
});
