import { describe, it, expect } from 'vitest';
import request from 'supertest';

// This test will fail until T020 implements the endpoint
describe('GET /api/events/:eventId/tokens', () => {
  // Note: This test assumes an event exists. In real testing, create test data first
  const testEventId = '00000000-0000-0000-0000-000000000001'; // Replace with actual test event

  it('should return event tokens with correct schema', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/events/${testEventId}/tokens`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('organizer_token');
    expect(response.body).toHaveProperty('participant_token');

    expect(typeof response.body.organizer_token).toBe('string');
    expect(typeof response.body.participant_token).toBe('string');

    // Verify tokens are nanoid format (21 URL-safe characters)
    expect(response.body.organizer_token).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(response.body.participant_token).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('should return different tokens for organizer and participant', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/events/${testEventId}/tokens`)
      .expect(200);

    expect(response.body.organizer_token).not.toBe(response.body.participant_token);
  });

  it('should return 404 for non-existent event', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request('http://localhost:3001')
      .get(`/api/events/${fakeId}/tokens`)
      .expect(404);
  });

  it('should return same tokens on subsequent requests', async () => {
    const response1 = await request('http://localhost:3001')
      .get(`/api/events/${testEventId}/tokens`)
      .expect(200);

    const response2 = await request('http://localhost:3001')
      .get(`/api/events/${testEventId}/tokens`)
      .expect(200);

    expect(response1.body.organizer_token).toBe(response2.body.organizer_token);
    expect(response1.body.participant_token).toBe(response2.body.participant_token);
  });
});
