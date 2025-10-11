import { describe, it, expect } from 'vitest';
import request from 'supertest';

// This test will fail until T019 implements the endpoint
describe('GET /api/dashboard/activity/:tenantId', () => {
  const testTenantId = '523c2648-f980-4c9e-8e53-93d812cfa79f';

  it('should return activity log with correct schema', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/dashboard/activity/${testTenantId}?limit=5`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('activities');
    expect(Array.isArray(response.body.activities)).toBe(true);

    // Verify each activity has required fields
    response.body.activities.forEach((activity: any) => {
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('actor_type');
      expect(activity).toHaveProperty('action_type');
      expect(activity).toHaveProperty('created_at');

      // Verify actor_type enum
      expect(['admin', 'organizer', 'participant', 'system']).toContain(activity.actor_type);
    });
  });

  it('should respect limit parameter', async () => {
    const limit = 3;
    const response = await request('http://localhost:3001')
      .get(`/api/dashboard/activity/${testTenantId}?limit=${limit}`)
      .expect(200);

    expect(response.body.activities.length).toBeLessThanOrEqual(limit);
  });

  it('should default to 5 activities when limit not specified', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/dashboard/activity/${testTenantId}`)
      .expect(200);

    expect(response.body.activities.length).toBeLessThanOrEqual(5);
  });

  it('should return activities in descending order by created_at', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/dashboard/activity/${testTenantId}?limit=10`)
      .expect(200);

    const activities = response.body.activities;

    for (let i = 0; i < activities.length - 1; i++) {
      const current = new Date(activities[i].created_at);
      const next = new Date(activities[i + 1].created_at);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }
  });
});
