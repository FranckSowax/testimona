import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/supabase/admin';
import { getAdminsList, getEnvHealth } from '@/lib/admin/system';

export const metadata: Metadata = {
  title: 'Admin — Settings',
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const admin = await requireAdmin();
  const { locale } = await params;
  const [t, tNav, admins] = await Promise.all([
    getTranslations('admin.settings'),
    getTranslations('admin.nav'),
    getAdminsList(),
  ]);
  const env = getEnvHealth();
  const version = process.env.GIT_SHA?.slice(0, 7) ?? 'dev';

  const envItems: { key: keyof typeof env; label: string }[] = [
    { key: 'supabaseUrl', label: t('envSupabase') },
    { key: 'serviceRoleKey', label: t('envServiceRole') },
    { key: 'siteUrl', label: t('envSiteUrl') },
    { key: 'stripeSecret', label: t('envStripe') },
    { key: 'sentryDsn', label: t('envSentry') },
  ];

  return (
    <AdminShell title={tNav('settings')}>
      {/* Current admin */}
      <section className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-base font-bold text-foreground">
          {t('youTitle')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {admin.email ?? admin.id} · <span className="text-primary">{admin.role}</span>
        </p>
      </section>

      {/* Env health */}
      <section className="mt-6 rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold text-foreground">
            {t('envTitle')}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t('version')} {version}
          </span>
        </header>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {envItems.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span
                aria-hidden="true"
                className={[
                  'inline-flex h-2.5 w-2.5 shrink-0 rounded-full',
                  env[item.key] ? 'bg-emerald-500' : 'bg-destructive',
                ].join(' ')}
              />
              <span className="flex-1">{item.label}</span>
              <span
                className={[
                  'font-display text-[11px] font-bold uppercase tracking-wide',
                  env[item.key] ? 'text-emerald-700' : 'text-destructive',
                ].join(' ')}
              >
                {env[item.key] ? t('ok') : t('missing')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Admins list */}
      <section className="mt-6 rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-base font-bold text-foreground">
          {t('adminsTitle')}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('adminsSubtitle')}</p>
        {admins.length === 0 ? (
          <p className="mt-4 text-sm italic text-muted-foreground">
            {t('adminsEmpty')}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {admins.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
              >
                <span className="flex flex-col">
                  <Link
                    href={`/admin/users/${a.id}`}
                    className="font-display font-bold text-foreground hover:text-primary"
                  >
                    {a.fullName || a.email || a.id.slice(0, 8)}
                  </Link>
                  {a.fullName && a.email && (
                    <span className="text-xs text-muted-foreground">{a.email}</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('lastSeen')} {formatDate(a.lastSignInAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <section className="mt-6 rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-base font-bold text-foreground">
          {t('quickLinks')}
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <li>
            <Link
              href="/admin"
              className="block rounded-md border border-border p-3 text-sm hover:border-primary hover:bg-surface"
            >
              <span className="font-display font-bold text-foreground">
                {tNav('overview')}
              </span>
              <p className="text-xs text-muted-foreground">{t('linkOverviewDesc')}</p>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/reports"
              className="block rounded-md border border-border p-3 text-sm hover:border-primary hover:bg-surface"
            >
              <span className="font-display font-bold text-foreground">
                {tNav('reports')}
              </span>
              <p className="text-xs text-muted-foreground">{t('linkReportsDesc')}</p>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/donations"
              className="block rounded-md border border-border p-3 text-sm hover:border-primary hover:bg-surface"
            >
              <span className="font-display font-bold text-foreground">
                {tNav('donations')}
              </span>
              <p className="text-xs text-muted-foreground">{t('linkDonationsDesc')}</p>
            </Link>
          </li>
        </ul>
      </section>
    </AdminShell>
  );
}
