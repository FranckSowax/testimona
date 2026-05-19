import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AdminDonationRow {
  id: string;
  memorialId: string;
  userId: string | null;
  amount: number;
  currency: string;
  status: string;
  message: string | null;
  createdAt: string;
  memorialSlug: string | null;
  memorialName: string | null;
  donorEmail: string | null;
}

export interface DonationsListParams {
  page?: number;
  perPage?: number;
  status?: 'all' | 'Succeeded' | 'pending' | 'failed' | 'refunded';
  query?: string;
}

export interface DonationsListResult {
  donations: AdminDonationRow[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  paidAmountCentsInPage: number;
}

export interface DonationsStats {
  currency: string;
  totalPaidCents: number;
  totalPendingCents: number;
  totalRefundedCents: number;
  byMonth: { month: string; paidCents: number; count: number }[];
  topMemorials: {
    memorialId: string;
    memorialSlug: string | null;
    memorialName: string | null;
    paidCents: number;
    count: number;
  }[];
}

interface DonationRaw {
  id: string;
  memorialId: string;
  userId: string | null;
  amount: number;
  currency: string;
  status: string;
  message: string | null;
  createdAt: string;
}

interface MemorialRaw {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
}

export async function getDonationsList(
  params: DonationsListParams = {},
): Promise<DonationsListResult> {
  const supabase = getSupabaseAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(10, params.perPage ?? 25));
  const offset = (page - 1) * perPage;
  const status = params.status ?? 'all';

  let q = supabase
    .from('Donation')
    .select(
      'id, memorialId, userId, amount, currency, status, message, createdAt',
      { count: 'exact' },
    );
  if (status !== 'all') q = q.eq('status', status);
  q = q.order('createdAt', { ascending: false }).range(offset, offset + perPage - 1);

  const { data, count } = await q.returns<DonationRaw[]>();
  const rows = data ?? [];
  const total = count ?? 0;

  const memorialIds = Array.from(new Set(rows.map((r) => r.memorialId).filter(Boolean)));
  const memorialsById = new Map<string, MemorialRaw>();
  if (memorialIds.length > 0) {
    const { data: memorials } = await supabase
      .from('Memorial')
      .select('id, slug, firstname, lastname')
      .in('id', memorialIds)
      .returns<MemorialRaw[]>();
    for (const m of memorials ?? []) memorialsById.set(m.id, m);
  }

  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean) as string[]));
  const userEmails = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await supabase.auth.admin.getUserById(uid);
      userEmails.set(uid, data?.user?.email ?? null);
    }),
  );

  const mapped = rows.map<AdminDonationRow>((r) => {
    const m = memorialsById.get(r.memorialId);
    return {
      id: r.id,
      memorialId: r.memorialId,
      userId: r.userId,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      memorialSlug: m?.slug ?? null,
      memorialName: m ? `${m.firstname} ${m.lastname}` : null,
      donorEmail: r.userId ? userEmails.get(r.userId) ?? null : null,
    };
  });

  let filtered = mapped;
  if (params.query) {
    const q = params.query.trim().toLowerCase();
    filtered = filtered.filter((d) =>
      [d.memorialName ?? '', d.donorEmail ?? '', d.message ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  const paidAmountCentsInPage = filtered
    .filter((d) => d.status === 'Succeeded')
    .reduce((sum, d) => sum + d.amount, 0);

  return {
    donations: filtered,
    total,
    page,
    perPage,
    hasMore: offset + rows.length < total,
    paidAmountCentsInPage,
  };
}

export async function getDonationsStats(): Promise<DonationsStats> {
  const supabase = getSupabaseAdminClient();
  const { data: donations } = await supabase
    .from('Donation')
    .select('memorialId, amount, currency, status, createdAt')
    .returns<
      {
        memorialId: string;
        amount: number;
        currency: string;
        status: string;
        createdAt: string;
      }[]
    >();
  const rows = donations ?? [];

  const currency = rows.find((d) => d.status === 'Succeeded')?.currency ?? 'EUR';
  const totalPaidCents = rows
    .filter((d) => d.status === 'Succeeded')
    .reduce((sum, d) => sum + d.amount, 0);
  const totalPendingCents = rows
    .filter((d) => d.status === 'pending')
    .reduce((sum, d) => sum + d.amount, 0);
  const totalRefundedCents = rows
    .filter((d) => d.status === 'refunded')
    .reduce((sum, d) => sum + d.amount, 0);

  // Monthly buckets (last 12 months) for paid donations only
  const now = new Date();
  const buckets = new Map<string, { paidCents: number; count: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { paidCents: 0, count: 0 });
  }
  for (const r of rows) {
    if (r.status !== 'Succeeded') continue;
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const b = buckets.get(key);
    if (b) {
      b.paidCents += r.amount;
      b.count += 1;
    }
  }
  const byMonth = [...buckets.entries()].map(([month, v]) => ({
    month,
    paidCents: v.paidCents,
    count: v.count,
  }));

  // Top 10 memorials
  const perMemorial = new Map<string, { paidCents: number; count: number }>();
  for (const r of rows) {
    if (r.status !== 'Succeeded') continue;
    const existing = perMemorial.get(r.memorialId) ?? { paidCents: 0, count: 0 };
    existing.paidCents += r.amount;
    existing.count += 1;
    perMemorial.set(r.memorialId, existing);
  }
  const topIds = [...perMemorial.entries()]
    .sort((a, b) => b[1].paidCents - a[1].paidCents)
    .slice(0, 10);
  const memorialsById = new Map<string, MemorialRaw>();
  if (topIds.length > 0) {
    const { data: memorials } = await supabase
      .from('Memorial')
      .select('id, slug, firstname, lastname')
      .in(
        'id',
        topIds.map(([id]) => id),
      )
      .returns<MemorialRaw[]>();
    for (const m of memorials ?? []) memorialsById.set(m.id, m);
  }
  const topMemorials = topIds.map(([memorialId, stat]) => {
    const m = memorialsById.get(memorialId);
    return {
      memorialId,
      memorialSlug: m?.slug ?? null,
      memorialName: m ? `${m.firstname} ${m.lastname}` : null,
      paidCents: stat.paidCents,
      count: stat.count,
    };
  });

  return {
    currency,
    totalPaidCents,
    totalPendingCents,
    totalRefundedCents,
    byMonth,
    topMemorials,
  };
}
