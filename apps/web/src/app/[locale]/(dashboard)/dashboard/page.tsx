import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { MemorialCard } from '@/components/MemorialCard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EmptyState } from '@/components/EmptyState';
import { getUnseenNotificationsCount } from '@/lib/notifications/count';

export const metadata: Metadata = {
  title: 'Tableau de bord',
  robots: { index: false, follow: false },
};

interface OwnedMemorialRow {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
  birthDate: string | null;
  deathDate: string | null;
  isPublic: boolean;
  createdAt: string;
}

async function getOwnedMemorials(ownerId: string): Promise<OwnedMemorialRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname, birthDate, deathDate, isPublic, createdAt')
    .eq('ownerId', ownerId)
    .order('createdAt', { ascending: false })
    .returns<OwnedMemorialRow[]>();
  return data ?? [];
}

async function getCoverUrls(memorialIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (memorialIds.length === 0) return map;
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Photo')
    .select('memorialId, url, position')
    .in('memorialId', memorialIds)
    .order('position', { ascending: true })
    .returns<{ memorialId: string; url: string; position: number }[]>();
  for (const p of data ?? []) {
    if (!map.has(p.memorialId)) map.set(p.memorialId, p.url);
  }
  return map;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const [memorials, t, notificationsBadge] = await Promise.all([
    getOwnedMemorials(user.id),
    getTranslations('dashboard.memorials'),
    getUnseenNotificationsCount(),
  ]);
  const covers = await getCoverUrls(memorials.map((m) => m.id));

  const ctaCreate = (
    <Link
      href="/dashboard/new"
      className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
    >
      {t('create')}
    </Link>
  );

  return (
    <DashboardShell
      title={t('title')}
      action={memorials.length > 0 ? ctaCreate : undefined}
      notificationsBadge={notificationsBadge}
    >
      {memorials.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyBody')}
          action={ctaCreate}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memorials.map((m, i) => {
            const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
            return (
              <li
                key={m.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
              >
                <MemorialCard
                  slug={m.slug}
                  fullName={fullName}
                  birthDate={m.birthDate}
                  deathDate={m.deathDate}
                  coverUrl={covers.get(m.id) ?? null}
                  badge={m.isPublic ? null : 'Privé'}
                />
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
