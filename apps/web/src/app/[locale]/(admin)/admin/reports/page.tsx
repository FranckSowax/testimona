import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  TestimonialDeleteButton,
  ReportDismissButton,
  ReportDismissAllButton,
} from '@/components/admin/ModerationActions';
import { requireAdmin } from '@/lib/supabase/admin';
import { getReportsList } from '@/lib/admin/moderation';

export const metadata: Metadata = {
  title: 'Admin — Reports',
  robots: { index: false, follow: false },
};

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin();
  const { locale } = await params;
  const [t, tNav, reports] = await Promise.all([
    getTranslations('admin.reports'),
    getTranslations('admin.nav'),
    getReportsList(),
  ]);

  // Group reports by testimonial so the admin can dismiss-all / delete-testimonial at once
  const grouped = new Map<
    string,
    { testimonialId: string; testimonialAuthor: string; testimonialMessage: string; memorialName: string | null; memorialSlug: string | null; reports: typeof reports }
  >();
  for (const r of reports) {
    const key = r.testimonialId;
    const existing = grouped.get(key);
    if (existing) {
      existing.reports.push(r);
    } else {
      grouped.set(key, {
        testimonialId: r.testimonialId,
        testimonialAuthor: r.testimonial?.authorName ?? '—',
        testimonialMessage: r.testimonial?.message ?? '',
        memorialName: r.memorial
          ? `${r.memorial.firstname} ${r.memorial.lastname}`
          : null,
        memorialSlug: r.memorial?.slug ?? null,
        reports: [r],
      });
    }
  }

  const labels = {
    delete: t('deleteTestimonial'),
    dismiss: t('dismiss'),
    dismissAll: t('dismissAll'),
    confirmDelete: t('confirmDeleteTestimonial'),
  };

  return (
    <AdminShell title={tNav('reports')}>
      <p className="text-sm text-muted-foreground">{t('subtitle')}</p>

      {grouped.size === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm italic text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {[...grouped.values()].map((group) => (
            <li
              key={group.testimonialId}
              className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-foreground">
                    {group.testimonialAuthor}
                    {group.memorialName && (
                      <>
                        {' '}
                        <span className="text-muted-foreground">·</span>{' '}
                        <Link
                          href={
                            group.memorialSlug ? `/memorial/${group.memorialSlug}` : '#'
                          }
                          target="_blank"
                          className="font-normal italic text-muted-foreground hover:text-primary"
                        >
                          {group.memorialName}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-foreground/85">
                    {group.testimonialMessage}
                  </p>
                </div>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wide text-destructive">
                  {t('reportsCount', { count: group.reports.length })}
                </span>
              </header>

              <ul className="mt-4 divide-y divide-border border-t border-border">
                {group.reports.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-start justify-between gap-2 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs italic text-muted-foreground">
                        {r.reporterEmail || r.reporterId.slice(0, 8)} ·{' '}
                        {formatDate(r.createdAt, locale)}
                      </p>
                      <p className="mt-1 text-sm text-foreground/85">{r.reason}</p>
                    </div>
                    <ReportDismissButton reportId={r.id} labels={labels} />
                  </li>
                ))}
              </ul>

              <footer className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <ReportDismissAllButton
                  testimonialId={group.testimonialId}
                  labels={labels}
                />
                <TestimonialDeleteButton
                  testimonialId={group.testimonialId}
                  labels={labels}
                />
              </footer>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
