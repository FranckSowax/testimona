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

  const labels = {
    delete: t('delete'),
    confirmDelete: t('confirmDelete'),
    activate: t('activate'),
    deactivate: t('deactivate'),
  };

  return (
    <AdminShell
      title={tNav('ads')}
      action={
        <Link
          href="/admin/ads/new"
          className="bg-primary font-display text-primary-foreground rounded-md px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
        >
          {t('newCta')}
        </Link>
      }
    >
      <p className="text-muted-foreground text-sm">{t('subtitle')}</p>

      <div className="border-border mt-6 overflow-hidden rounded-lg border bg-white">
        {ads.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm italic">{t('empty')}</p>
        ) : (
          <ul className="divide-border divide-y">
            {ads.map((ad) => (
              <li key={ad.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/ads/${ad.id}`}
                    className="font-display text-foreground hover:text-primary text-sm font-bold"
                  >
                    {ad.name}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    <span className="bg-surface font-display text-foreground/70 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
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
                      'font-display rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
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
