/**
 * RLS Tests: Sessions Table
 * Purpose: Verify tenant isolation and public access for sessions table
 * Feature: 005-ora-bisogna-implementare
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabase: SupabaseClient;
let tenant1Id: string;
let tenant2Id: string;
let admin1Id: string;
let admin2Id: string;
let event1Id: string;
let event2Id: string;
let session1Id: string;
let session2Id: string;

describe('RLS Sessions Table Tests', () => {
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create two test tenants
    const { data: tenant1 } = await supabase
      .from('tenants')
      .insert({ subdomain: 'rls-sessions-tenant-1', name: 'RLS Sessions Tenant 1' })
      .select()
      .single();
    tenant1Id = tenant1!.id;

    const { data: tenant2 } = await supabase
      .from('tenants')
      .insert({ subdomain: 'rls-sessions-tenant-2', name: 'RLS Sessions Tenant 2' })
      .select()
      .single();
    tenant2Id = tenant2!.id;

    // Create admin users
    const { data: { user: user1 } } = await supabase.auth.admin.createUser({
      email: 'admin1@rls-sessions-test.com',
      password: 'testpass123',
      email_confirm: true
    });
    admin1Id = user1!.id;

    const { data: { user: user2 } } = await supabase.auth.admin.createUser({
      email: 'admin2@rls-sessions-test.com',
      password: 'testpass123',
      email_confirm: true
    });
    admin2Id = user2!.id;

    // Link admins to tenants
    await supabase.from('admins').insert({
      id: admin1Id,
      tenant_id: tenant1Id,
      email: 'admin1@rls-sessions-test.com',
      name: 'Admin 1'
    });

    await supabase.from('admins').insert({
      id: admin2Id,
      tenant_id: tenant2Id,
      email: 'admin2@rls-sessions-test.com',
      name: 'Admin 2'
    });

    // Create test events
    const { data: event1 } = await supabase
      .from('events')
      .insert({
        tenant_id: tenant1Id,
        slug: 'rls-sessions-event-1',
        name: 'RLS Sessions Event 1',
        date: '2025-12-01',
        visibility: 'public'
      })
      .select()
      .single();
    event1Id = event1!.id;

    const { data: event2 } = await supabase
      .from('events')
      .insert({
        tenant_id: tenant2Id,
        slug: 'rls-sessions-event-2',
        name: 'RLS Sessions Event 2',
        date: '2025-12-01',
        visibility: 'public'
      })
      .select()
      .single();
    event2Id = event2!.id;

    // Create test sessions
    const { data: session1 } = await supabase
      .from('sessions')
      .insert({
        event_id: event1Id,
        tenant_id: tenant1Id,
        title: 'Session 1',
        scheduled_time: '2025-12-01T09:00:00Z'
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
        scheduled_time: '2025-12-01T09:00:00Z'
      })
      .select()
      .single();
    session2Id = session2!.id;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('sessions').delete().eq('id', session1Id);
    await supabase.from('sessions').delete().eq('id', session2Id);
    await supabase.from('events').delete().eq('id', event1Id);
    await supabase.from('events').delete().eq('id', event2Id);
    await supabase.from('admins').delete().eq('id', admin1Id);
    await supabase.from('admins').delete().eq('id', admin2Id);
    await supabase.auth.admin.deleteUser(admin1Id);
    await supabase.auth.admin.deleteUser(admin2Id);
    await supabase.from('tenants').delete().eq('id', tenant1Id);
    await supabase.from('tenants').delete().eq('id', tenant2Id);
  });

  describe('Tenant Admin CRUD Access', () => {
    it('should allow tenant1 admin to create sessions for their events', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-sessions-test.com',
        password: 'testpass123'
      });

      const adminClient = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session!.access_token}`
          }
        }
      });

      const { data, error } = await adminClient
        .from('sessions')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          title: 'New Session',
          description: 'Test session',
          scheduled_time: '2025-12-01T10:00:00Z'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.event_id).toBe(event1Id);

      // Cleanup
      if (data) {
        await supabase.from('sessions').delete().eq('id', data.id);
      }
    });

    it('should block tenant1 admin from creating sessions for tenant2 events', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-sessions-test.com',
        password: 'testpass123'
      });

      const adminClient = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session!.access_token}`
          }
        }
      });

      const { data, error } = await adminClient
        .from('sessions')
        .insert({
          event_id: event2Id, // Tenant2's event
          tenant_id: tenant2Id,
          title: 'Cross-tenant Session'
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should allow tenant1 admin to update their own sessions', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-sessions-test.com',
        password: 'testpass123'
      });

      const adminClient = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session!.access_token}`
          }
        }
      });

      const { data, error } = await adminClient
        .from('sessions')
        .update({ title: 'Updated Session 1' })
        .eq('id', session1Id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.title).toBe('Updated Session 1');
    });

    it('should block tenant1 admin from updating tenant2 sessions', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-sessions-test.com',
        password: 'testpass123'
      });

      const adminClient = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session!.access_token}`
          }
        }
      });

      const { data, error } = await adminClient
        .from('sessions')
        .update({ title: 'Hacked Session' })
        .eq('id', session2Id)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should allow tenant1 admin to delete their own sessions', async () => {
      // Create a session to delete
      const { data: sessionToDelete } = await supabase
        .from('sessions')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          title: 'Session to Delete'
        })
        .select()
        .single();

      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-sessions-test.com',
        password: 'testpass123'
      });

      const adminClient = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session!.access_token}`
          }
        }
      });

      const { error } = await adminClient
        .from('sessions')
        .delete()
        .eq('id', sessionToDelete!.id);

      expect(error).toBeNull();
    });

    it('should block tenant1 admin from deleting tenant2 sessions', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-sessions-test.com',
        password: 'testpass123'
      });

      const adminClient = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session!.access_token}`
          }
        }
      });

      const { error } = await adminClient
        .from('sessions')
        .delete()
        .eq('id', session2Id);

      expect(error).toBeDefined();
    });
  });

  describe('Public Access', () => {
    it('should allow public to view all sessions', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { data, error } = await anonClient
        .from('sessions')
        .select('*')
        .eq('id', session1Id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBe(session1Id);
    });

    it('should block public from creating sessions', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { data, error } = await anonClient
        .from('sessions')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          title: 'Public Session'
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should block public from updating sessions', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { error } = await anonClient
        .from('sessions')
        .update({ title: 'Hacked' })
        .eq('id', session1Id);

      expect(error).toBeDefined();
    });

    it('should block public from deleting sessions', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { error } = await anonClient
        .from('sessions')
        .delete()
        .eq('id', session1Id);

      expect(error).toBeDefined();
    });
  });
});
