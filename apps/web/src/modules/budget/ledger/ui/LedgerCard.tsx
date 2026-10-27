import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { formatXaf } from '../../format';
import type { LedgerTotals } from '../model';

interface Props {
  dossierId: string;
  locale: string;
  budget: number | null;
  totals: LedgerTotals | null;
}

/**
 * Carte « Cotisations » du tableau de bord : reçu sur budget envisagé.
 *
 * @example
 * <LedgerCard dossierId={id} locale="fr" budget={2_409_000} totals={totals} />
 */
export async function LedgerCard({ dossierId, locale, budget, totals }: Props) {
  const t = await getTranslations('ledger.card');
  const received = formatXaf(totals?.received ?? 0, locale);
  return (
    <section className="border-border space-y-3 rounded-2xl border p-6">
      <h2 className="font-display text-foreground text-lg font-semibold">{t('title')}</h2>
      <p className="text-foreground">
        {budget === null
          ? t('summaryNoBudget', { received })
          : t('summary', { received, budget: formatXaf(budget, locale) })}
      </p>
      <Link
        href={`/dossier/${dossierId}/cotisations`}
        className={buttonClasses({ variant: 'secondary', size: 'md' })}
      >
        {t('open')}
      </Link>
    </section>
  );
}
