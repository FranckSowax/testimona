import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface EnvHealth {
  supabaseUrl: boolean;
  serviceRoleKey: boolean;
  siteUrl: boolean;
  stripeSecret: boolean;
  sentryDsn: boolean;
}

export interface AdminListItem {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  fullName: string | null;
}

export function getEnvHealth(): EnvHealth {
  return {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey:
      !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.SUPABASE_SERVICE_KEY,
    siteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    stripeSecret: !!process.env.STRIPE_SECRET_KEY,
    sentryDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  };
}

export async function getAdminsList(): Promise<AdminListItem[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const admins = (data?.users ?? []).filter((u) => {
    const role = (u.app_metadata as { role?: string } | null | undefined)?.role;
    return role === 'Admin';
  });
  return admins.map((u) => {
    const meta = (u.user_metadata ?? null) as
      | { full_name?: string; nickname?: string }
      | null;
    return {
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      fullName: meta?.nickname || meta?.full_name || null,
    };
  });
}
