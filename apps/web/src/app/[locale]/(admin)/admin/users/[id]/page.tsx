import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard } from '@/components/admin/KpiCard';
import { UserActionsMenu } from '@/components/admin/UserActionsMenu';
import { requireAdmin } from '@/lib/supabase/admin';
import { getUserDetail } from '@/lib/admin/users';

export const metadata: Metadata = {
  title: 'Admin — User detail',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id, locale } = await params;

  const [t, tNav, user] = await Promise.all([
    getTranslations('admin.users'),
    getTranslations('admin.nav'),
    getUserDetail(id),
  ]);

  if (!user) notFound();

  const isSelf = user.id === admin.id;
  const displayName = user.fullName || user.nickname || user.email || user.id.slice(0, 8);

  const actionLabels = {
    promoteAdmin: t('promoteAdmin'),
    demoteUser: t('demoteUser'),
    ban7d: t('ban7d'),
    ban30d: t('ban30d'),
    banForever: t('banForever'),
    unban: t('unban'),
    resetPassword: t('resetPassword'),
    delete: t('delete'),
    confirmDelete: t('confirmDelete'),
    confirmBan: t('confirmBan'),
  };

  return (
    <AdminShell
      title={displayName}
      action={
        <UserActionsMenu
          userId={user.id}
          email={user.email}
          role={user.role}
          isBanned={!!user.bannedUntil}
          isSelf={isSelf}
          labels={actionLabels}
        />
      }
    >
      <p className="text-sm">
        <Link href="/admin/users" className="font-display text-primary font-bold hover:underline">
          ← {tNav('users')}
        </Link>
      </p>

      {/* Identity card */}
      <section className="border-border mt-6 rounded-lg border bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar src={user.avatarUrl} name={displayName} size="xl" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-foreground text-xl font-bold">{displayName}</h2>
            {user.email && (
              <p className="text-muted-foreground mt-1 break-all text-sm">{user.email}</p>
            )}
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                  {t('userId')}
                </dt>
                <dd className="text-foreground break-all font-mono text-xs">{user.id}</dd>
              </div>
              <div>
                <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                  {t('role')}
                </dt>
                <dd className="text-foreground">
                  <span
                    className={[
                      'font-display inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                      user.role === 'Admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-foreground/10 text-foreground/70',
                    ].join(' ')}
                  >
                    {user.role}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                  {t('createdAt')}
                </dt>
                <dd className="text-foreground">{formatDate(user.createdAt, locale)}</dd>
              </div>
              <div>
                <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                  {t('lastSignIn')}
                </dt>
                <dd className="text-foreground">
                  {user.lastSignInAt ? formatDate(user.lastSignInAt, locale) : t('never')}
                </dd>
              </div>
              {user.bannedUntil && (
                <div className="sm:col-span-2">
                  <dt className="font-display text-destructive text-xs font-bold uppercase tracking-wide">
                    {t('bannedUntil')}
                  </dt>
                  <dd className="text-destructive">{formatDate(user.bannedUntil, locale)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-label={t('statsAria')} className="mt-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label={t('memorialsOwned')} value={user.memorialsCount.toLocaleString(locale)} />
        <KpiCard
          label={t('testimonialsPosted')}
          value={user.testimonialsCount.toLocaleString(locale)}
        />
        <KpiCard label={t('donationsMade')} value={user.donationsCount.toLocaleString(locale)} />
      </section>

      {/* Owned memorials */}
      <section className="mt-8">
        <header className="flex items-center justify-between">
          <h3 className="font-display text-foreground text-lg font-bold">
            {t('memorialsListTitle')}
          </h3>
        </header>
        <div className="border-border mt-3 overflow-hidden rounded-md border bg-white">
          {user.memorials.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm italic">
              {t('memorialsEmpty')}
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {user.memorials.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-3 p-4">
                  <Link
                    href={`/memorial/${m.slug}`}
                    className="font-display text-foreground hover:text-primary text-sm font-bold"
                  >
                    {m.firstname} {m.lastname}
                  </Link>
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      className={[
                        'font-display rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                        m.isPublic
                          ? 'bg-primary/10 text-primary'
                          : 'bg-foreground/10 text-foreground/70',
                      ].join(' ')}
                    >
                      {m.isPublic ? t('publicMem') : t('privateMem')}
                    </span>
                    <span className="text-muted-foreground">{formatDate(m.createdAt, locale)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recent testimonials */}
      <section className="mt-8">
        <header>
          <h3 className="font-display text-foreground text-lg font-bold">
            {t('testimonialsListTitle')}
          </h3>
        </header>
        <div className="border-border mt-3 overflow-hidden rounded-md border bg-white">
          {user.recentTestimonials.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm italic">
              {t('testimonialsEmpty')}
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {user.recentTestimonials.map((tt) => (
                <li key={tt.id} className="p-4">
                  <p className="text-foreground/85 line-clamp-3 text-sm">{tt.message}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {formatDate(tt.createdAt, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
