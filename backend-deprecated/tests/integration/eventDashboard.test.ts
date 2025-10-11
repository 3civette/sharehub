import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = 'http://localhost:3001';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Event Dashboard Integration Tests', () => {
  let adminToken: string;
  let privateEventId: string;
  let publicEventId: string;
  let tenantId: string;
  let unauthorizedToken: string;

  beforeAll(async () => {
    // Get admin token for test tenant
    const { data: { session } } = await supabase.auth.signInWithPassword({
      email: 'admin@test-hotel.com',
      password: 'test-password'
    });
    adminToken = session?.access_token || '';

    // Get tenant_id from admins table
    const { data: admin } = await supabase
      .from('admins')
      .select('tenant_id')
      .eq('id', session?.user?.id)
      .single();
    tenantId = admin?.tenant_id || '';

    // Get private event
    const { data: privateEvent } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('visibility', 'private')
      .limit(1)
      .single();
    privateEventId = privateEvent?.id || '';

    // Get public event
    const { data: publicEvent } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('visibility', 'public')
      .limit(1)
      .single();
    publicEventId = publicEvent?.id || '';

    // Get token from different tenant for unauthorized access test
    const { data: { session: otherSession } } = await supabase.auth.signInWithPassword({
      email: 'admin@other-hotel.com',
      password: 'test-password'
    });
    unauthorizedToken = otherSession?.access_token || '';
    await supabase.auth.signOut();

    // Sign back in as main admin
    await supabase.auth.signInWithPassword({
      email: 'admin@test-hotel.com',
      password: 'test-password'
    });
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it('Scenario 1: Admin loads dashboard for owned private event → All data present', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${privateEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    // Verify event data
    expect(response.body.event).toBeDefined();
    expect(response.body.event.id).toBe(privateEventId);
    expect(response.body.event.visibility).toBe('private');

    // Verify tokens present for private event
    expect(response.body.tokens).toBeDefined();
    expect(Array.isArray(response.body.tokens)).toBe(true);

    // Verify sessions
    expect(response.body.sessions).toBeDefined();
    expect(Array.isArray(response.body.sessions)).toBe(true);

    // Verify speeches
    expect(response.body.speeches).toBeDefined();
    expect(Array.isArray(response.body.speeches)).toBe(true);

    // Verify photos
    expect(response.body.photos).toBeDefined();
    expect(Array.isArray(response.body.photos)).toBe(true);

    // Verify metrics
    expect(response.body.metrics).toBeDefined();
    expect(typeof response.body.metrics.pageViews).toBe('number');
    expect(typeof response.body.metrics.slideDownloads).toBe('number');
    expect(typeof response.body.metrics.participantCount).toBe('number');
    expect(response.body.metrics.lastRefreshed).toBeDefined();
  });

  it('Scenario 2: Admin loads dashboard for public event → Tokens array empty', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${publicEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.event.visibility).toBe('public');
    expect(response.body.tokens).toEqual([]);
  });

  it('Scenario 3: Dashboard includes sessions ordered by start_time', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${privateEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    if (response.body.sessions.length > 1) {
      // Verify sessions are ordered by start_time ascending
      for (let i = 0; i < response.body.sessions.length - 1; i++) {
        const currentTime = new Date(response.body.sessions[i].start_time).getTime();
        const nextTime = new Date(response.body.sessions[i + 1].start_time).getTime();
        expect(currentTime).toBeLessThanOrEqual(nextTime);
      }
    }
  });

  it('Scenario 4: Dashboard includes speeches with session relationships', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${privateEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    if (response.body.speeches.length > 0) {
      // Verify speeches have session relationship
      const speech = response.body.speeches[0];
      expect(speech).toHaveProperty('session');
      expect(speech.session).toHaveProperty('title');
      expect(speech).toHaveProperty('slide_count');
      expect(typeof speech.slide_count).toBe('number');
    }
  });

  it('Scenario 5: Dashboard includes cached metrics (even if 0)', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${privateEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    // Metrics should exist even if values are 0
    expect(response.body.metrics).toBeDefined();
    expect(response.body.metrics.pageViews).toBeGreaterThanOrEqual(0);
    expect(response.body.metrics.slideDownloads).toBeGreaterThanOrEqual(0);
    expect(response.body.metrics.participantCount).toBeGreaterThanOrEqual(0);

    // Verify lastRefreshed is valid ISO date
    const refreshDate = new Date(response.body.metrics.lastRefreshed);
    expect(refreshDate.toString()).not.toBe('Invalid Date');
  });

  it('Scenario 6: Failed auth returns 401', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${privateEventId}/dashboard`)
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('Scenario 7: Cross-tenant access returns 403', async () => {
    if (unauthorizedToken) {
      const response = await request(API_BASE_URL)
        .get(`/api/admin/events/${privateEventId}/dashboard`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Forbidden');
    }
  });

  it('Scenario 8: Dashboard load completes within performance target', async () => {
    const startTime = Date.now();

    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${privateEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000); // < 2s per SLA
  });
});
