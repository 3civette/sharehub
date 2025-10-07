-- Migration: Feature 003 - Event Flow Management Schema
-- Purpose: Create hierarchical event management tables
-- Date: 2025-10-07
-- Dependencies: Requires tenants and admins tables from feature 002

-- =============================================================================
-- TABLE: events
-- Purpose: Core event entity with visibility control and lifecycle management
-- =============================================================================
CREATE TABLE events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,

  -- Core attributes
  name TEXT NOT NULL CHECK (length(name) <= 200),
  date DATE NOT NULL CHECK (date >= '2020-01-01'),
  description TEXT,

  -- Visibility & Status
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'past', 'archived')),

  -- Token configuration (for private events)
  token_expiration_date TIMESTAMP WITH TIME ZONE,

  -- Data retention
  retention_policy TEXT NOT NULL DEFAULT 'keep_forever'
    CHECK (retention_policy IN ('keep_forever', 'archive_1year', 'delete_2years')),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES admins(id),

  -- Constraints
  CONSTRAINT unique_slug_per_tenant UNIQUE (tenant_id, slug),
  CONSTRAINT valid_token_expiration CHECK (
    (visibility = 'private' AND token_expiration_date IS NOT NULL)
    OR (visibility = 'public' AND token_expiration_date IS NULL)
  )
);

COMMENT ON TABLE events IS 'Core event entity with public/private visibility and lifecycle management';
COMMENT ON COLUMN events.slug IS 'URL-friendly identifier, unique per tenant';
COMMENT ON COLUMN events.visibility IS 'public = no auth required, private = token required';
COMMENT ON COLUMN events.status IS 'upcoming/past/archived based on date and retention policy';

-- =============================================================================
-- TABLE: sessions
-- Purpose: Time blocks or thematic groupings within events
-- =============================================================================
CREATE TABLE sessions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Attributes
  title TEXT NOT NULL CHECK (length(title) <= 100),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  start_time TIMESTAMP WITH TIME ZONE,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_display_order_per_event UNIQUE (event_id, display_order)
);

COMMENT ON TABLE sessions IS 'Time blocks or thematic groupings within events';
COMMENT ON COLUMN sessions.display_order IS 'Manual ordering within event, must be unique';

-- =============================================================================
-- TABLE: speeches
-- Purpose: Individual presentations or talks within sessions
-- =============================================================================
CREATE TABLE speeches (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Attributes
  title TEXT NOT NULL CHECK (length(title) <= 150),
  speaker_name TEXT CHECK (speaker_name IS NULL OR length(speaker_name) <= 100),
  duration INTEGER CHECK (duration IS NULL OR (duration >= 1 AND duration <= 600)),
  description TEXT,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_display_order_per_session UNIQUE (session_id, display_order)
);

COMMENT ON TABLE speeches IS 'Individual presentations or talks within sessions';
COMMENT ON COLUMN speeches.duration IS 'Duration in minutes, range 1-600';

-- =============================================================================
-- TABLE: slides
-- Purpose: Uploaded presentation files associated with speeches
-- =============================================================================
CREATE TABLE slides (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speech_id UUID NOT NULL REFERENCES speeches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- File attributes
  filename TEXT NOT NULL CHECK (length(filename) <= 255),
  storage_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 104857600), -- 100MB max
  mime_type TEXT NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.apple.keynote',
    'application/vnd.oasis.opendocument.presentation'
  )),

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),

  -- Audit
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_display_order_per_speech UNIQUE (speech_id, display_order)
);

COMMENT ON TABLE slides IS 'Uploaded presentation files associated with speeches';
COMMENT ON COLUMN slides.storage_path IS 'Path in Supabase Storage, must be unique globally';
COMMENT ON COLUMN slides.file_size IS 'Size in bytes, max 100MB (104857600)';
COMMENT ON COLUMN slides.uploaded_by IS 'Format: organizer:{token_id} or admin:{admin_id}';

-- =============================================================================
-- TABLE: access_tokens
-- Purpose: Token-based authentication for private events
-- =============================================================================
CREATE TABLE access_tokens (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Token attributes
  token TEXT UNIQUE NOT NULL CHECK (length(token) = 21),
  type TEXT NOT NULL CHECK (type IN ('organizer', 'participant')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Usage tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),

  -- Constraints
  CONSTRAINT expires_after_creation CHECK (expires_at > created_at)
);

COMMENT ON TABLE access_tokens IS 'Token-based authentication for private events';
COMMENT ON COLUMN access_tokens.token IS 'Unique 21-character nanoid token';
COMMENT ON COLUMN access_tokens.type IS 'organizer = full access, participant = read-only';

-- =============================================================================
-- TABLE: event_metrics
-- Purpose: Analytics data with tiered access based on subscription plan
-- =============================================================================
CREATE TABLE event_metrics (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic metrics (free tier)
  page_views INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
  total_slide_downloads INTEGER NOT NULL DEFAULT 0 CHECK (total_slide_downloads >= 0),

  -- Premium metrics (stored as JSONB)
  unique_visitors JSONB NOT NULL DEFAULT '{}',
  per_slide_downloads JSONB NOT NULL DEFAULT '{}',
  per_speech_downloads JSONB NOT NULL DEFAULT '{}',
  geographic_data JSONB NOT NULL DEFAULT '{}',
  device_types JSONB NOT NULL DEFAULT '{}',
  access_timeline JSONB NOT NULL DEFAULT '[]',

  -- Audit
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE event_metrics IS 'Analytics data with tiered access (free vs premium)';
COMMENT ON COLUMN event_metrics.page_views IS 'Basic metric: total page view count';
COMMENT ON COLUMN event_metrics.unique_visitors IS 'Premium: {ip_hash: last_seen_iso}';
COMMENT ON COLUMN event_metrics.per_slide_downloads IS 'Premium: {slide_id: count}';

-- =============================================================================
-- TABLE: activity_logs
-- Purpose: Audit trail of file operations with configurable retention
-- =============================================================================
CREATE TABLE activity_logs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Event details
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('organizer', 'participant', 'anonymous', 'admin')),
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'download', 'view', 'edit', 'delete')),

  -- File context (nullable - deleted items set to NULL)
  filename TEXT,
  file_size INTEGER,
  slide_id UUID REFERENCES slides(id) ON DELETE SET NULL,
  speech_id UUID REFERENCES speeches(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Retention configuration
  retention_days INTEGER NOT NULL DEFAULT 90 CHECK (retention_days = -1 OR retention_days > 0),

  -- Additional metadata
  metadata JSONB
);

COMMENT ON TABLE activity_logs IS 'Audit trail of file operations with configurable retention';
COMMENT ON COLUMN activity_logs.retention_days IS '-1 for indefinite, or 30/90/365 for time-based cleanup';
COMMENT ON COLUMN activity_logs.metadata IS 'Optional: {ip_hash, user_agent, etc.}';

-- =============================================================================
-- Success Message
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 003-events-schema.sql completed successfully';
  RAISE NOTICE 'Created 7 tables: events, sessions, speeches, slides, access_tokens, event_metrics, activity_logs';
END $$;
