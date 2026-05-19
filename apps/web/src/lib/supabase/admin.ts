/**
 * Supabase service-role client — bypasses Row Level Security.
 *
 * DANGER: This client must NEVER be exposed to the browser or used in client
 * components. It can read/write every row in every table.
 *
 * Usage rules:
 * - Only import from server components, server actions, or route handlers
 *   inside the `/admin` segment (or other clearly admin-only code paths).
 * - Always call `requireAdmin()` first to ensure the caller is an authenticated
 *   admin before doing anything with this client.
 */
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { getCurrentUser } from './server';

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'getSupabaseAdminClient: SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing.',
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export interface AdminUser {
  id: string;
  email: string | null;
  role: 'Admin';
}

/**
 * Resolves the current user and asserts admin role.
 *
 * Returns the admin user on success, redirects to /dashboard on failure.
 * Use as the first call in every admin-only server component / action.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/admin');
  }
  const role = (user.app_metadata as { role?: string } | null | undefined)?.role;
  if (role !== 'Admin') {
    redirect('/dashboard');
  }
  return { id: user.id, email: user.email ?? null, role: 'Admin' };
}
