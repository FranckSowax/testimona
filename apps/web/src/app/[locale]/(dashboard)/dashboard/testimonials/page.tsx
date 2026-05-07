import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EmptyState } from '@/components/EmptyState';

export const metadata: Metadata = {
  title: 'Mes témoignages',
  robots: { index: false, follow: false },
};

interface MyTestimonialRow {
  id: string;
  memorialId: string;
  message: string;
  createdAt: string;
}

interface MemorialLite {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
}

async function getMyTestimonials(authorId: string): Promise<MyTestimonialRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Testimonial')
    .select('id, memorialId, message, createdAt')
    .eq('authorId', authorId)
    .order('createdAt', { ascending: false })
    .limit(100)
    .returns<MyTestimonialRow[]>();
  return data ?? [];
}

async function getMemorialsByIds(ids: string[]): Promise<Map<string, MemorialLite>> {
  const map = new Map<string, MemorialLite>();
  if (ids.length === 0) return map;
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname')
    .in('id', ids)
    .returns<MemorialLite[]>();
  for (const m of data ?? []) map.set(m.id, m);
  return map;
}

async function getCountsByTestimonial(
  testimonialIds: string[],
): Promise<{ likes: Map<string, number>; comments: Map<string, number> }> {
  const likes = new Map<string, number>();
  const comments = new Map<string, number>();
  if (testimonialIds.length === 0) return { likes, comments };
  const supabase = await getSupabaseServer();
  const [likesRes, commentsRes] = await Promise.all([
    supabase
      .from('TestimonialLike')
      .select('testimonialId')
      .in('testimonialId', testimonialIds)
      .returns<{ testimonialId: string }[]>(),
    supabase
      .from('TestimonialComment')
      .select('testimonialId')
      .in('testimonialId', testimonialIds)
      .returns<{ testimonialId: string }[]>(),
  ]);
  for (const l of likesRes.data ?? []) {
    likes.set(l.testimonialId, (likes.get(l.testimonialId) ?? 0) + 1);
  }
  for (const c of commentsRes.data ?? []) {
    comments.set(c.testimonialId, (comments.get(c.testimonialId) ?? 0) + 1);
  }
  return { likes, comments };
}

export default async function MyTestimonialsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/testimonials');

  const [t, items] = await Promise.all([
    getTranslations('dashboard.testimonials'),
    getMyTestimonials(user.id),
  ]);
  const ids = items.map((x) => x.id);
  const memorialIds = Array.from(new Set(items.map((x) => x.memorialId)));
  const [memorials, counts] = await Promise.all([
    getMemorialsByIds(memorialIds),
    getCountsByTestimonial(ids),
  ]);

  const cta = (
    <Link
      href="/search"
      className="rounded-md border-2 border-foreground/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {t('search')}
    </Link>
  );

  return (
    <DashboardShell title={t('title')}>
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">{t('subtitle')}</p>

      {items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyBody')} action={cta} />
      ) : (
        <ul className="space-y-4">
          {items.map((item, i) => {
            const memorial = memorials.get(item.memorialId);
            const fullName = memorial
              ? [memorial.firstname, memorial.lastname].filter(Boolean).join(' ')
              : '—';
            const likes = counts.likes.get(item.id) ?? 0;
            const comments = counts.comments.get(item.id) ?? 0;
            return (
              <li
                key={item.id}
                className="animate-fade-in-up rounded-lg border border-border bg-white p-5 shadow-sm"
                style={{ animationDelay: `${Math.min(i * 30, 180)}ms` }}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('publishedOn')} ·{' '}
                  <time dateTime={item.createdAt} className="tabular">
                    {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                  </time>
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-foreground">
                  {fullName}
                </p>
                <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {item.message}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="tabular">{t('stats', { likes, comments })}</span>
                  {memorial && (
                    <Link
                      href={`/memorial/${memorial.slug}#testimonial-${item.id}`}
                      className="rounded-md text-primary hover:underline"
                    >
                      {t('openMemorial')} →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
