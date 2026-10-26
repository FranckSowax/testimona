import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AdminUserRow {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  role: 'Admin' | 'User';
  bannedUntil: string | null;
  fullName: string | null;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  memorialsCount: number;
  testimonialsCount: number;
  donationsCount: number;
  memorials: {
    id: string;
    slug: string;
    firstname: string;
    lastname: string;
    isPublic: boolean;
    createdAt: string;
  }[];
  recentTestimonials: {
    id: string;
    message: string;
    memorialId: string;
    createdAt: string;
  }[];
}

export interface UsersListParams {
  page?: number;
  perPage?: number;
  query?: string;
  role?: 'admin' | 'user' | 'all';
  status?: 'active' | 'banned' | 'all';
}

export interface UsersListResult {
  users: AdminUserRow[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

interface SupabaseUser {
  id: string;
  email?: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  app_metadata?: { role?: string } | null;
  user_metadata?: {
    full_name?: string;
    nickname?: string;
    avatar_url?: string | null;
  } | null;
}

function mapUser(u: SupabaseUser): AdminUserRow {
  const role = u.app_metadata?.role === 'Admin' ? 'Admin' : 'User';
  const bannedUntil = u.banned_until ?? null;
  return {
    id: u.id,
    email: u.email ?? null,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    role,
    bannedUntil: bannedUntil && new Date(bannedUntil).getTime() > Date.now() ? bannedUntil : null,
    fullName: u.user_metadata?.full_name ?? null,
    nickname: u.user_metadata?.nickname ?? null,
    avatarUrl: u.user_metadata?.avatar_url ?? null,
  };
}

export async function getUsersList(params: UsersListParams = {}): Promise<UsersListResult> {
  const supabase = getSupabaseAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(10, params.perPage ?? 25));
  const query = params.query?.trim().toLowerCase() ?? '';
  const role = params.role ?? 'all';
  const status = params.status ?? 'all';

  // Supabase listUsers does not support server-side search; we filter in memory.
  // For volumes < ~5k users this is acceptable. Beyond that, switch to a
  // Postgres-side admin RPC.
  const { data } = await supabase.auth.admin.listUsers({ page, perPage });
  const rawUsers = (data?.users ?? []) as SupabaseUser[];
  const mapped = rawUsers.map(mapUser);

  const filtered = mapped.filter((u) => {
    if (query) {
      const haystack = [u.email ?? '', u.fullName ?? '', u.nickname ?? ''].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (role === 'admin' && u.role !== 'Admin') return false;
    if (role === 'user' && u.role !== 'User') return false;
    if (status === 'banned' && !u.bannedUntil) return false;
    if (status === 'active' && u.bannedUntil) return false;
    return true;
  });

  return {
    users: filtered,
    total: filtered.length,
    page,
    perPage,
    hasMore: rawUsers.length === perPage,
  };
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const supabase = getSupabaseAdminClient();
  const { data: userResp } = await supabase.auth.admin.getUserById(userId);
  if (!userResp?.user) return null;
  const row = mapUser(userResp.user as SupabaseUser);

  const [memorialsCount, testimonialsCount, donationsCount, memorials, testimonials] =
    await Promise.all([
      supabase.from('Memorial').select('id', { count: 'exact', head: true }).eq('ownerId', userId),
      supabase
        .from('Testimonial')
        .select('id', { count: 'exact', head: true })
        .eq('authorId', userId),
      supabase.from('Donation').select('id', { count: 'exact', head: true }).eq('userId', userId),
      supabase
        .from('Memorial')
        .select('id, slug, firstname, lastname, isPublic, createdAt')
        .eq('ownerId', userId)
        .order('createdAt', { ascending: false })
        .limit(20)
        .returns<
          {
            id: string;
            slug: string;
            firstname: string;
            lastname: string;
            isPublic: boolean;
            createdAt: string;
          }[]
        >(),
      supabase
        .from('Testimonial')
        .select('id, message, memorialId, createdAt')
        .eq('authorId', userId)
        .order('createdAt', { ascending: false })
        .limit(10)
        .returns<{ id: string; message: string; memorialId: string; createdAt: string }[]>(),
    ]);

  return {
    ...row,
    memorialsCount: memorialsCount.count ?? 0,
    testimonialsCount: testimonialsCount.count ?? 0,
    donationsCount: donationsCount.count ?? 0,
    memorials: memorials.data ?? [],
    recentTestimonials: testimonials.data ?? [],
  };
}
