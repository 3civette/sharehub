import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Define the schema for the request body using Zod for partial updates
const profileUpdateSchema = z.object({
  company_name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  vat_number: z.string().optional(),
}).partial(); // .partial() makes all fields optional for PATCH

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    const { data: agency, error: agencyError } = await supabase
      .from('agencies') // Assuming 'agencies' is a view or table with RLS
      .select('id, company_name, contact_email, phone, vat_number, logo_url')
      .eq('id', user.id) // Assuming user.id is the agency_id
      .single();

    if (agencyError) {
      console.error('Error fetching agency profile:', agencyError);
      return NextResponse.json({ error: agencyError.message }, { status: 500 });
    }

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    return NextResponse.json(agency, { status: 200 });

  } catch (error) {
    console.error('Unexpected error fetching agency profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Added PATCH method
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    const body = await req.json();
    const validatedData = profileUpdateSchema.parse(body);

    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error: updateError } = await supabase
      .from('tenants') // Assuming 'tenants' is the underlying table for 'agencies' view
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(), // Automatically update timestamp
      })
      .eq('id', user.id)
      .select('id, company_name, contact_email, phone, vat_number, logo_url')
      .single();

    if (updateError) {
      console.error('Error updating agency profile:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Unexpected error updating agency profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
