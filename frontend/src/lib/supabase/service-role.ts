import { createClient } from '@supabase/supabase-js';

// Ensure these are set in your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseServiceRoleKey) {
  throw new Error('Missing environment variable SUPABASE_SERVICE_ROLE_KEY');
}

export const createServiceRoleClient = () =>
  createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
    auth: {
      persistSession: false,
    },
  });

// Alias export for backward compatibility
export { createServiceRoleClient as createClient };
