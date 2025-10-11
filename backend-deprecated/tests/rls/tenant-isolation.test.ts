/**
 * RLS Tenant Isolation Tests
 * Purpose: Verify cross-tenant access is blocked for all event management tables
 * Feature: 003-ora-facciamo-il
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabase: SupabaseClient;
let tenant1Id: string;
let tenant2Id: string;
let event1Id: string;
let event2Id: string;

describe('RLS Tenant Isolation Tests', () => {
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create two test tenants
    const { data: tenant1 } = await supabase
      .from('tenants')
      .insert({ subdomain: 'rls-test-tenant-1', name: 'RLS Test Tenant 1' })
      .select()
      .single();
    tenant1Id = tenant1!.id;

    const { data: tenant2 } = await supabase
      .from('tenants')
      .insert({ subdomain: 'rls-test-tenant-2', name: 'RLS Test Tenant 2' })
      .select()
      .single();
    tenant2Id = tenant2!.id;

    // Create test events for each tenant
    const { data: event1 } = await supabase
      .from('events')
      .insert({
        tenant_id: tenant1Id,
        slug: 'rls-test-event-1',
        name: 'RLS Test Event 1',
        date: '2025-12-01',
        visibility: 'public',
      })
      .select()
      .single();
    event1Id = event1!.id;

    const { data: event2 } = await supabase
      .from('events')
      .insert({
        tenant_id: tenant2Id,
        slug: 'rls-test-event-2',
        name: 'RLS Test Event 2',
        date: '2025-12-01',
        visibility: 'public',
      })
      .select()
      .single();
    event2Id = event2!.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test events and tenants (cascade will clean up related data)
    await supabase.from('events').delete().eq('id', event1Id);
    await supabase.from('events').delete().eq('id', event2Id);
    await supabase.from('tenants').delete().eq('id', tenant1Id);
    await supabase.from('tenants').delete().eq('id', tenant2Id);
  });

  describe('Events Table Isolation', () => {
    it('should allow tenant1 to access their own events', async () => {
      // Set tenant context
      await supabase.rpc('set_config', {
        setting: 'app.current_tenant_id',
        value: tenant1Id,
        is_local: true,
      });

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', event1Id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(event1Id);
    });

    it('should block tenant1 from accessing tenant2 events', async () => {
      // Set tenant1 context
      await supabase.rpc('set_config', {
        setting: 'app.current_tenant_id',
        value: tenant1Id,
        is_local: true,
      });

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', event2Id); // Try to access tenant2's event

      expect(error).toBeNull();
      expect(data).toHaveLength(0); // RLS should filter out tenant2's event
    });

    it('should allow tenant2 to access their own events', async () => {
      // Set tenant2 context
      await supabase.rpc('set_config', {
        setting: 'app.current_tenant_id',
        value: tenant2Id,
        is_local: true,
      });

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', event2Id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(event2Id);
    });
  });

  describe('Sessions Table Isolation', () => {
    let session1Id: string;
    let session2Id: string;

    beforeAll(async () => {
      // Create sessions for each event
      const { data: session1 } = await supabase
        .from('sessions')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          title: 'Session 1',
          display_order: 0,
        })
        .select()
        .single();
      session1Id = session1!.id;

      const { data: session2 } = await supabase
        .from('sessions')
        .insert({
          event_id: event2Id,
          tenant_id: tenant2Id,
          title: 'Session 2',
          display_order: 0,
        })
        .select()
        .single();
      session2Id = session2!.id;
    });

    afterAll(async () => {
      await supabase.from('sessions').delete().eq('id', session1Id);
      await supabase.from('sessions').delete().eq('id', session2Id);
    });

    it('should block cross-tenant session access', async () => {
      // Set tenant1 context
      await supabase.rpc('set_config', {
        setting: 'app.current_tenant_id',
        value: tenant1Id,
        is_local: true,
      });

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session2Id); // Try to access tenant2's session

      expect(error).toBeNull();
      expect(data).toHaveLength(0); // RLS should block access
    });
  });

  describe('Speeches Table Isolation', () => {
    let sessionId: string;
    let speech1Id: string;
    let speech2Id: string;

    beforeAll(async () => {
      // Create a session first
      const { data: session } = await supabase
        .from('sessions')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          title: 'Test Session',
          display_order: 0,
        })
        .select()
        .single();
      sessionId = session!.id;

      // Create speeches with different tenants (simulating cross-tenant attack)
      const { data: speech1 } = await supabase
        .from('speeches')
        .insert({
          session_id: sessionId,
          tenant_id: tenant1Id,
          title: 'Speech 1',
          display_order: 0,
        })
        .select()
        .single();
      speech1Id = speech1!.id;

      // Attempt to create speech with wrong tenant_id (should be blocked in real scenario)
      const { data: speech2 } = await supabase
        .from('speeches')
        .insert({
          session_id: sessionId,
          tenant_id: tenant2Id, // Wrong tenant!
          title: 'Speech 2',
          display_order: 1,
        })
        .select()
        .single();
      speech2Id = speech2!.id;
    });

    afterAll(async () => {
      await supabase.from('speeches').delete().eq('session_id', sessionId);
      await supabase.from('sessions').delete().eq('id', sessionId);
    });

    it('should only show speeches matching tenant context', async () => {
      // Set tenant1 context
      await supabase.rpc('set_config', {
        setting: 'app.current_tenant_id',
        value: tenant1Id,
        is_local: true,
      });

      const { data, error } = await supabase
        .from('speeches')
        .select('*')
        .eq('session_id', sessionId);

      expect(error).toBeNull();
      // Should only see speech1 (tenant1), not speech2 (tenant2)
      expect(data!.every((s) => s.tenant_id === tenant1Id)).toBe(true);
    });
  });

  describe('Slides Table Isolation', () => {
    let sessionId: string;
    let speechId: string;
    let slide1Id: string;

    beforeAll(async () => {
      // Create session and speech
      const { data: session } = await supabase
        .from('sessions')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          title: 'Test Session',
          display_order: 0,
        })
        .select()
        .single();
      sessionId = session!.id;

      const { data: speech } = await supabase
        .from('speeches')
        .insert({
          session_id: sessionId,
          tenant_id: tenant1Id,
          title: 'Test Speech',
          display_order: 0,
        })
        .select()
        .single();
      speechId = speech!.id;

      // Create slide
      const { data: slide1 } = await supabase
        .from('slides')
        .insert({
          speech_id: speechId,
          tenant_id: tenant1Id,
          filename: 'test-slide.pdf',
          storage_path: 'slides/test/test-slide.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          display_order: 0,
        })
        .select()
        .single();
      slide1Id = slide1!.id;
    });

    afterAll(async () => {
      await supabase.from('slides').delete().eq('speech_id', speechId);
      await supabase.from('speeches').delete().eq('id', speechId);
      await supabase.from('sessions').delete().eq('id', sessionId);
    });

    it('should block cross-tenant slide access', async () => {
      // Set tenant2 context (different from slide's tenant)
      await supabase.rpc('set_config', {
        setting: 'app.current_tenant_id',
        value: tenant2Id,
        is_local: true,
      });

      const { data, error } = await supabase
        .from('slides')
        .select('*')
        .eq('id', slide1Id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0); // RLS should block access
    });
  });

  describe('Activity Logs Isolation', () => {
    let logId: string;

    beforeAll(async () => {
      const { data: log } = await supabase
        .from('activity_logs')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          actor_type: 'admin',
          action_type: 'view',
          retention_days: 90,
        })
        .select()
        .single();
      logId = log!.id;
    });

    afterAll(async () => {
      await supabase.from('activity_logs').delete().eq('id', logId);
    });

    it('should block cross-tenant activity log access', async () => {
      // Set tenant2 context
      await supabase.rpc('set_config', {
        setting: 'app.current_tenant_id',
        value: tenant2Id,
        is_local: true,
      });

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('id', logId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0); // RLS should block access
    });
  });

  describe('RLS Helper Function', () => {
    it('should run isolation test helper successfully', async () => {
      const { data, error } = await supabase.rpc('test_rls_isolation', {
        test_tenant_id: tenant1Id,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // All tables should be readable with proper tenant context
      const results = data as Array<{
        table_name: string;
        can_read: boolean;
        error_message: string | null;
      }>;

      results.forEach((result) => {
        expect(result.can_read).toBe(true);
        expect(result.error_message).toBeNull();
      });
    });
  });
});
