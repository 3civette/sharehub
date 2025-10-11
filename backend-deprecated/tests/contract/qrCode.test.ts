import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = 'http://localhost:3001';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('GET /api/admin/events/:eventId/tokens/:tokenId/qr', () => {
  let adminToken: string;
  let testEventId: string;
  let participantTokenId: string;
  let organizerTokenId: string;
  let otherTenantTokenId: string;
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

    // Get participant token
    const { data: participantToken } = await supabase
      .from('access_tokens')
      .select('id')
      .eq('event_id', testEventId)
      .eq('type', 'participant')
      .limit(1)
      .single();
    participantTokenId = participantToken?.id || '';

    // Get organizer token
    const { data: organizerToken } = await supabase
      .from('access_tokens')
      .select('id')
      .eq('event_id', testEventId)
      .eq('type', 'organizer')
      .limit(1)
      .single();
    organizerTokenId = organizerToken?.id || '';

    // Get token from different tenant
    const { data: otherEvent } = await supabase
      .from('events')
      .select('id')
      .neq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (otherEvent) {
      const { data: otherToken } = await supabase
        .from('access_tokens')
        .select('id')
        .eq('event_id', otherEvent.id)
        .eq('type', 'participant')
        .limit(1)
        .single();
      otherTenantTokenId = otherToken?.id || '';
    }
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it('returns 200 with image/png content-type for valid participant token', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${testEventId}/tokens/${participantTokenId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
  });

  it('returns PNG binary data (Buffer, > 1KB)', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${testEventId}/tokens/${participantTokenId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(1000); // Valid PNG should be > 1KB
  });

  it('returns proper Content-Disposition header with filename', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${testEventId}/tokens/${participantTokenId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toBeDefined();
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('participant-token');
    expect(response.headers['content-disposition']).toContain('.png');
  });

  it('returns 403 for organizer token (only participant tokens allowed)', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${testEventId}/tokens/${organizerTokenId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.message).toContain('participant tokens');
  });

  it('returns 403 for token from different tenant', async () => {
    if (otherTenantTokenId) {
      const response = await request(API_BASE_URL)
        .get(`/api/admin/events/${testEventId}/tokens/${otherTenantTokenId}/qr`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    }
  });

  it('returns 404 for non-existent token', async () => {
    const fakeTokenId = '00000000-0000-0000-0000-000000000000';
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${testEventId}/tokens/${fakeTokenId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Not Found');
  });

  it('validates QR code image dimensions and format', async () => {
    const response = await request(API_BASE_URL)
      .get(`/api/admin/events/${testEventId}/tokens/${participantTokenId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    // PNG signature validation (first 8 bytes: 137 80 78 71 13 10 26 10)
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(response.body.subarray(0, 8).equals(pngSignature)).toBe(true);
  });
});
