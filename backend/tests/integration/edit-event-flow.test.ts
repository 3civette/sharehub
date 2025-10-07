import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

// Integration test for Scenario 2: Edit Event Flow
// Tests admin can edit future events but cannot edit past events
describe('Integration Test: Edit Event Flow', () => {
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

  // Test data cleanup
  const createdEventIds: string[] = [];

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

  it('should successfully edit a future event', async () => {
    // Create a future event
    const createResponse = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Workshop 2026',
        event_date: '2026-03-20',
        description: 'Annual workshop',
        visibility: 'public'
      })
      .expect(201);

    const eventId = createResponse.body.id;
    createdEventIds.push(eventId);

    const originalCreatedAt = createResponse.body.created_at;

    // Edit the future event
    const updateResponse = await request(BASE_URL)
      .put(`/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Advanced Workshop 2026',
        description: 'Updated workshop with advanced topics'
      })
      .expect(200);

    // Verify update succeeded
    expect(updateResponse.body).toHaveProperty('id', eventId);
    expect(updateResponse.body).toHaveProperty('event_name', 'Advanced Workshop 2026');
    expect(updateResponse.body).toHaveProperty('description', 'Updated workshop with advanced topics');
    expect(updateResponse.body).toHaveProperty('event_date', '2026-03-20');

    // Verify created_at unchanged
    expect(updateResponse.body.created_at).toBe(originalCreatedAt);

    // Verify updated_at changed
    expect(updateResponse.body.updated_at).toBeDefined();
    expect(updateResponse.body.updated_at).not.toBe(originalCreatedAt);
  });

  it('should prevent editing a past event', async () => {
    // Manually create a past event directly in database
    const { data: pastEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        tenant_id: tenantId,
        event_name: 'Old Conference',
        event_date: '2024-01-15',
        description: 'This is a past event',
        visibility: 'public',
        status: 'past',
        created_by: adminId
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(pastEvent).toBeDefined();

    const pastEventId = pastEvent!.id;
    createdEventIds.push(pastEventId);

    // Attempt to edit the past event
    const updateResponse = await request(BASE_URL)
      .put(`/admin/events/${pastEventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Updated Old Conference'
      })
      .expect(400);

    // Verify error message
    expect(updateResponse.body).toHaveProperty('message');
    expect(updateResponse.body.message).toMatch(/cannot edit past events/i);

    // Verify event was NOT updated in database
    const { data: unchangedEvent } = await supabase
      .from('events')
      .select('event_name')
      .eq('id', pastEventId)
      .single();

    expect(unchangedEvent!.event_name).toBe('Old Conference');
  });

  it('should preserve tokens when editing a private event', async () => {
    // Create a private event
    const createResponse = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Private Meeting',
        event_date: '2025-12-10',
        description: 'Confidential meeting',
        visibility: 'private'
      })
      .expect(201);

    const eventId = createResponse.body.id;
    createdEventIds.push(eventId);

    // Get original tokens
    const { data: originalTokens } = await supabase
      .from('private_event_tokens')
      .select('*')
      .eq('event_id', eventId);

    expect(originalTokens).toHaveLength(2);

    // Edit the event
    await request(BASE_URL)
      .put(`/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Updated Private Meeting',
        description: 'Updated confidential meeting'
      })
      .expect(200);

    // Verify tokens unchanged
    const { data: updatedTokens } = await supabase
      .from('private_event_tokens')
      .select('*')
      .eq('event_id', eventId);

    expect(updatedTokens).toHaveLength(2);

    // Tokens should be identical
    const originalTokenValues = originalTokens!.map(t => t.token).sort();
    const updatedTokenValues = updatedTokens!.map(t => t.token).sort();

    expect(updatedTokenValues).toEqual(originalTokenValues);

    // Cleanup tokens
    await supabase
      .from('private_event_tokens')
      .delete()
      .eq('event_id', eventId);
  });

  it('should allow partial updates to event fields', async () => {
    // Create event
    const createResponse = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Tech Conference',
        event_date: '2025-08-20',
        description: 'Technology conference',
        visibility: 'public'
      })
      .expect(201);

    const eventId = createResponse.body.id;
    createdEventIds.push(eventId);

    // Update only description
    const updateResponse = await request(BASE_URL)
      .put(`/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Updated technology conference description'
      })
      .expect(200);

    // Verify only description changed
    expect(updateResponse.body.event_name).toBe('Tech Conference');
    expect(updateResponse.body.description).toBe('Updated technology conference description');
    expect(updateResponse.body.event_date).toBe('2025-08-20');
    expect(updateResponse.body.visibility).toBe('public');
  });

  it('should return 404 when editing non-existent event', async () => {
    const fakeEventId = '00000000-0000-0000-0000-000000000000';

    const response = await request(BASE_URL)
      .put(`/admin/events/${fakeEventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Updated Event'
      })
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/not found/i);
  });

  it('should return 401 when editing without authentication', async () => {
    await request(BASE_URL)
      .put('/admin/events/some-event-id')
      .send({
        event_name: 'Unauthorized Update'
      })
      .expect(401);
  });

  it('should return 400 when updating with invalid data', async () => {
    // Create event
    const createResponse = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Valid Event',
        event_date: '2025-09-15',
        visibility: 'public'
      })
      .expect(201);

    const eventId = createResponse.body.id;
    createdEventIds.push(eventId);

    // Try to update with invalid visibility
    const updateResponse = await request(BASE_URL)
      .put(`/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        visibility: 'invalid-value'
      })
      .expect(400);

    expect(updateResponse.body).toHaveProperty('message');
    expect(updateResponse.body.message).toMatch(/visibility/i);
  });

  it('should return 400 when updating event_date to past date', async () => {
    // Create event
    const createResponse = await request(BASE_URL)
      .post('/admin/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Future Event',
        event_date: '2025-10-20',
        visibility: 'public'
      })
      .expect(201);

    const eventId = createResponse.body.id;
    createdEventIds.push(eventId);

    // Try to update date to past
    const updateResponse = await request(BASE_URL)
      .put(`/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_date: '2020-01-01'
      })
      .expect(400);

    expect(updateResponse.body).toHaveProperty('message');
    expect(updateResponse.body.message).toMatch(/future|past|event_date/i);
  });

  it('should not allow editing events from another tenant', async () => {
    // Create event for another tenant (directly in DB)
    const otherTenantId = '00000000-0000-0000-0000-000000000099';
    const { data: otherEvent } = await supabase
      .from('events')
      .insert({
        tenant_id: otherTenantId,
        event_name: 'Other Tenant Event',
        event_date: '2025-11-15',
        visibility: 'public',
        status: 'active',
        created_by: '00000000-0000-0000-0000-000000000001'
      })
      .select()
      .single();

    // Attempt to edit it
    const updateResponse = await request(BASE_URL)
      .put(`/admin/events/${otherEvent!.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_name: 'Hacked Event Name'
      });

    // Should fail with 403 or 404
    expect([403, 404]).toContain(updateResponse.status);

    // Cleanup
    await supabase
      .from('events')
      .delete()
      .eq('id', otherEvent!.id);
  });
});
