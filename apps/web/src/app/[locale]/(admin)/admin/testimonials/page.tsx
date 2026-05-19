import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { TestimonialDeleteButton } from '@/components/admin/ModerationActions';
import { requireAdmin } from '@/lib/supabase/admin';
import {
  getTestimonialsAdminList,
  type TestimonialsAdminListParams,
} from '@/lib/admin/moderation';

export const metadata: Metadata = {
  title: 'Admin — Testimonials',
  robots: { index: false, follow: false },
};

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale);
}

export default async function AdminTestimonialsPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{
    q?: string;
    hasReports?: string;
    page?: string;
    perPage?: string;
  }>;
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const { locale } = await params;
  const listParams: TestimonialsAdminListParams = {
    page: Number(sp.page ?? '1'),
    perPage: Number(sp.perPage ?? '25'),
    query: sp.q,
    hasReports: (sp.hasReports as TestimonialsAdminListParams['hasReports']) ?? 'all',
  };
  const [t, tNav, tUsers, list] = await Promise.all([
    getTranslations('admin.testimonials'),
    getTranslations('admin.nav'),
    getTranslations('admin.users'),
    getTestimonialsAdminList(listParams),
  ]);

  const labels = {
    delete: t('delete'),
    confirmDelete: t('confirmDelete'),
  };

  const queryParams = new URLSearchParams();
  if (sp.q) queryParams.set('q', sp.q);
  if (sp.hasReports) queryParams.set('hasReports', sp.hasReports);

  return (
    <AdminShell title={tNav('testimonials')}>
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-white p-4"
      >
        <label className="flex flex-1 flex-col gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t('searchLabel')}
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder={t('searchPlaceholder')}
            className="h-11 rounded-md border border-border bg-white px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t('reportFilter')}
          <select
            name="hasReports"
            defaultValue={sp.hasReports ?? 'all'}
            className="h-11 rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">{t('filterAll')}</option>
            <option value="reported">{t('filterReported')}</option>
          </select>
        </label>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {tUsers('filter')}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        {t('resultsSummary', { count: list.total })}
      </p>

      <ul className="mt-4 space-y-3">
        {list.testimonials.length === 0 ? (
          <li className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm italic text-muted-foreground">
            {t('empty')}
          </li>
        ) : (
          list.testimonials.map((tm) => (
            <li
              key={tm.id}
              className="rounded-lg border border-border bg-white p-4 shadow-[var(--shadow-card)]"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    {tm.authorName}
                    {tm.memorialName && (
                      <>
                        {' '}
                        <span className="text-muted-foreground">·</span>{' '}
                        <Link
                          href={tm.memorialSlug ? `/memorial/${tm.memorialSlug}` : '#'}
                          target="_blank"
                          className="font-normal italic text-muted-foreground hover:text-primary"
                        >
                          {tm.memorialName}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(tm.createdAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {tm.reportsCount > 0 && (
                    <Link
                      href="/admin/reports"
                      className="rounded-full bg-destructive/10 px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-white"
                    >
                      {t('reportsBadge', { count: tm.reportsCount })}
                    </Link>
                  )}
                  <TestimonialDeleteButton testimonialId={tm.id} labels={labels} />
                </div>
              </header>
              <p className="mt-3 line-clamp-3 text-sm text-foreground/85">{tm.message}</p>
            </li>
          ))
        )}
      </ul>

      <nav
        aria-label="pagination"
        className="mt-6 flex items-center justify-between text-sm"
      >
        {list.page > 1 ? (
          <Link
            href={`/admin/testimonials?${(() => {
              const p = new URLSearchParams(queryParams);
              p.set('page', String(list.page - 1));
              return p.toString();
            })()}`}
            className="font-display font-bold text-primary hover:underline"
          >
            ← {tUsers('prev')}
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        <span className="text-muted-foreground">
          {tUsers('pageOf', { page: list.page })}
        </span>
        {list.hasMore ? (
          <Link
            href={`/admin/testimonials?${(() => {
              const p = new URLSearchParams(queryParams);
              p.set('page', String(list.page + 1));
              return p.toString();
            })()}`}
            className="font-display font-bold text-primary hover:underline"
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
