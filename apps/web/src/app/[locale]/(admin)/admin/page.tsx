import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { KpiCard } from '@/components/admin/KpiCard';
import { getAdminKpis, getRecentMemorials, getRecentUsers } from '@/lib/admin/kpis';

export const metadata: Metadata = {
  title: 'Admin — Overview',
  robots: { index: false, follow: false },
};

function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatRelative(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return locale === 'fr' ? "aujourd'hui" : 'today';
  if (days === 1) return locale === 'fr' ? 'hier' : 'yesterday';
  if (days < 30) return locale === 'fr' ? `il y a ${days} j` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(locale);
}

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, kpis, recentMemorials, recentUsers] = await Promise.all([
    getTranslations('admin.overview'),
    getAdminKpis(),
    getRecentMemorials(8),
    getRecentUsers(8),
  ]);

  return (
    <AdminShell title={t('title')}>
      <p className="text-sm text-muted-foreground">{t('subtitle')}</p>

      {/* KPI grid */}
      <section
        aria-label={t('kpiSectionAria')}
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        <KpiCard
          label={t('usersLabel')}
          value={kpis.users.total.toLocaleString(locale)}
          delta={`+${kpis.users.last30d}`}
          hint={t('last30d')}
          tone="primary"
        />
        <KpiCard
          label={t('memorialsLabel')}
          value={kpis.memorials.total.toLocaleString(locale)}
          delta={`+${kpis.memorials.last30d}`}
          hint={`${kpis.memorials.public} ${t('publicSuffix')}`}
        />
        <KpiCard
          label={t('testimonialsLabel')}
          value={kpis.testimonials.total.toLocaleString(locale)}
          delta={`+${kpis.testimonials.last30d}`}
          hint={t('last30d')}
        />
        <KpiCard
          label={t('photosLabel')}
          value={kpis.photos.total.toLocaleString(locale)}
        />
        <KpiCard
          label={t('donationsLabel')}
          value={formatMoney(
            kpis.donations.grossAmountCents,
            kpis.donations.currency,
            locale,
          )}
          delta={`+${formatMoney(
            kpis.donations.last30dAmountCents,
            kpis.donations.currency,
            locale,
          )}`}
          hint={`${kpis.donations.paidCount} ${t('paidSuffix')}`}
          tone="accent"
        />
      </section>

      {/* Recent activity */}
      <section
        aria-label={t('recentSectionAria')}
        className="mt-10 grid gap-6 lg:grid-cols-2"
      >
        <article className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]">
          <header className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-foreground">
              {t('recentUsers')}
            </h2>
            <Link
              href="/admin/users"
              className="font-display text-xs font-bold uppercase tracking-wide text-primary hover:underline"
            >
              {t('viewAll')}
            </Link>
          </header>
          <ul className="mt-4 divide-y divide-border">
            {recentUsers.length === 0 ? (
              <li className="py-4 text-sm italic text-muted-foreground">
                {t('emptyUsers')}
              </li>
            ) : (
              recentUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
                >
                  <span className="flex flex-col">
                    <span className="font-display font-bold text-foreground">
                      {u.fullName || u.email || u.id.slice(0, 8)}
                    </span>
                    {u.fullName && u.email && (
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(u.createdAt, locale)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]">
          <header className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-foreground">
              {t('recentMemorials')}
            </h2>
            <Link
              href="/admin/memorials"
              className="font-display text-xs font-bold uppercase tracking-wide text-primary hover:underline"
            >
              {t('viewAll')}
            </Link>
          </header>
          <ul className="mt-4 divide-y divide-border">
            {recentMemorials.length === 0 ? (
              <li className="py-4 text-sm italic text-muted-foreground">
                {t('emptyMemorials')}
              </li>
            ) : (
              recentMemorials.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
                >
                  <span className="flex flex-col">
                    <Link
                      href={`/memorial/${m.slug}`}
                      className="font-display font-bold text-foreground hover:text-primary"
                    >
                      {m.firstname} {m.lastname}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {m.isPublic ? t('publicMemorial') : t('privateMemorial')}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(m.createdAt, locale)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>
    </AdminShell>
  );
}
