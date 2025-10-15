import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Define schema for file validation (simplified, actual validation will be in logic)
const fileSchema = z.object({
  size: z.number().max(2 * 1024 * 1024, 'File size must be less than 2MB'), // 2MB limit
  type: z.string().refine(type => ['image/jpeg', 'image/png', 'image/svg+xml'].includes(type), 'Invalid file type. Only JPEG, PNG, SVG are allowed.'),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type and size
    try {
      fileSchema.parse({ size: file.size, type: file.type });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ error: validationError.issues }, { status: 400 });
      }
      return NextResponse.json({ error: 'File validation failed' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `logos/${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('agency-logos') // Assuming a bucket named 'agency-logos' exists
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('agency-logos')
      .getPublicUrl(filePath);
    
    const logo_url = publicUrlData.publicUrl;

    // Update tenants table with new logo_url
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ logo_url, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating agency logo URL:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ logo_url }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error uploading agency logo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Important: Next.js body parser needs to be disabled for file uploads