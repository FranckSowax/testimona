import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Navigation entre les mouvements et les postes des cotisations.
 * WHY: deux pages liées plutôt que des onglets ARIA : chaque section a son adresse et reste
 * utilisable sans JavaScript.
 *
 * @example
 * <LedgerTabs dossierId={id} current="lines" />
 */
export async function LedgerTabs({
  dossierId,
  current,
}: {
  dossierId: string;
  current: 'entries' | 'lines';
}) {
  const t = await getTranslations('lines.tabs');
  const items = [
    { key: 'entries', href: `/dossier/${dossierId}/cotisations` },
    { key: 'lines', href: `/dossier/${dossierId}/cotisations/postes` },
  ] as const;
  return (
    <nav aria-label={t('label')} className="border-border flex gap-2 border-b">
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`text-secondary -mb-px border-b-2 px-3 py-2 text-sm font-semibold ${
              active ? 'border-secondary' : 'border-transparent underline'
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
