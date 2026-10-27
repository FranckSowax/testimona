import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { formatXaf } from '../../format';
import type { ReferenceBudget } from '../../lines/model';
import type { LedgerTotals } from '../model';

interface Props {
  dossierId: string;
  locale: string;
  budget: ReferenceBudget | null;
  totals: LedgerTotals | null;
}

/**
 * Carte « Cotisations » du tableau de bord : reçu sur budget de référence (retenu ou envisagé).
 *
 * @example
 * <LedgerCard dossierId={id} locale="fr" budget={{ amount: 2_409_000, source: 'envisaged' }} totals={totals} />
 */
export async function LedgerCard({ dossierId, locale, budget, totals }: Props) {
  const t = await getTranslations('ledger.card');
  // WHY: une lecture en échec ne doit pas afficher « 0 FCFA reçus », qui serait faux.
  const summary = (() => {
    if (totals === null) return t('unavailable');
    const received = formatXaf(totals.received, locale);
    if (budget === null) return t('summaryNoBudget', { received });
    const amount = formatXaf(budget.amount, locale);
    return budget.source === 'retained'
      ? t('summaryRetained', { received, budget: amount })
      : t('summary', { received, budget: amount });
  })();
  return (
    <section className="border-border space-y-3 rounded-2xl border p-6">
      <h2 className="font-display text-foreground text-lg font-semibold">{t('title')}</h2>
      <p className="text-foreground">{summary}</p>
      <Link
        href={`/dossier/${dossierId}/cotisations`}
        className={buttonClasses({ variant: 'secondary', size: 'md' })}
      >
        {t('open')}
      </Link>
    </section>
  );
}
