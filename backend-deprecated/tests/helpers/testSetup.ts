/**
 * Test Setup Helpers
 * Provides common utilities for contract and integration tests
 */

import { createClient } from '@supabase/supabase-js';
import request from 'supertest';

export const API_BASE_URL = 'http://localhost:3001';
export const TEST_ADMIN_EMAIL = 'admin@sharehub.test';
export const TEST_ADMIN_PASSWORD = 'ShareHub2025!';
export const TEST_TENANT_ID = '523c2648-f980-4c9e-8e53-93d812cfa79f';

// Supabase client for direct database operations
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Login as test admin and return auth token
 */
export async function loginAsAdmin(): Promise<{ token: string; tenantId: string }> {
  const loginResponse = await request(API_BASE_URL)
    .post('/auth/login')
    .send({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD
    });

  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
  }

  return {
    token: loginResponse.body.token,
    tenantId: loginResponse.body.tenant_id || TEST_TENANT_ID
  };
}

/**
 * Create a test event using Supabase client
 */
export async function createTestEvent(
  tenantId: string,
  eventData: {
    slug: string;
    name: string;
    date: string;
    visibility?: 'public' | 'private';
  }
) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      tenant_id: tenantId,
      slug: eventData.slug,
      name: eventData.name,
      date: eventData.date,
      visibility: eventData.visibility || 'public'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test event: ${error.message}`);
  }

  return data;
}

/**
 * Delete a test event using Supabase client
 */
export async function deleteTestEvent(eventId: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error(`Failed to delete test event: ${error.message}`);
  }
}

/**
 * Create a test session using Supabase client
 */
export async function createTestSession(
  eventId: string,
  tenantId: string,
  sessionData: {
    title: string;
    description?: string;
    scheduled_time?: string;
  }
) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      title: sessionData.title,
      description: sessionData.description,
      scheduled_time: sessionData.scheduled_time
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test session: ${error.message}`);
  }

  return data;
}

/**
 * Delete a test session using Supabase client
 */
export async function deleteTestSession(sessionId: string) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error(`Failed to delete test session: ${error.message}`);
  }
}
