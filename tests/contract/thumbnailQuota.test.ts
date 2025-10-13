/**
 * Contract Tests: Thumbnail Quota
 * Feature: 009-voglio-implementare-la
 * Contract: specs/009-voglio-implementare-la/contracts/thumbnail-quota.yml
 *
 * TDD Approach: These tests are written BEFORE implementation
 * Expected: ALL TESTS SHOULD FAIL until implementation is complete
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Test data IDs
let testTenantId: string;
let testAdminId: string;
let authToken: string;

describe('GET /api/admin/thumbnails/quota', () => {
  beforeAll(async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create test tenant with quota
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Tenant Quota',
        subdomain: `test-quota-${Date.now()}`,
        thumbnail_quota_total: 5,
        thumbnail_quota_used: 2, // Already used 2
      })
      .select()
      .single();
    testTenantId = tenant!.id;

    // Create test admin
    const { data: { user } } = await supabase.auth.signUp({
      email: `admin-quota-${Date.now()}@test.com`,
      password: 'TestPassword123!',
    });
    testAdminId = user!.id;

    await supabase.from('admins').insert({
      id: testAdminId,
      tenant_id: testTenantId,
      email: user!.email,
    });

    // Get auth token
    const { data: { session } } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: 'TestPassword123!',
    });
    authToken = session!.access_token;
  });

  afterAll(async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.from('admins').delete().eq('id', testAdminId);
    await supabase.from('tenants').delete().eq('id', testTenantId);
    await supabase.auth.admin.deleteUser(testAdminId);
  });

  it('should return quota information for authenticated admin', async () => {
    const response = await fetch(`${API_BASE_URL}/api/admin/thumbnails/quota`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      used: 2,
      total: 5,
      remaining: 3,
      percentage_used: 40.0,
      quota_exhausted: false,
      quota_status: 'available',
    });
  });

  it('should return low quota status when <= 20% remaining', async () => {
    // Update quota to 80% used (4 out of 5)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase
      .from('tenants')
      .update({ thumbnail_quota_used: 4 })
      .eq('id', testTenantId);

    const response = await fetch(`${API_BASE_URL}/api/admin/thumbnails/quota`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      used: 4,
      total: 5,
      remaining: 1,
      percentage_used: 80.0,
      quota_exhausted: false,
      quota_status: 'low',
    });

    // Reset quota
    await supabase
      .from('tenants')
      .update({ thumbnail_quota_used: 2 })
      .eq('id', testTenantId);
  });

  it('should return exhausted quota status when 0 remaining', async () => {
    // Exhaust quota
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase
      .from('tenants')
      .update({ thumbnail_quota_used: 5 })
      .eq('id', testTenantId);

    const response = await fetch(`${API_BASE_URL}/api/admin/thumbnails/quota`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      used: 5,
      total: 5,
      remaining: 0,
      percentage_used: 100.0,
      quota_exhausted: true,
      quota_status: 'exhausted',
    });

    // Reset quota
    await supabase
      .from('tenants')
      .update({ thumbnail_quota_used: 2 })
      .eq('id', testTenantId);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await fetch(`${API_BASE_URL}/api/admin/thumbnails/quota`, {
      method: 'GET',
    });

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'UNAUTHORIZED',
      message: expect.stringContaining('Authentication required'),
    });
  });

  it('should include all required fields in response', async () => {
    const response = await fetch(`${API_BASE_URL}/api/admin/thumbnails/quota`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('used');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('remaining');
    expect(body).toHaveProperty('percentage_used');
    expect(body).toHaveProperty('quota_exhausted');
    expect(body).toHaveProperty('quota_status');
  });

  it('should calculate percentage correctly', async () => {
    // Set quota to specific values for calculation test
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase
      .from('tenants')
      .update({
        thumbnail_quota_total: 10,
        thumbnail_quota_used: 3,
      })
      .eq('id', testTenantId);

    const response = await fetch(`${API_BASE_URL}/api/admin/thumbnails/quota`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      used: 3,
      total: 10,
      remaining: 7,
      percentage_used: 30.0,
      quota_status: 'available',
    });

    // Reset quota
    await supabase
      .from('tenants')
      .update({
        thumbnail_quota_total: 5,
        thumbnail_quota_used: 2,
      })
      .eq('id', testTenantId);
  });
});
