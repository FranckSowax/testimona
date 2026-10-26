import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AdminReportRow {
  id: string;
  testimonialId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
  testimonial: {
    id: string;
    authorName: string;
    message: string;
    memorialId: string;
  } | null;
  memorial: {
    slug: string;
    firstname: string;
    lastname: string;
  } | null;
  reporterEmail: string | null;
}

export interface AdminTestimonialRow {
  id: string;
  memorialId: string;
  authorId: string | null;
  authorName: string;
  message: string;
  createdAt: string;
  reportsCount: number;
  memorialSlug: string | null;
  memorialName: string | null;
}

export interface TestimonialsAdminListParams {
  page?: number;
  perPage?: number;
  query?: string;
  hasReports?: 'all' | 'reported';
}

export interface TestimonialsAdminListResult {
  testimonials: AdminTestimonialRow[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

interface ReportRaw {
  id: string;
  testimonialId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
}

interface TestimonialRaw {
  id: string;
  memorialId: string;
  authorId: string | null;
  authorName: string;
  message: string;
  createdAt: string;
}

interface MemorialRaw {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
}

export async function getReportsList(): Promise<AdminReportRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data: reports } = await supabase
    .from('TestimonialReport')
    .select('id, testimonialId, reporterId, reason, createdAt')
    .order('createdAt', { ascending: false })
    .limit(200)
    .returns<ReportRaw[]>();
  const reportRows = reports ?? [];
  if (reportRows.length === 0) return [];

  const testimonialIds = Array.from(new Set(reportRows.map((r) => r.testimonialId)));
  const reporterIds = Array.from(new Set(reportRows.map((r) => r.reporterId)));

  const { data: testimonials } = await supabase
    .from('Testimonial')
    .select('id, memorialId, authorId, authorName, message, createdAt')
    .in('id', testimonialIds)
    .returns<TestimonialRaw[]>();
  const testimonialsById = new Map((testimonials ?? []).map((t) => [t.id, t]));

  const memorialIds = Array.from(
    new Set((testimonials ?? []).map((t) => t.memorialId).filter(Boolean)),
  );
  const memorialsById = new Map<string, MemorialRaw>();
  if (memorialIds.length > 0) {
    const { data: memorials } = await supabase
      .from('Memorial')
      .select('id, slug, firstname, lastname')
      .in('id', memorialIds)
      .returns<MemorialRaw[]>();
    for (const m of memorials ?? []) memorialsById.set(m.id, m);
  }

  // Fetch reporter emails one-by-one (auth.admin has no bulk get)
  const reporterEmails = new Map<string, string | null>();
  await Promise.all(
    reporterIds.map(async (uid) => {
      const { data } = await supabase.auth.admin.getUserById(uid);
      reporterEmails.set(uid, data?.user?.email ?? null);
    }),
  );

  return reportRows.map((r) => {
    const tt = testimonialsById.get(r.testimonialId) ?? null;
    const mem = tt ? (memorialsById.get(tt.memorialId) ?? null) : null;
    return {
      id: r.id,
      testimonialId: r.testimonialId,
      reporterId: r.reporterId,
      reason: r.reason,
      createdAt: r.createdAt,
      testimonial: tt
        ? {
            id: tt.id,
            authorName: tt.authorName,
            message: tt.message,
            memorialId: tt.memorialId,
          }
        : null,
      memorial: mem ? { slug: mem.slug, firstname: mem.firstname, lastname: mem.lastname } : null,
      reporterEmail: reporterEmails.get(r.reporterId) ?? null,
    };
  });
}

export async function getTestimonialsAdminList(
  params: TestimonialsAdminListParams = {},
): Promise<TestimonialsAdminListResult> {
  const supabase = getSupabaseAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(10, params.perPage ?? 25));
  const offset = (page - 1) * perPage;
  const query = params.query?.trim() ?? '';

  let q = supabase
    .from('Testimonial')
    .select('id, memorialId, authorId, authorName, message, createdAt', { count: 'exact' });

  if (query) {
    const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);
    q = q.or(`authorName.ilike.%${escaped}%,message.ilike.%${escaped}%`);
  }
  q = q.order('createdAt', { ascending: false }).range(offset, offset + perPage - 1);

  const { data, count } = await q.returns<TestimonialRaw[]>();
  const rows = data ?? [];
  const total = count ?? 0;

  // Fetch reports counts per testimonial
  const ids = rows.map((r) => r.id);
  const reportsCountById = new Map<string, number>();
  if (ids.length > 0) {
    const { data: reportRows } = await supabase
      .from('TestimonialReport')
      .select('testimonialId')
      .in('testimonialId', ids)
      .returns<{ testimonialId: string }[]>();
    for (const r of reportRows ?? []) {
      reportsCountById.set(r.testimonialId, (reportsCountById.get(r.testimonialId) ?? 0) + 1);
    }
  }

  // Fetch memorials for display
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

  const mapped = rows.map<AdminTestimonialRow>((r) => {
    const m = memorialsById.get(r.memorialId);
    return {
      id: r.id,
      memorialId: r.memorialId,
      authorId: r.authorId,
      authorName: r.authorName,
      message: r.message,
      createdAt: r.createdAt,
      reportsCount: reportsCountById.get(r.id) ?? 0,
      memorialSlug: m?.slug ?? null,
      memorialName: m ? `${m.firstname} ${m.lastname}` : null,
    };
  });

  const filtered =
    params.hasReports === 'reported' ? mapped.filter((t) => t.reportsCount > 0) : mapped;

  return {
    testimonials: filtered,
    total,
    page,
    perPage,
    hasMore: offset + rows.length < total,
  };
}
