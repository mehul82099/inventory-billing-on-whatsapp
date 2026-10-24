'use client';

import { getSupabaseBrowser } from './supabase-browser';

// Client-side fetch that attaches the Supabase session token when the
// hosted backend is configured. In file-demo mode it is a plain fetch.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...((init.headers as Record<string, string>) || {}) };
  const client = getSupabaseBrowser();
  if (client) {
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(input, { ...init, headers });
}
