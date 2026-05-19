import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AdminMemorialRow {
  id: string;
  slug: string;
  ownerId: string;
  firstname: string;
  lastname: string;
  nickname: string | null;
  birthDate: string | null;
  deathDate: string | null;
  language: string;
  isPublic: boolean;
  description: string | null;
  donationGoalCents: number | null;
  donationCurrency: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface AdminMemorialDetail extends AdminMemorialRow {
  ownerEmail: string | null;
  ownerName: string | null;
  testimonialsCount: number;
  photosCount: number;
  chaptersCount: number;
  donationsCount: number;
  donationsPaidCents: number;
  coverUrl: string | null;
  recentTestimonials: {
    id: string;
    authorName: string;
    message: string;
    createdAt: string;
  }[];
}

export interface MemorialsListParams {
  page?: number;
  perPage?: number;
  query?: string;
  visibility?: 'all' | 'public' | 'private';
  sort?: 'recent' | 'oldest';
}

export interface MemorialsListResult {
  memorials: AdminMemorialRow[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export async function getMemorialsList(
  params: MemorialsListParams = {},
): Promise<MemorialsListResult> {
  const supabase = getSupabaseAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(10, params.perPage ?? 25));
  const offset = (page - 1) * perPage;
  const query = params.query?.trim() ?? '';
  const visibility = params.visibility ?? 'all';
  const sort = params.sort ?? 'recent';

  let q = supabase
    .from('Memorial')
    .select(
      'id, slug, ownerId, firstname, lastname, nickname, birthDate, deathDate, language, isPublic, description, donationGoalCents, donationCurrency, createdAt, updatedAt',
      { count: 'exact' },
    );

  if (visibility === 'public') q = q.eq('isPublic', true);
  if (visibility === 'private') q = q.eq('isPublic', false);
  if (query) {
    const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);
    q = q.or(
      `firstname.ilike.%${escaped}%,lastname.ilike.%${escaped}%,nickname.ilike.%${escaped}%,slug.ilike.%${escaped}%`,
    );
  }
  q = q.order('createdAt', { ascending: sort === 'oldest' });
  q = q.range(offset, offset + perPage - 1);

  const { data, count } = await q.returns<AdminMemorialRow[]>();
  const memorials = data ?? [];
  const total = count ?? 0;

  return {
    memorials,
    total,
    page,
    perPage,
    hasMore: offset + memorials.length < total,
  };
}

export async function getMemorialDetail(
  memorialId: string,
): Promise<AdminMemorialDetail | null> {
  const supabase = getSupabaseAdminClient();
  const { data: memorial } = await supabase
    .from('Memorial')
    .select('*')
    .eq('id', memorialId)
    .maybeSingle<AdminMemorialRow>();
  if (!memorial) return null;

  const [
    ownerResp,
    testimonialsCount,
    photos,
    chaptersCount,
    donations,
    recentTestimonials,
  ] = await Promise.all([
    supabase.auth.admin.getUserById(memorial.ownerId),
    supabase
      .from('Testimonial')
      .select('id', { count: 'exact', head: true })
      .eq('memorialId', memorialId),
    supabase
      .from('Photo')
      .select('url, position')
      .eq('memorialId', memorialId)
      .order('position', { ascending: true })
      .returns<{ url: string; position: number }[]>(),
    supabase
      .from('Chapter')
      .select('id, "biographyId"', { count: 'exact', head: true })
      .in(
        'biographyId',
        (
          await supabase
            .from('Biography')
            .select('id')
            .eq('memorialId', memorialId)
            .returns<{ id: string }[]>()
        ).data?.map((b) => b.id) ?? [],
      ),
    supabase
      .from('Donation')
      .select('amount, status')
      .eq('memorialId', memorialId)
      .returns<{ amount: number; status: string }[]>(),
    supabase
      .from('Testimonial')
      .select('id, authorName, message, createdAt')
      .eq('memorialId', memorialId)
      .order('createdAt', { ascending: false })
      .limit(5)
      .returns<{ id: string; authorName: string; message: string; createdAt: string }[]>(),
  ]);

  const owner = ownerResp.data?.user;
  const ownerMeta = (owner?.user_metadata ?? null) as
    | { full_name?: string; nickname?: string }
    | null;
  const ownerName = ownerMeta?.nickname || ownerMeta?.full_name || null;
  const donationsRows = donations.data ?? [];
  const donationsPaidCents = donationsRows
    .filter((d) => d.status === 'Succeeded')
    .reduce((sum, d) => sum + d.amount, 0);

  return {
    ...memorial,
    ownerEmail: owner?.email ?? null,
    ownerName,
    testimonialsCount: testimonialsCount.count ?? 0,
    photosCount: photos.data?.length ?? 0,
    chaptersCount: chaptersCount.count ?? 0,
    donationsCount: donationsRows.length,
    donationsPaidCents,
    coverUrl: photos.data?.[0]?.url ?? null,
    recentTestimonials: recentTestimonials.data ?? [],
  };
}
