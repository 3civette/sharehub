-- Migration: 005-event-photos
-- Feature: Event Details Management
-- Description: Create event_photos table for event cover images and gallery
-- Date: 2025-10-08

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create event_photos table
CREATE TABLE IF NOT EXISTS event_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL CHECK (length(filename) <= 255),
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 52428800), -- 50MB max
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  is_cover BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES admins(id),

  -- Unique constraint: one cover per event
  CONSTRAINT unique_cover_per_event UNIQUE (event_id, is_cover) WHERE is_cover = true,

  -- Unique constraint: display_order per event
  CONSTRAINT unique_display_order_per_event UNIQUE (event_id, display_order)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_tenant_id ON event_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_is_cover ON event_photos(event_id, is_cover) WHERE is_cover = true;

-- Enable Row Level Security
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant admins can manage photos for their events
CREATE POLICY "tenant_admins_manage_photos" ON event_photos
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM admins WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM admins WHERE id = auth.uid()
    )
  );

-- RLS Policy: Public can view all photos (for public events)
CREATE POLICY "public_view_photos" ON event_photos
  FOR SELECT
  USING (true);

-- RLS Policy: Organizer tokens can view photos for their events
CREATE POLICY "organizer_view_photos" ON event_photos
  FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM access_tokens
      WHERE token = current_setting('app.current_token', true)
      AND type = 'organizer'
      AND expires_at > NOW()
    )
  );

-- Create Supabase Storage bucket for event photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Admins can upload photos for their tenant's events
CREATE POLICY "admins_can_upload_photos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'event-photos' AND
    auth.uid() IN (
      SELECT id FROM admins
      WHERE tenant_id = (storage.foldername(name))[1]::uuid
    )
  );

-- Storage RLS: Admins can delete photos for their tenant's events
CREATE POLICY "admins_can_delete_photos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'event-photos' AND
    auth.uid() IN (
      SELECT id FROM admins
      WHERE tenant_id = (storage.foldername(name))[1]::uuid
    )
  );

-- Storage RLS: Public read access
CREATE POLICY "public_can_view_photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'event-photos');

-- Add comment for documentation
COMMENT ON TABLE event_photos IS 'Event photos including one cover image and optional gallery images';
COMMENT ON COLUMN event_photos.is_cover IS 'True if this is the primary cover image (only one per event)';
COMMENT ON COLUMN event_photos.display_order IS 'Display order in gallery (0 for cover, 1+ for gallery)';
COMMENT ON COLUMN event_photos.storage_path IS 'Path in Supabase Storage: event-photos/{tenantId}/{eventId}/{timestamp}-{filename}';
