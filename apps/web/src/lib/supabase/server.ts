/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * Uses cookie-based session management via @supabase/ssr.
 * RLS-protected: this client is subject to the user's session JWT.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface CookiePayload {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookiePayload[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies; the middleware refreshes the session.
          }
        },
      },
    },
  );
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
