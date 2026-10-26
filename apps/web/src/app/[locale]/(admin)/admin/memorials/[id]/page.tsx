import type { Metadata } from 'next';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { KpiCard } from '@/components/admin/KpiCard';
import { MemorialActionsMenu } from '@/components/admin/MemorialActionsMenu';
import { requireAdmin } from '@/lib/supabase/admin';
import { getMemorialDetail } from '@/lib/admin/memorials';

export const metadata: Metadata = {
  title: 'Admin — Memorial detail',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale);
}

function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function AdminMemorialDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id, locale } = await params;
  const [t, tNav, memorial] = await Promise.all([
    getTranslations('admin.memorials'),
    getTranslations('admin.nav'),
    getMemorialDetail(id),
  ]);
  if (!memorial) notFound();

  const fullName = `${memorial.firstname} ${memorial.lastname}`;
  const currency = memorial.donationCurrency ?? 'EUR';

  const actionLabels = {
    view: t('view'),
    makePublic: t('makePublic'),
    makePrivate: t('makePrivate'),
    delete: t('delete'),
    confirmDelete: t('confirmDelete'),
  };

  return (
    <AdminShell
      title={fullName}
      action={
        <MemorialActionsMenu
          memorialId={memorial.id}
          slug={memorial.slug}
          isPublic={memorial.isPublic}
          labels={actionLabels}
        />
      }
    >
      <p className="text-sm">
        <Link
          href="/admin/memorials"
          className="font-display text-primary font-bold hover:underline"
        >
          ← {tNav('memorials')}
        </Link>
      </p>

      {/* Identity card */}
      <section className="border-border mt-6 overflow-hidden rounded-lg border bg-white shadow-[var(--shadow-card)]">
        {memorial.coverUrl && (
          <div className="bg-secondary relative aspect-[16/5] w-full">
            <Image src={memorial.coverUrl} alt="" fill sizes="100vw" className="object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-foreground text-2xl font-bold">
                {fullName}
                {memorial.nickname && (
                  <span className="text-muted-foreground ml-2 text-base font-normal italic">
                    « {memorial.nickname} »
                  </span>
                )}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                <Link
                  href={`/memorial/${memorial.slug}`}
                  target="_blank"
                  className="hover:text-primary"
                >
                  /memorial/{memorial.slug}
                </Link>
              </p>
            </div>
            <span
              className={[
                'font-display rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
                memorial.isPublic
                  ? 'bg-primary/10 text-primary'
                  : 'bg-foreground/10 text-foreground/70',
              ].join(' ')}
            >
              {memorial.isPublic ? t('publicBadge') : t('privateBadge')}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                {t('birthDate')}
              </dt>
              <dd className="text-foreground">{formatDate(memorial.birthDate, locale)}</dd>
            </div>
            <div>
              <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                {t('deathDate')}
              </dt>
              <dd className="text-foreground">{formatDate(memorial.deathDate, locale)}</dd>
            </div>
            <div>
              <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                {t('language')}
              </dt>
              <dd className="text-foreground uppercase">{memorial.language}</dd>
            </div>
            <div>
              <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                {t('createdAt')}
              </dt>
              <dd className="text-foreground">{formatDate(memorial.createdAt, locale)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                {t('owner')}
              </dt>
              <dd className="text-foreground">
                <Link
                  href={`/admin/users/${memorial.ownerId}`}
                  className="font-display text-foreground hover:text-primary font-bold"
                >
                  {memorial.ownerName || memorial.ownerEmail || memorial.ownerId.slice(0, 8)}
                </Link>
                {memorial.ownerName && memorial.ownerEmail && (
                  <span className="text-muted-foreground ml-2 text-xs">{memorial.ownerEmail}</span>
                )}
              </dd>
            </div>
            {memorial.description && (
              <div className="sm:col-span-2">
                <dt className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
                  {t('description')}
                </dt>
                <dd className="text-foreground/85 mt-1 whitespace-pre-line">
                  {memorial.description}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* Stats */}
      <section
        aria-label={t('statsAria')}
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label={t('testimonialsCount')}
          value={memorial.testimonialsCount.toLocaleString(locale)}
        />
        <KpiCard label={t('photosCount')} value={memorial.photosCount.toLocaleString(locale)} />
        <KpiCard label={t('chaptersCount')} value={memorial.chaptersCount.toLocaleString(locale)} />
        <KpiCard
          label={t('donationsCount')}
          value={memorial.donationsCount.toLocaleString(locale)}
          hint={formatMoney(memorial.donationsPaidCents, currency, locale)}
          tone="accent"
        />
      </section>

      {/* Goal */}
      {memorial.donationGoalCents != null && memorial.donationGoalCents > 0 && (
        <section className="border-border mt-6 rounded-md border bg-white p-5">
          <header className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-foreground text-base font-bold">{t('goalTitle')}</h3>
            <span className="font-display text-foreground text-sm font-bold">
              {formatMoney(memorial.donationsPaidCents, currency, locale)} /{' '}
              {formatMoney(memorial.donationGoalCents, currency, locale)}
            </span>
          </header>
          <div className="bg-surface mt-3 h-2 overflow-hidden rounded-full">
            <div
              className="bg-accent h-full rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((memorial.donationsPaidCents / memorial.donationGoalCents) * 100),
                )}%`,
              }}
            />
          </div>
        </section>
      )}

      {/* Recent testimonials */}
      <section className="mt-8">
        <h3 className="font-display text-foreground text-lg font-bold">
          {t('recentTestimonials')}
        </h3>
        <div className="border-border mt-3 overflow-hidden rounded-md border bg-white">
          {memorial.recentTestimonials.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm italic">
              {t('noTestimonials')}
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {memorial.recentTestimonials.map((tm) => (
                <li key={tm.id} className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display text-foreground text-sm font-bold">
                      {tm.authorName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(tm.createdAt, locale)}
                    </p>
                  </div>
                  <p className="text-foreground/85 mt-2 line-clamp-3 text-sm">{tm.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
