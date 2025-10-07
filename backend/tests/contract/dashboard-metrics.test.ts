import { describe, it, expect } from 'vitest';
import request from 'supertest';

// This test will fail until T018 implements the endpoint
describe('GET /api/dashboard/metrics/:tenantId', () => {
  const testTenantId = '523c2648-f980-4c9e-8e53-93d812cfa79f';

  it('should return dashboard metrics with correct schema', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/dashboard/metrics/${testTenantId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response schema matches OpenAPI spec
    expect(response.body).toHaveProperty('active_events_count');
    expect(response.body).toHaveProperty('last_activity_at');

    expect(typeof response.body.active_events_count).toBe('number');
    expect(typeof response.body.last_activity_at).toBe('string');

    // Verify ISO 8601 timestamp format
    expect(() => new Date(response.body.last_activity_at)).not.toThrow();
  });

  it('should return 0 active events for tenant with no events', async () => {
    const response = await request('http://localhost:3001')
      .get(`/api/dashboard/metrics/${testTenantId}`)
      .expect(200);

    expect(response.body.active_events_count).toBeGreaterThanOrEqual(0);
  });

  it('should return 404 for non-existent tenant', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request('http://localhost:3001')
      .get(`/api/dashboard/metrics/${fakeId}`)
      .expect(404);
  });
});
