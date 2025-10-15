import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const brandingSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  font_family: z.enum(['inter', 'merriweather', 'poppins', 'roboto', 'playfair']).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { eventId } = params;

  // RLS should handle ownership verification.
  // The policy "event_branding_select_own" is expected to be in place.

  const { data: branding, error } = await supabase
    .from('event_branding')
    .select('logo_url, primary_color, secondary_color, accent_color, background_color, font_family')
    .eq('event_id', eventId)
    .single();

  if (error || !branding) {
    // As per spec, return 3Civette defaults if no branding is found
    return new NextResponse(JSON.stringify({
      logo_url: null,
      primary_color: '#2563EB',
      secondary_color: '#7C3AED',
      accent_color: '#F59E0B',
      background_color: '#F8FAFC',
      font_family: 'inter',
      is_customized: false,
    }), {
      status: 200, // Returning 200 with defaults as it's a valid state for the frontend
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new NextResponse(JSON.stringify({ ...branding, is_customized: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { eventId } = params;
  const json = await request.json();

  const result = brandingSchema.safeParse(json);

  if (!result.success) {
    return new NextResponse(JSON.stringify({ error: 'Invalid request body', details: result.error.format() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // RLS policy event_branding_update_own will ensure the user owns the event.
  // We also need the agency_id for the upsert.
  const { data: event } = await supabase.from('events').select('tenant_id').eq('id', eventId).single();
  if (!event) {
      return new NextResponse(JSON.stringify({ error: 'Event not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
      });
  }

  const { data, error } = await supabase
    .from('event_branding')
    .upsert({
      event_id: eventId,
      agency_id: event.tenant_id, // Assuming tenant_id is the agency_id
      ...result.data,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return new NextResponse(JSON.stringify({ error: 'Failed to update branding', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}