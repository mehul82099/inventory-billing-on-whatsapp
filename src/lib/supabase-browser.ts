'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

// Browser-side Supabase client (anon key). Used for signUp / signInWithPassword.
// Returns null when the backend is not configured (file-demo mode).
export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_INV_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_INV_SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey);
  }
  return browserClient;
}

export async function getAccessToken(): Promise<string | null> {
  const client = getSupabaseBrowser();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
