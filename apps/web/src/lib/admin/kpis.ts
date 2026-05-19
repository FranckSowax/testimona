import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AdminKpis {
  users: { total: number; last30d: number };
  memorials: { total: number; public: number; last30d: number };
  testimonials: { total: number; last30d: number };
  photos: { total: number };
  donations: {
    count: number;
    paidCount: number;
    grossAmountCents: number;
    last30dAmountCents: number;
    currency: string;
  };
}

export interface RecentMemorial {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
}

export interface RecentUser {
  id: string;
  email: string | null;
  createdAt: string;
  fullName: string | null;
}

const THIRTY_DAYS_AGO = () =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

export async function getAdminKpis(): Promise<AdminKpis> {
  const supabase = getSupabaseAdminClient();
  const since = THIRTY_DAYS_AGO();

  const [
    usersList,
    memorialsTotal,
    memorialsPublic,
    memorialsRecent,
    testimonialsTotal,
    testimonialsRecent,
    photosTotal,
    donationsAll,
    donationsRecent,
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
    supabase.from('Memorial').select('id', { count: 'exact', head: true }),
    supabase
      .from('Memorial')
      .select('id', { count: 'exact', head: true })
      .eq('isPublic', true),
    supabase
      .from('Memorial')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', since),
    supabase.from('Testimonial').select('id', { count: 'exact', head: true }),
    supabase
      .from('Testimonial')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', since),
    supabase.from('Photo').select('id', { count: 'exact', head: true }),
    supabase
      .from('Donation')
      .select('amount, status, currency, createdAt')
      .returns<
        { amount: number; status: string; currency: string; createdAt: string }[]
      >(),
    supabase
      .from('Donation')
      .select('amount, status, createdAt')
      .gte('createdAt', since)
      .returns<{ amount: number; status: string; createdAt: string }[]>(),
  ]);

  const donations = donationsAll.data ?? [];
  const recentDonations = donationsRecent.data ?? [];
  const paidDonations = donations.filter((d) => d.status === 'Succeeded');
  const grossAmountCents = paidDonations.reduce((sum, d) => sum + d.amount, 0);
  const recentPaidAmount = recentDonations
    .filter((d) => d.status === 'Succeeded')
    .reduce((sum, d) => sum + d.amount, 0);
  const currency = paidDonations[0]?.currency ?? 'EUR';

  // Users — auth.admin.listUsers exposes total via response.users length when total=true.
  // The API returns { users, aud, ... } but no total; we re-query with perPage:1 and use
  // the returned `total` field if present, else fall back to a head query on a public view.
  const usersTotal =
    (usersList.data as { total?: number } | undefined)?.total ?? usersList.data?.users.length ?? 0;

  // last30d users — fetch list pages and filter; for the dashboard we cap at 1000.
  const allUsers = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const usersLast30d = (allUsers.data?.users ?? []).filter(
    (u) => u.created_at && new Date(u.created_at).toISOString() >= since,
  ).length;

  return {
    users: {
      total: allUsers.data?.users.length ?? usersTotal,
      last30d: usersLast30d,
    },
    memorials: {
      total: memorialsTotal.count ?? 0,
      public: memorialsPublic.count ?? 0,
      last30d: memorialsRecent.count ?? 0,
    },
    testimonials: {
      total: testimonialsTotal.count ?? 0,
      last30d: testimonialsRecent.count ?? 0,
    },
    photos: {
      total: photosTotal.count ?? 0,
    },
    donations: {
      count: donations.length,
      paidCount: paidDonations.length,
      grossAmountCents,
      last30dAmountCents: recentPaidAmount,
      currency,
    },
  };
}

export async function getRecentMemorials(limit = 8): Promise<RecentMemorial[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname, ownerId, isPublic, createdAt')
    .order('createdAt', { ascending: false })
    .limit(limit)
    .returns<RecentMemorial[]>();
  return data ?? [];
}

export async function getRecentUsers(limit = 8): Promise<RecentUser[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: limit });
  const users = data?.users ?? [];
  return users.slice(0, limit).map((u) => ({
    id: u.id,
    email: u.email ?? null,
    createdAt: u.created_at,
    fullName:
      ((u.user_metadata as { nickname?: string; full_name?: string } | null)?.nickname ??
        (u.user_metadata as { nickname?: string; full_name?: string } | null)?.full_name) ??
      null,
  }));
}
