import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { MemorialActionsMenu } from '@/components/admin/MemorialActionsMenu';
import { requireAdmin } from '@/lib/supabase/admin';
import { getMemorialsList, type MemorialsListParams } from '@/lib/admin/memorials';

export const metadata: Metadata = {
  title: 'Admin — Memorials',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    visibility?: string;
    sort?: string;
    page?: string;
    perPage?: string;
  }>;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale);
}

export default async function AdminMemorialsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const params: MemorialsListParams = {
    page: Number(sp.page ?? '1'),
    perPage: Number(sp.perPage ?? '25'),
    query: sp.q,
    visibility: (sp.visibility as MemorialsListParams['visibility']) ?? 'all',
    sort: (sp.sort as MemorialsListParams['sort']) ?? 'recent',
  };
  const [t, tNav, tUsers, list] = await Promise.all([
    getTranslations('admin.memorials'),
    getTranslations('admin.nav'),
    getTranslations('admin.users'),
    getMemorialsList(params),
  ]);

  const locale = 'fr';
  const actionLabels = {
    view: t('view'),
    makePublic: t('makePublic'),
    makePrivate: t('makePrivate'),
    delete: t('delete'),
    confirmDelete: t('confirmDelete'),
  };

  const queryParams = new URLSearchParams();
  if (sp.q) queryParams.set('q', sp.q);
  if (sp.visibility) queryParams.set('visibility', sp.visibility);
  if (sp.sort) queryParams.set('sort', sp.sort);

  return (
    <AdminShell title={tNav('memorials')}>
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
          {t('visibilityLabel')}
          <select
            name="visibility"
            defaultValue={sp.visibility ?? 'all'}
            className="border-border text-foreground focus:border-primary h-11 rounded-md border bg-white px-3 text-base focus:outline-none"
          >
            <option value="all">{t('visibilityAll')}</option>
            <option value="public">{t('visibilityPublic')}</option>
            <option value="private">{t('visibilityPrivate')}</option>
          </select>
        </label>
        <label className="text-muted-foreground flex flex-col gap-1 text-xs font-bold uppercase tracking-wide">
          {t('sortLabel')}
          <select
            name="sort"
            defaultValue={sp.sort ?? 'recent'}
            className="border-border text-foreground focus:border-primary h-11 rounded-md border bg-white px-3 text-base focus:outline-none"
          >
            <option value="recent">{t('sortRecent')}</option>
            <option value="oldest">{t('sortOldest')}</option>
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

      <div className="border-border mt-4 overflow-hidden rounded-md border bg-white">
        {list.memorials.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm italic">{t('empty')}</p>
        ) : (
          <ul className="divide-border divide-y">
            {list.memorials.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/memorials/${m.id}`}
                    className="font-display text-foreground hover:text-primary text-sm font-bold"
                  >
                    {m.firstname} {m.lastname}
                    {m.nickname && (
                      <span className="text-muted-foreground ml-1 font-normal italic">
                        « {m.nickname} »
                      </span>
                    )}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">
                    /{m.slug} · {formatDate(m.createdAt, locale)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={[
                      'font-display rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                      m.isPublic
                        ? 'bg-primary/10 text-primary'
                        : 'bg-foreground/10 text-foreground/70',
                    ].join(' ')}
                  >
                    {m.isPublic ? t('publicBadge') : t('privateBadge')}
                  </span>
                  <MemorialActionsMenu
                    memorialId={m.id}
                    slug={m.slug}
                    isPublic={m.isPublic}
                    labels={actionLabels}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav aria-label="pagination" className="mt-6 flex items-center justify-between text-sm">
        {list.page > 1 ? (
          <Link
            href={`/admin/memorials?${(() => {
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
            href={`/admin/memorials?${(() => {
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
