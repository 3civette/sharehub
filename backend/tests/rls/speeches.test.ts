/**
 * RLS Tests: Speeches Table
 * Purpose: Verify tenant isolation and public access for speeches table
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
let speech1Id: string;
let speech2Id: string;

describe('RLS Speeches Table Tests', () => {
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create two test tenants
    const { data: tenant1 } = await supabase
      .from('tenants')
      .insert({ subdomain: 'rls-speeches-tenant-1', name: 'RLS Speeches Tenant 1' })
      .select()
      .single();
    tenant1Id = tenant1!.id;

    const { data: tenant2 } = await supabase
      .from('tenants')
      .insert({ subdomain: 'rls-speeches-tenant-2', name: 'RLS Speeches Tenant 2' })
      .select()
      .single();
    tenant2Id = tenant2!.id;

    // Create admin users
    const { data: { user: user1 } } = await supabase.auth.admin.createUser({
      email: 'admin1@rls-speeches-test.com',
      password: 'testpass123',
      email_confirm: true
    });
    admin1Id = user1!.id;

    const { data: { user: user2 } } = await supabase.auth.admin.createUser({
      email: 'admin2@rls-speeches-test.com',
      password: 'testpass123',
      email_confirm: true
    });
    admin2Id = user2!.id;

    // Link admins to tenants
    await supabase.from('admins').insert({
      id: admin1Id,
      tenant_id: tenant1Id,
      email: 'admin1@rls-speeches-test.com',
      name: 'Admin 1'
    });

    await supabase.from('admins').insert({
      id: admin2Id,
      tenant_id: tenant2Id,
      email: 'admin2@rls-speeches-test.com',
      name: 'Admin 2'
    });

    // Create test events
    const { data: event1 } = await supabase
      .from('events')
      .insert({
        tenant_id: tenant1Id,
        slug: 'rls-speeches-event-1',
        name: 'RLS Speeches Event 1',
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
        slug: 'rls-speeches-event-2',
        name: 'RLS Speeches Event 2',
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
        title: 'Session 1'
      })
      .select()
      .single();
    session1Id = session1!.id;

    const { data: session2 } = await supabase
      .from('sessions')
      .insert({
        event_id: event2Id,
        tenant_id: tenant2Id,
        title: 'Session 2'
      })
      .select()
      .single();
    session2Id = session2!.id;

    // Create test speeches
    const { data: speech1 } = await supabase
      .from('speeches')
      .insert({
        session_id: session1Id,
        tenant_id: tenant1Id,
        title: 'Speech 1',
        speaker_name: 'Speaker 1'
      })
      .select()
      .single();
    speech1Id = speech1!.id;

    const { data: speech2 } = await supabase
      .from('speeches')
      .insert({
        session_id: session2Id,
        tenant_id: tenant2Id,
        title: 'Speech 2',
        speaker_name: 'Speaker 2'
      })
      .select()
      .single();
    speech2Id = speech2!.id;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('speeches').delete().eq('id', speech1Id);
    await supabase.from('speeches').delete().eq('id', speech2Id);
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
    it('should allow tenant1 admin to create speeches for their sessions', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-speeches-test.com',
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
        .from('speeches')
        .insert({
          session_id: session1Id,
          tenant_id: tenant1Id,
          title: 'New Speech',
          speaker_name: 'New Speaker',
          duration_minutes: 45
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.session_id).toBe(session1Id);

      // Cleanup
      if (data) {
        await supabase.from('speeches').delete().eq('id', data.id);
      }
    });

    it('should block tenant1 admin from creating speeches for tenant2 sessions', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-speeches-test.com',
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
        .from('speeches')
        .insert({
          session_id: session2Id, // Tenant2's session
          tenant_id: tenant2Id,
          title: 'Cross-tenant Speech',
          speaker_name: 'Hacker'
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should allow tenant1 admin to update their own speeches', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-speeches-test.com',
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
        .from('speeches')
        .update({ title: 'Updated Speech 1' })
        .eq('id', speech1Id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.title).toBe('Updated Speech 1');
    });

    it('should block tenant1 admin from updating tenant2 speeches', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-speeches-test.com',
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
        .from('speeches')
        .update({ title: 'Hacked Speech' })
        .eq('id', speech2Id)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should allow tenant1 admin to delete their own speeches', async () => {
      // Create a speech to delete
      const { data: speechToDelete } = await supabase
        .from('speeches')
        .insert({
          session_id: session1Id,
          tenant_id: tenant1Id,
          title: 'Speech to Delete',
          speaker_name: 'Temp Speaker'
        })
        .select()
        .single();

      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-speeches-test.com',
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
        .from('speeches')
        .delete()
        .eq('id', speechToDelete!.id);

      expect(error).toBeNull();
    });

    it('should block tenant1 admin from deleting tenant2 speeches', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-speeches-test.com',
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
        .from('speeches')
        .delete()
        .eq('id', speech2Id);

      expect(error).toBeDefined();
    });
  });

  describe('Public Access', () => {
    it('should allow public to view all speeches', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { data, error } = await anonClient
        .from('speeches')
        .select('*')
        .eq('id', speech1Id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBe(speech1Id);
    });

    it('should block public from creating speeches', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { data, error } = await anonClient
        .from('speeches')
        .insert({
          session_id: session1Id,
          tenant_id: tenant1Id,
          title: 'Public Speech',
          speaker_name: 'Public Speaker'
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should block public from updating speeches', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { error } = await anonClient
        .from('speeches')
        .update({ title: 'Hacked' })
        .eq('id', speech1Id);

      expect(error).toBeDefined();
    });

    it('should block public from deleting speeches', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { error } = await anonClient
        .from('speeches')
        .delete()
        .eq('id', speech1Id);

      expect(error).toBeDefined();
    });
  });
});
