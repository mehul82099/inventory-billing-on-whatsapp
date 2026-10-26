import { NextResponse } from 'next/server';
import { dbService } from './db';
import { SupabaseDb } from './db-supabase';
import { getSupabaseAdmin, backendEnabled } from './supabase';
import { requireShop, isAuthContext, AuthContext } from './auth';

// Async adapter giving the file-based dbService the same call shape as SupabaseDb.
const fileAdapter: any = new Proxy({}, {
  get(_t, prop: string) {
    return async (...args: any[]) => (dbService as any)[prop](...args);
  },
});

export interface RequestContext {
  db: SupabaseDb | any;
  user: AuthContext | null;
  backend: boolean;
}

// Resolves the data layer for a request. In backend mode a verified Supabase
// Auth Bearer token is required and every query is scoped to the caller's shop.
// In file mode (no Supabase env), the app runs as a local demo with no auth.
export async function getRequestContext(
  request: Request
): Promise<{ context?: RequestContext; response?: NextResponse }> {
  if (!backendEnabled()) {
    if (process.env.DEMO_MODE !== 'true') {
      return {
        response: NextResponse.json(
          { error: 'Shop backend is not configured on this deployment. No data can be read or saved.' },
          { status: 503 }
        ),
      };
    }
    return { context: { db: fileAdapter, user: null, backend: false } };
  }
  const auth = await requireShop(request);
  if (!isAuthContext(auth)) {
    return { response: auth as NextResponse };
  }
  return {
    context: {
      db: new SupabaseDb(getSupabaseAdmin(), (auth as AuthContext).shopId),
      user: auth as AuthContext,
      backend: true,
    },
  };
}
