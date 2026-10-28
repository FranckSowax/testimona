import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Navigation entre les mouvements, les postes et le bilan des cotisations.
 * WHY: des pages liées plutôt que des onglets ARIA : chaque section a son adresse et reste
 * utilisable sans JavaScript.
 *
 * @example
 * <LedgerTabs dossierId={id} current="summary" />
 */
export async function LedgerTabs({
  dossierId,
  current,
}: {
  dossierId: string;
  current: 'entries' | 'lines' | 'summary';
}) {
  const t = await getTranslations('lines.tabs');
  const items = [
    { key: 'entries', href: `/dossier/${dossierId}/cotisations` },
    { key: 'lines', href: `/dossier/${dossierId}/cotisations/postes` },
    { key: 'summary', href: `/dossier/${dossierId}/cotisations/bilan` },
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
