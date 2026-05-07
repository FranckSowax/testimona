import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EmptyState } from '@/components/EmptyState';
import { getUnseenNotificationsCount } from '@/lib/notifications/count';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

interface MemorialLite {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
}

interface TestimonialReceived {
  id: string;
  memorialId: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

interface MyTestimonialLite {
  id: string;
  memorialId: string;
}

interface LikeRow {
  testimonialId: string;
  userId: string;
  createdAt: string;
}

interface CommentRow {
  id: string;
  testimonialId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

type Event =
  | {
      kind: 'testimonial';
      createdAt: string;
      memorial: MemorialLite;
      authorName: string;
      testimonialId: string;
    }
  | {
      kind: 'like';
      createdAt: string;
      memorial: MemorialLite;
      testimonialId: string;
    }
  | {
      kind: 'comment';
      createdAt: string;
      memorial: MemorialLite;
      authorName: string;
      testimonialId: string;
    };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/notifications');

  const [t, notificationsBadge] = await Promise.all([
    getTranslations('dashboard.notifications'),
    getUnseenNotificationsCount(),
  ]);
  const supabase = await getSupabaseServer();

  const { data: ownedMemorials } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname')
    .eq('ownerId', user.id)
    .returns<MemorialLite[]>();

  const ownedIds = (ownedMemorials ?? []).map((m) => m.id);
  const memorialMap = new Map<string, MemorialLite>();
  for (const m of ownedMemorials ?? []) memorialMap.set(m.id, m);

  const { data: myTestimonials } = await supabase
    .from('Testimonial')
    .select('id, memorialId')
    .eq('authorId', user.id)
    .returns<MyTestimonialLite[]>();

  const myTestimonialIds = (myTestimonials ?? []).map((tt) => tt.id);
  const myTestimonialMemorialMap = new Map<string, string>();
  for (const tt of myTestimonials ?? []) myTestimonialMemorialMap.set(tt.id, tt.memorialId);

  const missingIds = Array.from(
    new Set((myTestimonials ?? []).map((tt) => tt.memorialId)),
  ).filter((id) => !memorialMap.has(id));
  if (missingIds.length > 0) {
    const { data: extra } = await supabase
      .from('Memorial')
      .select('id, slug, firstname, lastname')
      .in('id', missingIds)
      .returns<MemorialLite[]>();
    for (const m of extra ?? []) memorialMap.set(m.id, m);
  }

  const [receivedRes, likesRes, commentsRes] = await Promise.all([
    ownedIds.length > 0
      ? supabase
          .from('Testimonial')
          .select('id, memorialId, authorName, authorId, createdAt')
          .in('memorialId', ownedIds)
          .neq('authorId', user.id)
          .order('createdAt', { ascending: false })
          .limit(20)
          .returns<TestimonialReceived[]>()
      : Promise.resolve({ data: [] as TestimonialReceived[] }),
    myTestimonialIds.length > 0
      ? supabase
          .from('TestimonialLike')
          .select('testimonialId, userId, createdAt')
          .in('testimonialId', myTestimonialIds)
          .neq('userId', user.id)
          .order('createdAt', { ascending: false })
          .limit(20)
          .returns<LikeRow[]>()
      : Promise.resolve({ data: [] as LikeRow[] }),
    myTestimonialIds.length > 0
      ? supabase
          .from('TestimonialComment')
          .select('id, testimonialId, authorId, authorName, createdAt')
          .in('testimonialId', myTestimonialIds)
          .neq('authorId', user.id)
          .order('createdAt', { ascending: false })
          .limit(20)
          .returns<CommentRow[]>()
      : Promise.resolve({ data: [] as CommentRow[] }),
  ]);

  const events: Event[] = [];

  for (const r of receivedRes.data ?? []) {
    const memorial = memorialMap.get(r.memorialId);
    if (!memorial) continue;
    events.push({
      kind: 'testimonial',
      createdAt: r.createdAt,
      memorial,
      authorName: r.authorName || t('anonymous'),
      testimonialId: r.id,
    });
  }
  for (const l of likesRes.data ?? []) {
    const memorialId = myTestimonialMemorialMap.get(l.testimonialId);
    if (!memorialId) continue;
    const memorial = memorialMap.get(memorialId);
    if (!memorial) continue;
    events.push({
      kind: 'like',
      createdAt: l.createdAt,
      memorial,
      testimonialId: l.testimonialId,
    });
  }
  for (const c of commentsRes.data ?? []) {
    const memorialId = myTestimonialMemorialMap.get(c.testimonialId);
    if (!memorialId) continue;
    const memorial = memorialMap.get(memorialId);
    if (!memorial) continue;
    events.push({
      kind: 'comment',
      createdAt: c.createdAt,
      memorial,
      authorName: c.authorName || t('anonymous'),
      testimonialId: c.testimonialId,
    });
  }

  events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const top = events.slice(0, 50);

  return (
    <DashboardShell title={t('title')} notificationsBadge={notificationsBadge}>
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">{t('subtitle')}</p>

      {top.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
      ) : (
        <ul className="space-y-3">
          {top.map((event, i) => {
            const memorialName = [event.memorial.firstname, event.memorial.lastname]
              .filter(Boolean)
              .join(' ');
            const authorName =
              event.kind === 'like' ? t('anonymous') : event.authorName ?? t('anonymous');
            const messageKey =
              event.kind === 'testimonial'
                ? 'eventTestimonialReceived'
                : event.kind === 'like'
                  ? 'eventLikeReceived'
                  : 'eventCommentReceived';
            const dotColor =
              event.kind === 'testimonial'
                ? 'bg-primary'
                : event.kind === 'like'
                  ? 'bg-accent'
                  : 'bg-secondary';
            return (
              <li
                key={`${event.kind}-${event.testimonialId}-${i}`}
                className="animate-fade-in-up flex items-start gap-3 rounded-lg border border-border bg-white p-4 shadow-sm"
                style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-foreground">
                    {t(messageKey, { author: authorName, memorial: memorialName })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground tabular">
                    {new Date(event.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                <Link
                  href={`/memorial/${event.memorial.slug}#testimonial-${event.testimonialId}`}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  {t('viewMemorial')} →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
