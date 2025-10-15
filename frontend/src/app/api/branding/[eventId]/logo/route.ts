
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(
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
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return new NextResponse(JSON.stringify({ error: 'File is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return new NextResponse(JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, and SVG are allowed.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return new NextResponse(JSON.stringify({ error: 'File size exceeds 2MB' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filePath = `event-logos/${eventId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('logos') // As per data-model, logos are in the 'logos' bucket
    .upload(filePath, file);

  if (uploadError) {
    return new NextResponse(JSON.stringify({ error: 'Failed to upload logo', details: uploadError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(filePath);

  if (!publicUrlData) {
      return new NextResponse(JSON.stringify({ error: 'Failed to get public URL for logo' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
      });
  }

  const { data: event } = await supabase.from('events').select('tenant_id').eq('id', eventId).single();
  if (!event) {
      return new NextResponse(JSON.stringify({ error: 'Event not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
      });
  }

  const { error: dbError } = await supabase
    .from('event_branding')
    .upsert({
      event_id: eventId,
      agency_id: event.tenant_id,
      logo_url: publicUrlData.publicUrl,
      updated_at: new Date().toISOString(),
    });

  if (dbError) {
    return new NextResponse(JSON.stringify({ error: 'Failed to save logo URL', details: dbError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new NextResponse(JSON.stringify({ logo_url: publicUrlData.publicUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
