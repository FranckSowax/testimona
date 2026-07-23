import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdRowActions } from '@/components/admin/AdRowActions';
import { requireAdmin } from '@/lib/supabase/admin';
import { getAdsList } from '@/lib/admin/ads';

export const metadata: Metadata = {
  title: 'Admin — Ads',
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale);
}

const SLOT_LABELS: Record<string, string> = {
  'home-sidebar': 'Accueil — Sidebar',
  'home-footer': 'Accueil — Pied de page',
  'memorial-aside': 'Mémorial — Aside',
  'dashboard-sidebar': 'Dashboard — Sidebar',
};

export default async function AdminAdsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin();
  const { locale } = await params;
  const [t, tNav, ads] = await Promise.all([
    getTranslations('admin.ads'),
    getTranslations('admin.nav'),
    getAdsList(),
  ]);

  const labels = { delete: t('delete'), confirmDelete: t('confirmDelete'), activate: t('activate'), deactivate: t('deactivate') };

  return (
    <AdminShell
      title={tNav('ads')}
      action={
        <Link
          href="/admin/ads/new"
          className="rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t('newCta')}
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground">{t('subtitle')}</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white">
        {ads.length === 0 ? (
          <p className="p-8 text-center text-sm italic text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {ads.map((ad) => (
              <li
                key={ad.id}
                className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/ads/${ad.id}`}
                    className="font-display text-sm font-bold text-foreground hover:text-primary"
                  >
                    {ad.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="rounded-full bg-surface px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-foreground/70">
                      {SLOT_LABELS[ad.slot] ?? ad.slot}
                    </span>
                    {' · '}
                    <span className="uppercase">{ad.type}</span>
                    {ad.startsAt && (
                      <span>
                        {' · '}
                        {t('starts')} {formatDate(ad.startsAt, locale)}
                      </span>
                    )}
                    {ad.expiresAt && (
                      <span>
                        {' · '}
                        {t('expires')} {formatDate(ad.expiresAt, locale)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide',
                      ad.isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-foreground/10 text-foreground/70',
                    ].join(' ')}
                  >
                    {ad.isActive ? t('active') : t('inactive')}
                  </span>
                  <AdRowActions id={ad.id} isActive={ad.isActive} labels={labels} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
