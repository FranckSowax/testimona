import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { Avatar } from '@/components/ui/Avatar';
import { requireAdmin } from '@/lib/supabase/admin';
import { getAdminsList, getEnvHealth, type EnvHealth } from '@/lib/admin/system';

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

function formatRelative(iso: string | null, locale: string): string {
  if (!iso) return locale === 'fr' ? 'jamais' : 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return locale === 'fr' ? "à l'instant" : 'just now';
  if (hours < 24) return locale === 'fr' ? `il y a ${hours} h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return locale === 'fr' ? `il y a ${days} j` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(locale);
}

const ENV_ICONS: Record<keyof EnvHealth, string> = {
  supabaseUrl:
    'M12 2a3 3 0 0 0-3 3v3.5a3 3 0 0 0 1 2.236M19 11.5a3 3 0 0 0-3-3h-3.5a3 3 0 0 0-2.236 1M5 21.5l5-7.5h7l-3.5 6L13.5 22l-3-1-1.5 0.5L5 21.5Z',
  serviceRoleKey:
    'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  siteUrl: 'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0Zm10-10v20M2 12h20',
  stripeSecret: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  sentryDsn: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v4m0 4h.01',
};

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

  const envItems: { key: keyof EnvHealth; label: string; hint: string }[] = [
    { key: 'supabaseUrl', label: t('envSupabase'), hint: 'NEXT_PUBLIC_SUPABASE_URL' },
    { key: 'serviceRoleKey', label: t('envServiceRole'), hint: 'SUPABASE_SERVICE_KEY' },
    { key: 'siteUrl', label: t('envSiteUrl'), hint: 'NEXT_PUBLIC_SITE_URL' },
    { key: 'stripeSecret', label: t('envStripe'), hint: 'STRIPE_SECRET_KEY' },
    { key: 'sentryDsn', label: t('envSentry'), hint: 'NEXT_PUBLIC_SENTRY_DSN' },
  ];

  const okCount = envItems.filter((e) => env[e.key]).length;
  const totalCount = envItems.length;
  const healthPct = Math.round((okCount / totalCount) * 100);
  const isFullyHealthy = okCount === totalCount;

  const quickLinks: { href: string; label: string; desc: string; iconPath: string }[] = [
    {
      href: '/admin',
      label: tNav('overview'),
      desc: t('linkOverviewDesc'),
      iconPath: 'M3 13h8V3H3v10Zm10 8h8V11h-8v10Zm0-18v6h8V3h-8ZM3 21h8v-6H3v6Z',
    },
    {
      href: '/admin/reports',
      label: tNav('reports'),
      desc: t('linkReportsDesc'),
      iconPath:
        'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01',
    },
    {
      href: '/admin/donations',
      label: tNav('donations'),
      desc: t('linkDonationsDesc'),
      iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    },
  ];

  return (
    <AdminShell title={tNav('settings')}>
      {/* Hero: admin identity + at-a-glance health */}
      <section
        aria-labelledby="settings-hero-heading"
        className="border-border relative overflow-hidden rounded-2xl border bg-white p-6 shadow-[var(--shadow-card)] sm:p-8"
        style={{
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(80,170,195,0.10), transparent 55%), radial-gradient(circle at 100% 100%, rgba(219,129,134,0.08), transparent 60%)',
        }}
      >
        <div className="flex flex-wrap items-start gap-6">
          <Avatar name={admin.email ?? 'A'} size="lg" border="rose" className="ring-4 ring-white" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-primary text-xs font-bold uppercase tracking-wider">
              {tNav('header')}
            </p>
            <h2
              id="settings-hero-heading"
              className="font-display text-foreground mt-1 text-2xl font-bold leading-tight sm:text-3xl"
            >
              {t('youTitle')}
            </h2>
            <p className="text-muted-foreground mt-2 break-all text-sm">
              {admin.email ?? admin.id}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="bg-primary/10 font-display text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2 4 6v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V6l-8-4Z" />
                </svg>
                {admin.role}
              </span>
              <span className="bg-surface font-display text-foreground/70 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide">
                {t('version')} · {version}
              </span>
              <span
                className={[
                  'font-display inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
                  isFullyHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'h-2 w-2 rounded-full',
                    isFullyHealthy ? 'bg-emerald-500' : 'bg-amber-500',
                  ].join(' ')}
                />
                {healthPct}% · {okCount}/{totalCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Env health grid */}
      <section aria-labelledby="env-heading" className="mt-8">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="env-heading" className="font-display text-foreground text-lg font-bold">
            {t('envTitle')}
          </h2>
          <span className="text-muted-foreground text-xs">
            {okCount} / {totalCount}
          </span>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {envItems.map((item) => {
            const isOk = env[item.key];
            return (
              <li
                key={item.key}
                className={[
                  'group flex items-start gap-3 rounded-xl border bg-white p-4 transition-shadow',
                  isOk
                    ? 'border-border hover:shadow-[var(--shadow-card)]'
                    : 'border-destructive/30',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    isOk ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
                  ].join(' ')}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={ENV_ICONS[item.key]} />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-foreground text-sm font-bold">{item.label}</p>
                  <p className="text-muted-foreground mt-0.5 truncate font-mono text-[11px]">
                    {item.hint}
                  </p>
                  <p
                    className={[
                      'font-display mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide',
                      isOk ? 'text-emerald-700' : 'text-destructive',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        isOk ? 'bg-emerald-500' : 'bg-destructive',
                      ].join(' ')}
                    />
                    {isOk ? t('ok') : t('missing')}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Admins list */}
      <section aria-labelledby="admins-heading" className="mt-10">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 id="admins-heading" className="font-display text-foreground text-lg font-bold">
              {t('adminsTitle')}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">{t('adminsSubtitle')}</p>
          </div>
          <span className="bg-primary/10 font-display tabular text-primary rounded-full px-2.5 py-0.5 text-[11px] font-bold">
            {admins.length}
          </span>
        </header>
        {admins.length === 0 ? (
          <p className="border-border bg-surface text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm italic">
            {t('adminsEmpty')}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {admins.map((a) => {
              const displayName = a.fullName || a.email || a.id.slice(0, 8);
              const isMe = a.id === admin.id;
              return (
                <li key={a.id}>
                  <Link
                    href={`/admin/users/${a.id}`}
                    className="border-border group flex items-center gap-4 rounded-xl border bg-white p-4 transition-[box-shadow,transform] hover:shadow-[var(--shadow-card)]"
                  >
                    <Avatar name={displayName} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-foreground flex items-center gap-2 text-sm font-bold">
                        <span className="truncate">{displayName}</span>
                        {isMe && (
                          <span className="bg-primary/10 font-display text-primary shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            {locale === 'fr' ? 'Vous' : 'You'}
                          </span>
                        )}
                      </p>
                      {a.fullName && a.email && (
                        <p className="text-muted-foreground truncate text-xs">{a.email}</p>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t('lastSeen')} · {formatRelative(a.lastSignInAt, locale)}
                      </p>
                    </div>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <section aria-labelledby="quick-heading" className="mt-10">
        <h2 id="quick-heading" className="font-display text-foreground mb-4 text-lg font-bold">
          {t('quickLinks')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="border-border group flex h-full flex-col gap-2 rounded-xl border bg-white p-5 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
              >
                <span
                  aria-hidden="true"
                  className="bg-primary/10 text-primary inline-flex h-10 w-10 items-center justify-center rounded-lg"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={link.iconPath} />
                  </svg>
                </span>
                <p className="font-display text-foreground text-base font-bold">{link.label}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{link.desc}</p>
                <p className="font-display text-primary mt-auto inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide transition-transform group-hover:translate-x-0.5">
                  {locale === 'fr' ? 'Ouvrir' : 'Open'} →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Last metadata */}
      <footer className="border-border text-muted-foreground mt-10 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs">
        <span className="tabular">
          {t('version')} · <span className="font-mono">{version}</span>
        </span>
        <span>
          {locale === 'fr' ? 'Dernier rafraîchissement' : 'Last refresh'} ·{' '}
          {formatDate(new Date().toISOString(), locale)}
        </span>
      </footer>
    </AdminShell>
  );
}
