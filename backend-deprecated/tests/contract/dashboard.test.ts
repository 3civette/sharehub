import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = 'http://localhost:3001';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('GET /api/admin/events/:eventId/dashboard', () => {
  let adminToken: string;
  let testEventId: string;
  let otherTenantEventId: string;
  let tenantId: string;

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

    // Get test event from owned tenant
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('visibility', 'private')
      .limit(1)
      .single();
    testEventId = event?.id || '';

    // Get event from different tenant
    const { data: otherEvent } = await supabase
      .from('events')
      .select('id')
      .neq('tenant_id', tenantId)
      .limit(1)
      .single();
    otherTenantEventId = otherEvent?.id || '';
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it('returns 200 with complete DashboardData structure for owned event', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${testEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('event');
    expect(response.body).toHaveProperty('tokens');
    expect(response.body).toHaveProperty('sessions');
    expect(response.body).toHaveProperty('speeches');
    expect(response.body).toHaveProperty('photos');
    expect(response.body).toHaveProperty('metrics');

    // Validate event structure
    expect(response.body.event).toHaveProperty('id');
    expect(response.body.event).toHaveProperty('name');
    expect(response.body.event).toHaveProperty('date');
    expect(response.body.event).toHaveProperty('slug');
    expect(response.body.event).toHaveProperty('visibility');
    expect(response.body.event).toHaveProperty('status');

    // Validate metrics structure
    expect(response.body.metrics).toHaveProperty('pageViews');
    expect(response.body.metrics).toHaveProperty('slideDownloads');
    expect(response.body.metrics).toHaveProperty('participantCount');
    expect(response.body.metrics).toHaveProperty('lastRefreshed');
  });

  it('returns 403 Forbidden for event from different tenant', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${otherTenantEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Forbidden');
  });

  it('returns 404 Not Found for non-existent event', async () => {
    const fakeEventId = '00000000-0000-0000-0000-000000000000';
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${fakeEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Not Found');
  });

  it('returns empty tokens array for public events', async () => {
    // Get public event
    const { data: publicEvent } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('visibility', 'public')
      .limit(1)
      .single();

    if (publicEvent) {
      const response = await request(API_BASE_URL)
        .get(`/api/admin/events/${publicEvent.id}/dashboard`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tokens).toEqual([]);
    }
  });

  it('validates response schema matches DashboardData interface', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${testEventId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    // Validate tokens array structure
    if (response.body.tokens.length > 0) {
      const token = response.body.tokens[0];
      expect(token).toHaveProperty('id');
      expect(token).toHaveProperty('token');
      expect(token).toHaveProperty('type');
      expect(['organizer', 'participant']).toContain(token.type);
      expect(token).toHaveProperty('expires_at');
      expect(token).toHaveProperty('use_count');
    }

    // Validate sessions array structure
    if (response.body.sessions.length > 0) {
      const session = response.body.sessions[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('title');
      expect(session).toHaveProperty('start_time');
      expect(session).toHaveProperty('end_time');
    }

    // Validate speeches array structure
    if (response.body.speeches.length > 0) {
      const speech = response.body.speeches[0];
      expect(speech).toHaveProperty('id');
      expect(speech).toHaveProperty('title');
      expect(speech).toHaveProperty('speaker');
      expect(speech).toHaveProperty('slide_count');
    }

    // Validate photos array structure
    if (response.body.photos.length > 0) {
      const photo = response.body.photos[0];
      expect(photo).toHaveProperty('id');
      expect(photo).toHaveProperty('storage_path');
      expect(photo).toHaveProperty('uploaded_at');
    }
  });
});
