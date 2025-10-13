-- Migration: Add thumbnail support to slides table
-- Feature: Asynchronous thumbnail generation for slide previews
-- Date: 2025-01-13

-- Add thumbnail_r2_key column (Cloudflare R2 path for thumbnail image)
ALTER TABLE public.slides
ADD COLUMN thumbnail_r2_key text NULL;

-- Add thumbnail_status column to track generation state
ALTER TABLE public.slides
ADD COLUMN thumbnail_status text NOT NULL DEFAULT 'pending';

-- Add thumbnail_generated_at timestamp
ALTER TABLE public.slides
ADD COLUMN thumbnail_generated_at timestamptz NULL;

-- Add constraint for thumbnail_status enum values
ALTER TABLE public.slides
ADD CONSTRAINT slides_thumbnail_status_check CHECK (
  thumbnail_status IN ('pending', 'processing', 'completed', 'failed')
);

-- Add constraint for thumbnail_r2_key pattern (same as main r2_key but with -thumb suffix)
ALTER TABLE public.slides
ADD CONSTRAINT slides_thumbnail_r2_key_pattern CHECK (
  thumbnail_r2_key IS NULL OR
  thumbnail_r2_key ~ '^tenant-[a-f0-9-]+/event-[a-f0-9-]+/slide-[a-f0-9-]+-thumb\.(jpg|png|webp)$'
);

-- Add comments for clarity
COMMENT ON COLUMN public.slides.thumbnail_r2_key IS 'Cloudflare R2 key for thumbnail image (JPEG/PNG/WebP, max 200KB)';
COMMENT ON COLUMN public.slides.thumbnail_status IS 'Thumbnail generation status: pending, processing, completed, failed';
COMMENT ON COLUMN public.slides.thumbnail_generated_at IS 'Timestamp when thumbnail was successfully generated';

-- Create index for efficient status queries
CREATE INDEX idx_slides_thumbnail_status ON public.slides(thumbnail_status) WHERE deleted_at IS NULL;
