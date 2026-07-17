import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { MemorialCard } from '@/components/MemorialCard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EmptyState } from '@/components/EmptyState';
import { buttonClasses } from '@/components/ui/Button';
import { WelcomeOverlayTrigger } from './WelcomeOverlayTrigger';

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
  Photo: { url: string; position: number }[] | null;
}

/**
 * Single-query fetch: memorials + their cover photo (lowest position)
 * via PostgREST embed. Replaces the previous 2-step (memorials, then
 * covers) round-trip — on mobile this halved the dashboard time.
 */
async function getOwnedMemorialsWithCover(ownerId: string): Promise<OwnedMemorialRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select(
      `id, slug, firstname, lastname, birthDate, deathDate, isPublic, createdAt,
       Photo:Photo!Photo_memorialId_fkey(url, position)`,
    )
    .eq('ownerId', ownerId)
    .order('createdAt', { ascending: false })
    .returns<OwnedMemorialRow[]>();
  return data ?? [];
}

/**
 * Memorials the user has favorited (heart). Tolerant: if migration v21 hasn't
 * run the table doesn't exist and supabase-js returns an error → empty list.
 * Only public memorials are listed (favorites are of public pages).
 */
async function getFavoriteMemorials(userId: string): Promise<OwnedMemorialRow[]> {
  const supabase = await getSupabaseServer();
  const { data: favs } = await supabase
    .from('MemorialFavorite')
    .select('memorialId, createdAt')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .returns<{ memorialId: string; createdAt: string }[]>();
  const ids = (favs ?? []).map((f) => f.memorialId);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('Memorial')
    .select(
      `id, slug, firstname, lastname, birthDate, deathDate, isPublic, createdAt,
       Photo:Photo!Photo_memorialId_fkey(url, position)`,
    )
    .in('id', ids)
    .eq('isPublic', true)
    .returns<OwnedMemorialRow[]>();
  const byId = new Map((data ?? []).map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id)).filter((m): m is OwnedMemorialRow => !!m);
}

function coverUrl(memorial: OwnedMemorialRow): string | null {
  if (!memorial.Photo || memorial.Photo.length === 0) return null;
  const sorted = [...memorial.Photo].sort((a, b) => a.position - b.position);
  return sorted[0]?.url ?? null;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const [memorials, favorites, t] = await Promise.all([
    getOwnedMemorialsWithCover(user.id),
    getFavoriteMemorials(user.id),
    getTranslations('dashboard.memorials'),
  ]);

  const ctaCreate = (
    <Link
      href="/dashboard/new"
      className={buttonClasses({ variant: 'primary', size: 'md' })}
    >
      {t('create')}
    </Link>
  );

  return (
    <DashboardShell
      title={t('title')}
      action={memorials.length > 0 ? ctaCreate : undefined}
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
                  coverUrl={coverUrl(m)}
                  badge={m.isPublic ? null : 'Privé'}
                />
              </li>
            );
          })}
        </ul>
      )}
      {favorites.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold text-foreground">
            {t('favoritesTitle')}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((m) => {
              const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
              return (
                <li key={m.id}>
                  <MemorialCard
                    slug={m.slug}
                    fullName={fullName}
                    birthDate={m.birthDate}
                    deathDate={m.deathDate}
                    coverUrl={coverUrl(m)}
                    badge={null}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <WelcomeOverlayTrigger />
    </DashboardShell>
  );
}
