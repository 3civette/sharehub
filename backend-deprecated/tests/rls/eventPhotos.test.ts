/**
 * RLS Tests: Event Photos Table
 * Purpose: Verify tenant isolation and public access for event_photos table
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
let photo1Id: string;
let photo2Id: string;

describe('RLS Event Photos Table Tests', () => {
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create two test tenants
    const { data: tenant1 } = await supabase
      .from('tenants')
      .insert({ subdomain: 'rls-photos-tenant-1', name: 'RLS Photos Tenant 1' })
      .select()
      .single();
    tenant1Id = tenant1!.id;

    const { data: tenant2 } = await supabase
      .from('tenants')
      .insert({ subdomain: 'rls-photos-tenant-2', name: 'RLS Photos Tenant 2' })
      .select()
      .single();
    tenant2Id = tenant2!.id;

    // Create admin users for each tenant
    const { data: { user: user1 } } = await supabase.auth.admin.createUser({
      email: 'admin1@rls-photos-test.com',
      password: 'testpass123',
      email_confirm: true
    });
    admin1Id = user1!.id;

    const { data: { user: user2 } } = await supabase.auth.admin.createUser({
      email: 'admin2@rls-photos-test.com',
      password: 'testpass123',
      email_confirm: true
    });
    admin2Id = user2!.id;

    // Link admins to tenants
    await supabase.from('admins').insert({
      id: admin1Id,
      tenant_id: tenant1Id,
      email: 'admin1@rls-photos-test.com',
      name: 'Admin 1'
    });

    await supabase.from('admins').insert({
      id: admin2Id,
      tenant_id: tenant2Id,
      email: 'admin2@rls-photos-test.com',
      name: 'Admin 2'
    });

    // Create test events for each tenant
    const { data: event1 } = await supabase
      .from('events')
      .insert({
        tenant_id: tenant1Id,
        slug: 'rls-photos-event-1',
        name: 'RLS Photos Event 1',
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
        slug: 'rls-photos-event-2',
        name: 'RLS Photos Event 2',
        date: '2025-12-01',
        visibility: 'public'
      })
      .select()
      .single();
    event2Id = event2!.id;

    // Create test photos for each event
    const { data: photo1 } = await supabase
      .from('event_photos')
      .insert({
        event_id: event1Id,
        tenant_id: tenant1Id,
        storage_path: 'event-photos/tenant1/event1/test.jpg',
        filename: 'test.jpg',
        file_size: 100000,
        mime_type: 'image/jpeg',
        is_cover: true,
        display_order: 0,
        uploaded_by: admin1Id
      })
      .select()
      .single();
    photo1Id = photo1!.id;

    const { data: photo2 } = await supabase
      .from('event_photos')
      .insert({
        event_id: event2Id,
        tenant_id: tenant2Id,
        storage_path: 'event-photos/tenant2/event2/test.jpg',
        filename: 'test.jpg',
        file_size: 100000,
        mime_type: 'image/jpeg',
        is_cover: true,
        display_order: 0,
        uploaded_by: admin2Id
      })
      .select()
      .single();
    photo2Id = photo2!.id;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('event_photos').delete().eq('id', photo1Id);
    await supabase.from('event_photos').delete().eq('id', photo2Id);
    await supabase.from('events').delete().eq('id', event1Id);
    await supabase.from('events').delete().eq('id', event2Id);
    await supabase.from('admins').delete().eq('id', admin1Id);
    await supabase.from('admins').delete().eq('id', admin2Id);
    await supabase.auth.admin.deleteUser(admin1Id);
    await supabase.auth.admin.deleteUser(admin2Id);
    await supabase.from('tenants').delete().eq('id', tenant1Id);
    await supabase.from('tenants').delete().eq('id', tenant2Id);
  });

  describe('Tenant Admin Access', () => {
    it('should allow tenant1 admin to insert photos for their events', async () => {
      // Create authenticated client for admin1
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-photos-test.com',
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
        .from('event_photos')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          storage_path: 'event-photos/tenant1/event1/new-photo.jpg',
          filename: 'new-photo.jpg',
          file_size: 50000,
          mime_type: 'image/jpeg',
          is_cover: false,
          display_order: 1
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.event_id).toBe(event1Id);

      // Cleanup
      if (data) {
        await supabase.from('event_photos').delete().eq('id', data.id);
      }
    });

    it('should block tenant1 admin from inserting photos for tenant2 events', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-photos-test.com',
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
        .from('event_photos')
        .insert({
          event_id: event2Id, // Tenant2's event
          tenant_id: tenant2Id,
          storage_path: 'event-photos/tenant2/event2/cross-tenant.jpg',
          filename: 'cross-tenant.jpg',
          file_size: 50000,
          mime_type: 'image/jpeg',
          is_cover: false,
          display_order: 1
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error!.message).toContain('violates row-level security policy');
      expect(data).toBeNull();
    });

    it('should allow tenant1 admin to delete their own photos', async () => {
      // First create a photo
      const { data: photo } = await supabase
        .from('event_photos')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          storage_path: 'event-photos/tenant1/event1/to-delete.jpg',
          filename: 'to-delete.jpg',
          file_size: 50000,
          mime_type: 'image/jpeg',
          is_cover: false,
          display_order: 2
        })
        .select()
        .single();

      // Delete with admin1
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-photos-test.com',
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
        .from('event_photos')
        .delete()
        .eq('id', photo!.id);

      expect(error).toBeNull();
    });

    it('should block tenant1 admin from deleting tenant2 photos', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin1@rls-photos-test.com',
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
        .from('event_photos')
        .delete()
        .eq('id', photo2Id); // Tenant2's photo

      expect(error).toBeDefined();
      expect(error!.message).toContain('violates row-level security policy');
    });
  });

  describe('Public Access', () => {
    it('should allow public (unauthenticated) to view all photos', async () => {
      // Create anonymous client (no auth)
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { data, error } = await anonClient
        .from('event_photos')
        .select('*')
        .eq('id', photo1Id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBe(photo1Id);
    });

    it('should block public from inserting photos', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { data, error } = await anonClient
        .from('event_photos')
        .insert({
          event_id: event1Id,
          tenant_id: tenant1Id,
          storage_path: 'event-photos/tenant1/event1/anon.jpg',
          filename: 'anon.jpg',
          file_size: 50000,
          mime_type: 'image/jpeg',
          is_cover: false,
          display_order: 3
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should block public from deleting photos', async () => {
      const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

      const { error } = await anonClient
        .from('event_photos')
        .delete()
        .eq('id', photo1Id);

      expect(error).toBeDefined();
    });
  });
});
