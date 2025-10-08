/**
 * File Upload Middleware
 * Feature: 005-ora-bisogna-implementare
 * Purpose: Multi-format validation with event-specific allow-lists
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default allowed formats for slides
const DEFAULT_SLIDE_FORMATS = [
  'application/pdf',
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];

// Default allowed formats for photos
const DEFAULT_PHOTO_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/**
 * Validate file formats against allowed list
 * @param file - Multer file object
 * @param allowedFormats - Array of allowed MIME types
 * @returns Error message or null if valid
 */
export function validateFileFormats(
  file: Express.Multer.File,
  allowedFormats: string[]
): string | null {
  if (!allowedFormats.includes(file.mimetype)) {
    return `Invalid file type. Allowed formats: ${allowedFormats.join(', ')}`;
  }
  return null;
}

/**
 * Validate file size
 * @param file - Multer file object
 * @param maxSizeMB - Maximum file size in MB
 * @returns Error message or null if valid
 */
export function validateFileSize(
  file: Express.Multer.File,
  maxSizeMB: number = 50
): string | null {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File too large. Maximum size: ${maxSizeMB}MB`;
  }
  return null;
}

/**
 * Middleware: Validate slide upload with event-specific formats
 * Loads allowed_slide_formats from events table
 */
export async function validateSlideUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const file = req.file;
    const eventId = req.params.eventId || req.body.event_id;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file size (50MB default)
    const sizeError = validateFileSize(file, 50);
    if (sizeError) {
      return res.status(400).json({ error: sizeError });
    }

    // Load event-specific allowed formats
    let allowedFormats = DEFAULT_SLIDE_FORMATS;

    if (eventId) {
      const { data: event } = await supabase
        .from('events')
        .select('allowed_slide_formats')
        .eq('id', eventId)
        .single();

      if (event?.allowed_slide_formats) {
        allowedFormats = event.allowed_slide_formats as string[];
      }
    }

    // Validate format
    const formatError = validateFileFormats(file, allowedFormats);
    if (formatError) {
      return res.status(400).json({
        error: formatError,
        allowed_formats: allowedFormats
      });
    }

    next();
  } catch (error) {
    console.error('File validation error:', error);
    res.status(500).json({
      error: 'File validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Middleware: Validate photo upload
 */
export function validatePhotoUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Validate file size (50MB for photos)
  const sizeError = validateFileSize(file, 50);
  if (sizeError) {
    return res.status(400).json({ error: sizeError });
  }

  // Validate format
  const formatError = validateFileFormats(file, DEFAULT_PHOTO_FORMATS);
  if (formatError) {
    return res.status(400).json({
      error: formatError,
      allowed_formats: DEFAULT_PHOTO_FORMATS
    });
  }

  next();
}

/**
 * Configure Multer for memory storage
 * Used for slide and photo uploads
 */
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * Helper: Get allowed formats for an event
 * @param eventId - Event UUID
 * @returns Array of allowed MIME types
 */
export async function getAllowedFormatsForEvent(eventId: string): Promise<string[]> {
  const { data: event } = await supabase
    .from('events')
    .select('allowed_slide_formats')
    .eq('id', eventId)
    .single();

  return event?.allowed_slide_formats || DEFAULT_SLIDE_FORMATS;
}
