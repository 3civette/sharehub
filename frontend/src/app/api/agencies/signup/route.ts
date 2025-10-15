import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Define the schema for the request body using Zod
const signupSchema = z.object({
  company_name: z.string().min(2).max(100),
  contact_email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_name, contact_email, password } = signupSchema.parse(body);

    const supabase = createRouteHandlerClient({ cookies });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert into tenants table (via agencies VIEW)
    const { data: agencyData, error: signupError } = await supabase
      .from('tenants') // Assuming 'tenants' is the underlying table for 'agencies' view
      .insert({
        company_name,
        contact_email,
        password: hashedPassword,
      })
      .select('id')
      .single();

    if (signupError) {
      if (signupError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      console.error('Signup error:', signupError);
      return NextResponse.json({ error: signupError.message }, { status: 500 });
    }

    // The trigger should auto-create the subscription, so we just need to fetch it
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('tier, event_limit')
      .eq('agency_id', agencyData.id)
      .single();

    if (subscriptionError) {
      console.error('Subscription fetch error:', subscriptionError);
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    return NextResponse.json({
      agency_id: agencyData.id,
      subscription: subscriptionData,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Unexpected signup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
