import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_INV_SUPABASE_URL || '';
const serviceKey = process.env.INV_SUPABASE_SERVICE_ROLE_KEY || '';

// Backend mode is on only when the server holds a service role key.
// Without it the app runs its file-based demo mode.
export function backendEnabled(): boolean {
  return Boolean(url && serviceKey);
}

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!backendEnabled()) {
    throw new Error('Supabase backend is not configured');
  }
  if (!adminClient) {
    adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
