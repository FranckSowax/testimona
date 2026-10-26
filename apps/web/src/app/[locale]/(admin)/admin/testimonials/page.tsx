import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { TestimonialDeleteButton } from '@/components/admin/ModerationActions';
import { requireAdmin } from '@/lib/supabase/admin';
import { getTestimonialsAdminList, type TestimonialsAdminListParams } from '@/lib/admin/moderation';

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
        className="border-border flex flex-wrap items-end gap-3 rounded-md border bg-white p-4"
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
          {t('reportFilter')}
          <select
            name="hasReports"
            defaultValue={sp.hasReports ?? 'all'}
            className="border-border text-foreground focus:border-primary h-11 rounded-md border bg-white px-3 text-base focus:outline-none"
          >
            <option value="all">{t('filterAll')}</option>
            <option value="reported">{t('filterReported')}</option>
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

      <ul className="mt-4 space-y-3">
        {list.testimonials.length === 0 ? (
          <li className="border-border bg-surface text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm italic">
            {t('empty')}
          </li>
        ) : (
          list.testimonials.map((tm) => (
            <li
              key={tm.id}
              className="border-border rounded-lg border bg-white p-4 shadow-[var(--shadow-card)]"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-display text-foreground text-sm font-bold">
                    {tm.authorName}
                    {tm.memorialName && (
                      <>
                        {' '}
                        <span className="text-muted-foreground">·</span>{' '}
                        <Link
                          href={tm.memorialSlug ? `/memorial/${tm.memorialSlug}` : '#'}
                          target="_blank"
                          className="text-muted-foreground hover:text-primary font-normal italic"
                        >
                          {tm.memorialName}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatDate(tm.createdAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {tm.reportsCount > 0 && (
                    <Link
                      href="/admin/reports"
                      className="bg-destructive/10 font-display text-destructive hover:bg-destructive rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide hover:text-white"
                    >
                      {t('reportsBadge', { count: tm.reportsCount })}
                    </Link>
                  )}
                  <TestimonialDeleteButton testimonialId={tm.id} labels={labels} />
                </div>
              </header>
              <p className="text-foreground/85 mt-3 line-clamp-3 text-sm">{tm.message}</p>
            </li>
          ))
        )}
      </ul>

      <nav aria-label="pagination" className="mt-6 flex items-center justify-between text-sm">
        {list.page > 1 ? (
          <Link
            href={`/admin/testimonials?${(() => {
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
            href={`/admin/testimonials?${(() => {
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
