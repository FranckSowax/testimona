import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { KpiCard } from '@/components/admin/KpiCard';
import { requireAdmin } from '@/lib/supabase/admin';
import {
  getDonationsList,
  getDonationsStats,
  type DonationsListParams,
} from '@/lib/admin/donations';

export const metadata: Metadata = {
  title: 'Admin — Donations',
  robots: { index: false, follow: false },
};

function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale);
}

const STATUS_TONES: Record<string, string> = {
  Succeeded: 'bg-primary/10 text-primary',
  Completed: 'bg-primary/10 text-primary',
  pending: 'bg-amber-500/10 text-amber-700',
  Failed: 'bg-destructive/10 text-destructive',
  Refunded: 'bg-foreground/10 text-foreground/70',
};

export default async function AdminDonationsPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    perPage?: string;
  }>;
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const { locale } = await params;
  const listParams: DonationsListParams = {
    page: Number(sp.page ?? '1'),
    perPage: Number(sp.perPage ?? '25'),
    status: (sp.status as DonationsListParams['status']) ?? 'all',
    query: sp.q,
  };
  const [t, tNav, tUsers, list, stats] = await Promise.all([
    getTranslations('admin.donations'),
    getTranslations('admin.nav'),
    getTranslations('admin.users'),
    getDonationsList(listParams),
    getDonationsStats(),
  ]);

  const queryParams = new URLSearchParams();
  if (sp.q) queryParams.set('q', sp.q);
  if (sp.status) queryParams.set('status', sp.status);

  const maxMonth = Math.max(1, ...stats.byMonth.map((m) => m.paidCents));

  return (
    <AdminShell title={tNav('donations')}>
      {/* KPIs */}
      <section aria-label="kpi" className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('totalPaid')}
          value={formatMoney(stats.totalPaidCents, stats.currency, locale)}
          tone="accent"
        />
        <KpiCard
          label={t('totalPending')}
          value={formatMoney(stats.totalPendingCents, stats.currency, locale)}
        />
        <KpiCard
          label={t('totalRefunded')}
          value={formatMoney(stats.totalRefundedCents, stats.currency, locale)}
        />
      </section>

      {/* Monthly chart */}
      <section className="border-border mt-6 rounded-lg border bg-white p-5">
        <h2 className="font-display text-foreground text-base font-bold">{t('monthlyTitle')}</h2>
        <ul className="mt-4 space-y-2">
          {stats.byMonth.map((m) => (
            <li key={m.month} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 text-sm">
              <span className="tabular text-muted-foreground text-xs">{m.month}</span>
              <span
                aria-hidden="true"
                className="bg-primary h-2 rounded-full"
                style={{
                  width: `${Math.round((m.paidCents / maxMonth) * 100)}%`,
                  minWidth: m.paidCents > 0 ? '4px' : 0,
                }}
              />
              <span className="font-display text-foreground text-xs font-bold">
                {formatMoney(m.paidCents, stats.currency, locale)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Top memorials */}
      {stats.topMemorials.length > 0 && (
        <section className="border-border mt-6 rounded-lg border bg-white p-5">
          <h2 className="font-display text-foreground text-base font-bold">{t('topMemorials')}</h2>
          <ol className="divide-border mt-4 divide-y">
            {stats.topMemorials.map((m, i) => (
              <li key={m.memorialId} className="flex items-center justify-between gap-3 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="font-display text-muted-foreground text-sm font-bold">
                    {i + 1}.
                  </span>
                  <Link
                    href={`/admin/memorials/${m.memorialId}`}
                    className="font-display text-foreground hover:text-primary truncate text-sm font-bold"
                  >
                    {m.memorialName || m.memorialId.slice(0, 8)}
                  </Link>
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="font-display text-foreground text-sm font-bold">
                    {formatMoney(m.paidCents, stats.currency, locale)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t('donationsCount', { count: m.count })}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Filter bar */}
      <form
        method="get"
        className="border-border mt-8 flex flex-wrap items-end gap-3 rounded-md border bg-white p-4"
      >
        <label className="text-muted-foreground flex flex-1 flex-col gap-1 text-xs font-bold uppercase tracking-wide">
          {t('searchLabel')}
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder={t('searchPlaceholder')}
            className="border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11 rounded-md border bg-white px-3 text-base focus:outline-none"
          />
        </label>
        <label className="text-muted-foreground flex flex-col gap-1 text-xs font-bold uppercase tracking-wide">
          {t('statusLabel')}
          <select
            name="status"
            defaultValue={sp.status ?? 'all'}
            className="border-border text-foreground focus:border-primary h-11 rounded-md border bg-white px-3 text-base focus:outline-none"
          >
            <option value="all">{t('statusAll')}</option>
            <option value="Succeeded">{t('statusPaid')}</option>
            <option value="pending">{t('statusPending')}</option>
            <option value="Failed">{t('statusFailed')}</option>
            <option value="Refunded">{t('statusRefunded')}</option>
          </select>
        </label>
        <button
          type="submit"
          className="bg-primary font-display text-primary-foreground h-11 rounded-md px-5 text-sm font-bold transition-opacity hover:opacity-90"
        >
          {tUsers('filter')}
        </button>
      </form>

      <p className="text-muted-foreground mt-4 text-sm">
        {t('resultsSummary', { count: list.total })}
      </p>

      {/* List */}
      <div className="border-border mt-4 overflow-hidden rounded-md border bg-white">
        {list.donations.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm italic">{t('empty')}</p>
        ) : (
          <ul className="divide-border divide-y">
            {list.donations.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-foreground text-sm font-bold">
                    {formatMoney(d.amount, d.currency, locale)}
                    <span
                      className={[
                        'font-display ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                        STATUS_TONES[d.status] ?? 'bg-foreground/10 text-foreground/70',
                      ].join(' ')}
                    >
                      {d.status}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {d.memorialName ? (
                      <Link
                        href={`/admin/memorials/${d.memorialId}`}
                        className="hover:text-primary"
                      >
                        {d.memorialName}
                      </Link>
                    ) : (
                      d.memorialId.slice(0, 8)
                    )}
                    {' · '}
                    {d.donorEmail ?? t('anonymous')}
                    {' · '}
                    {formatDate(d.createdAt, locale)}
                  </p>
                  {d.message && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs italic">
                      “{d.message}”
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav aria-label="pagination" className="mt-6 flex items-center justify-between text-sm">
        {list.page > 1 ? (
          <Link
            href={`/admin/donations?${(() => {
              const p = new URLSearchParams(queryParams);
              p.set('page', String(list.page - 1));
              return p.toString();
            })()}`}
            className="font-display text-primary font-bold hover:underline"
          >
            ← {tUsers('prev')}
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        <span className="text-muted-foreground">{tUsers('pageOf', { page: list.page })}</span>
        {list.hasMore ? (
          <Link
            href={`/admin/donations?${(() => {
              const p = new URLSearchParams(queryParams);
              p.set('page', String(list.page + 1));
              return p.toString();
            })()}`}
            className="font-display text-primary font-bold hover:underline"
          >
            {tUsers('next')} →
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
      </nav>
    </AdminShell>
  );
}
