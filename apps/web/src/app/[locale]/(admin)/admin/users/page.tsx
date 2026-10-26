import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { Avatar } from '@/components/ui/Avatar';
import { UserActionsMenu } from '@/components/admin/UserActionsMenu';
import { requireAdmin } from '@/lib/supabase/admin';
import { getUsersList, type UsersListParams } from '@/lib/admin/users';

export const metadata: Metadata = {
  title: 'Admin — Users',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
    perPage?: string;
  }>;
}

function formatRelative(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return locale === 'fr' ? "aujourd'hui" : 'today';
  if (days === 1) return locale === 'fr' ? 'hier' : 'yesterday';
  if (days < 30) return locale === 'fr' ? `il y a ${days} j` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(locale);
}

export default async function AdminUsersPage({
  searchParams,
}: PageProps & { params?: Promise<{ locale: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const params: UsersListParams = {
    page: Number(sp.page ?? '1'),
    perPage: Number(sp.perPage ?? '25'),
    query: sp.q,
    role: (sp.role as UsersListParams['role']) ?? 'all',
    status: (sp.status as UsersListParams['status']) ?? 'all',
  };

  const [t, tNav, list] = await Promise.all([
    getTranslations('admin.users'),
    getTranslations('admin.nav'),
    getUsersList(params),
  ]);

  // Detect locale from the rendered URL via header isn't trivial here; fall
  // back to FR for date formatting since the app default is FR.
  const locale = 'fr';

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

  const queryParams = new URLSearchParams();
  if (sp.q) queryParams.set('q', sp.q);
  if (sp.role) queryParams.set('role', sp.role);
  if (sp.status) queryParams.set('status', sp.status);

  return (
    <AdminShell title={tNav('users')}>
      {/* Filter bar */}
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
          {t('roleLabel')}
          <select
            name="role"
            defaultValue={sp.role ?? 'all'}
            className="border-border text-foreground focus:border-primary h-11 rounded-md border bg-white px-3 text-base focus:outline-none"
          >
            <option value="all">{t('roleAll')}</option>
            <option value="admin">{t('roleAdmin')}</option>
            <option value="user">{t('roleUser')}</option>
          </select>
        </label>
        <label className="text-muted-foreground flex flex-col gap-1 text-xs font-bold uppercase tracking-wide">
          {t('statusLabel')}
          <select
            name="status"
            defaultValue={sp.status ?? 'all'}
            className="border-border text-foreground focus:border-primary h-11 rounded-md border bg-white px-3 text-base focus:outline-none"
          >
            <option value="all">{t('statusAll')}</option>
            <option value="active">{t('statusActive')}</option>
            <option value="banned">{t('statusBanned')}</option>
          </select>
        </label>
        <button
          type="submit"
          className="bg-primary font-display text-primary-foreground h-11 rounded-md px-5 text-sm font-bold transition-opacity hover:opacity-90"
        >
          {t('filter')}
        </button>
      </form>

      {/* Stats row */}
      <p className="text-muted-foreground mt-4 text-sm">
        {t('resultsSummary', { count: list.users.length })}
      </p>

      {/* User table */}
      <div className="border-border mt-4 overflow-hidden rounded-md border bg-white">
        {list.users.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm italic">{t('empty')}</p>
        ) : (
          <ul className="divide-border divide-y">
            {list.users.map((u) => {
              const isSelf = u.id === admin.id;
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                  <Avatar src={u.avatarUrl} name={u.fullName ?? u.email ?? undefined} size="md" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-display text-foreground hover:text-primary text-sm font-bold"
                    >
                      {u.fullName || u.nickname || u.email || u.id.slice(0, 8)}
                    </Link>
                    {u.email && (u.fullName || u.nickname) && (
                      <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                    )}
                    <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span>{t('joinedOn', { when: formatRelative(u.createdAt, locale) })}</span>
                      {u.lastSignInAt && (
                        <span>
                          · {t('lastSeen', { when: formatRelative(u.lastSignInAt, locale) })}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {u.role === 'Admin' && (
                      <span className="bg-primary/10 font-display text-primary rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                        Admin
                      </span>
                    )}
                    {u.bannedUntil && (
                      <span className="bg-destructive/10 font-display text-destructive rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                        {t('banned')}
                      </span>
                    )}
                    {isSelf && (
                      <span className="bg-foreground/10 font-display text-foreground/70 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                        {t('you')}
                      </span>
                    )}
                    <UserActionsMenu
                      userId={u.id}
                      email={u.email}
                      role={u.role}
                      isBanned={!!u.bannedUntil}
                      isSelf={isSelf}
                      labels={actionLabels}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <nav aria-label="pagination" className="mt-6 flex items-center justify-between text-sm">
        {list.page > 1 ? (
          <Link
            href={`/admin/users?${(() => {
              const p = new URLSearchParams(queryParams);
              p.set('page', String(list.page - 1));
              return p.toString();
            })()}`}
            className="font-display text-primary font-bold hover:underline"
          >
            ← {t('prev')}
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        <span className="text-muted-foreground">{t('pageOf', { page: list.page })}</span>
        {list.hasMore ? (
          <Link
            href={`/admin/users?${(() => {
              const p = new URLSearchParams(queryParams);
              p.set('page', String(list.page + 1));
              return p.toString();
            })()}`}
            className="font-display text-primary font-bold hover:underline"
          >
            {t('next')} →
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
      </nav>
    </AdminShell>
  );
}
