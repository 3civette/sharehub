/**
 * Supabase Server Client
 * Creates a Supabase client for use in API routes and server components
 * Uses Next.js cookies for authentication
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for server-side use
 * Automatically handles cookie-based authentication
 *
 * Usage:
 * ```typescript
 * const supabase = await createClient();
 * const { data, error } = await supabase.from('table').select('*');
 * ```
 */
export async function createClient(): Promise<SupabaseClient> {
  return createRouteHandlerClient({ cookies });
}
