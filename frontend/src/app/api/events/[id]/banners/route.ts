/**
 * POST /api/events/[id]/banners - Upload banner for event
 * GET /api/events/[id]/banners - List all banners for event
 *
 * Feature: 010-ok-now-i - Event Advertisement Banner System
 * Contract: specs/010-ok-now-i/contracts/banners.yml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import BannerValidation from '@/lib/banners';
import type { Database } from '@/types/database.types';

type Banner = Database['public']['Tables']['banners']['Row'];

// =============================================================================
// POST Handler - Upload Banner
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    // -------------------------------------------------------------------------
    // Step 1: Authenticate user
    // -------------------------------------------------------------------------
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // -------------------------------------------------------------------------
    // Step 2: Parse multipart/form-data
    // -------------------------------------------------------------------------
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const slotNumberStr = formData.get('slot_number') as string | null;
    const clickUrl = (formData.get('click_url') as string | null) || null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        {
          error: 'MISSING_REQUIRED_FIELD',
          message: 'file is required',
          field: 'file',
        },
        { status: 400 }
      );
    }

    if (!slotNumberStr) {
      return NextResponse.json(
        {
          error: 'MISSING_REQUIRED_FIELD',
          message: 'slot_number is required',
          field: 'slot_number',
        },
        { status: 400 }
      );
    }

    const slotNumber = parseInt(slotNumberStr, 10);

    // -------------------------------------------------------------------------
    // Step 3: Validate file and slot
    // -------------------------------------------------------------------------
    if (!BannerValidation.validateFileSize(file.size)) {
      return NextResponse.json(
        {
          error: 'FILE_SIZE_EXCEEDS_LIMIT',
          message: BannerValidation.getFileSizeError(file.size),
          field: 'file_size',
        },
        { status: 400 }
      );
    }

    if (!BannerValidation.validateMimeType(file.type)) {
      return NextResponse.json(
        {
          error: 'INVALID_FILE_TYPE',
          message: BannerValidation.getMimeTypeError(file.type),
          field: 'mime_type',
        },
        { status: 400 }
      );
    }

    if (!BannerValidation.validateFileExtension(file.name, file.type)) {
      return NextResponse.json(
        {
          error: 'INVALID_FILE_TYPE',
          message: 'File extension does not match MIME type',
          field: 'mime_type',
        },
        { status: 400 }
      );
    }

    if (!BannerValidation.validateSlotNumber(slotNumber)) {
      return NextResponse.json(
        {
          error: 'INVALID_SLOT_NUMBER',
          message: BannerValidation.getSlotNumberError(slotNumber),
          field: 'slot_number',
        },
        { status: 400 }
      );
    }

    if (clickUrl && !BannerValidation.validateClickUrl(clickUrl)) {
      return NextResponse.json(
        {
          error: 'INVALID_URL_FORMAT',
          message: BannerValidation.getClickUrlError(clickUrl),
          field: 'click_url',
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Verify event exists and belongs to user's tenant (via RLS)
    // -------------------------------------------------------------------------
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, tenant_id')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Event not found or access denied (tenant isolation)',
        },
        { status: 403 }
      );
    }

    const tenantId = eventData.tenant_id;

    // -------------------------------------------------------------------------
    // Step 5: Check slot availability (prevent duplicates)
    // -------------------------------------------------------------------------
    const { data: existingBanner } = await supabase
      .from('banners')
      .select('id')
      .eq('event_id', eventId)
      .eq('slot_number', slotNumber)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingBanner) {
      return NextResponse.json(
        {
          error: 'SLOT_ALREADY_OCCUPIED',
          message: `Slot ${slotNumber} is already occupied. Delete the existing banner first.`,
          field: 'slot_number',
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 6: Generate banner ID and storage path
    // -------------------------------------------------------------------------
    const bannerId = crypto.randomUUID();
    const storagePath = BannerValidation.generateBannerStoragePath(
      tenantId,
      eventId,
      bannerId,
      slotNumber,
      file.name
    );

    // -------------------------------------------------------------------------
    // Step 7: Upload file to Supabase Storage
    // -------------------------------------------------------------------------
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('banners')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600', // Cache for 1 hour
        upsert: false, // Prevent overwriting
      });

    if (uploadError || !uploadData) {
      console.error('Failed to upload banner to Supabase Storage:', uploadError);
      return NextResponse.json(
        {
          error: 'STORAGE_UPLOAD_FAILED',
          message: 'Failed to upload banner file. Please try again.',
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 8: Create banner metadata in database
    // -------------------------------------------------------------------------
    const { data: banner, error: insertError } = await supabase
      .from('banners')
      .insert({
        id: bannerId,
        tenant_id: tenantId,
        event_id: eventId,
        slot_number: slotNumber,
        storage_path: storagePath,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        click_url: clickUrl,
        is_active: true,
      })
      .select('*')
      .single();

    if (insertError || !banner) {
      console.error('Failed to create banner metadata:', insertError);

      // Rollback: Delete uploaded file
      await supabase.storage.from('banners').remove([storagePath]);

      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to create banner metadata',
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 9: Return success response
    // -------------------------------------------------------------------------
    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/events/[id]/banners:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - List Banners
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    // -------------------------------------------------------------------------
    // Step 1: Authenticate user
    // -------------------------------------------------------------------------
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 2: Verify event belongs to user's tenant (via RLS)
    // -------------------------------------------------------------------------
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Event not found or access denied (tenant isolation)',
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 3: Fetch all banners for event (including inactive, excluding deleted)
    // -------------------------------------------------------------------------
    const { data: banners, error: fetchError } = await supabase
      .from('banners')
      .select('*')
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('slot_number', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch banners:', fetchError);
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch banners',
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Return banners array
    // -------------------------------------------------------------------------
    return NextResponse.json(banners || [], { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/events/[id]/banners:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Runtime Configuration
// =============================================================================
export const runtime = 'nodejs'; // Required for file upload handling
