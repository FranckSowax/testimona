import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EmptyState } from '@/components/EmptyState';
import { TestimonialBubble } from '@/components/ui/TestimonialBubble';
import { Reveal } from '@/components/motion/Reveal';
import { unsplashAvatarFor } from '@/lib/avatars';

export const metadata: Metadata = {
  title: 'Mes témoignages',
  robots: { index: false, follow: false },
};

interface MyTestimonialRow {
  id: string;
  memorialId: string;
  relationship: string | null;
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
    .select('id, memorialId, relationship, message, createdAt')
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
      className="border-foreground/80 text-foreground hover:border-primary hover:text-primary rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors"
    >
      {t('search')}
    </Link>
  );

  // Author = the signed-in user (these are *their* testimonials).
  const userMeta = (user.user_metadata ?? null) as {
    avatar_url?: string | null;
    nickname?: string | null;
    full_name?: string | null;
  } | null;
  const authorName =
    userMeta?.nickname || userMeta?.full_name || user.email?.split('@')[0] || 'Vous';
  const authorAvatarUrl = userMeta?.avatar_url ?? unsplashAvatarFor(authorName);

  return (
    <DashboardShell title={t('title')}>
      <p className="text-muted-foreground -mt-4 mb-6 text-sm">{t('subtitle')}</p>

      {items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyBody')} action={cta} />
      ) : (
        <Reveal as="ul" className="space-y-4">
          {items.map((item, i) => {
            const memorial = memorials.get(item.memorialId);
            if (!memorial) return null;
            const fullName =
              [memorial.firstname, memorial.lastname].filter(Boolean).join(' ') || '—';
            const likes = counts.likes.get(item.id) ?? 0;
            const comments = counts.comments.get(item.id) ?? 0;
            return (
              <TestimonialBubble
                key={item.id}
                index={i}
                authorName={authorName}
                authorRelation={item.relationship}
                authorAvatarUrl={authorAvatarUrl}
                memorialName={fullName}
                memorialSlug={memorial.slug}
                message={item.message}
                createdAt={item.createdAt}
                testimonialId={item.id}
                footerNote={t('stats', { likes, comments })}
                publishedOnLabel={t('publishedOn')}
                viewMemorialLabel={t('openMemorial')}
              />
            );
          })}
        </Reveal>
      )}
    </DashboardShell>
  );
}
