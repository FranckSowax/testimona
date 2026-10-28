import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface Props {
  dossierId: string;
  /** Date de clôture déjà formatée (`formatClosedOn`). */
  closedOn: string;
  showSummaryLink: boolean;
}

/**
 * Avis « cotisations clôturées » des écrans Cotisations, Postes et Bilan.
 *
 * @example
 * <ClosedNotice dossierId={id} closedOn="28 octobre 2026" showSummaryLink />
 */
export async function ClosedNotice({ dossierId, closedOn, showSummaryLink }: Props) {
  const t = await getTranslations('closing.notice');
  return (
    <div className="border-border space-y-2 rounded-2xl border p-4">
      <p className="text-foreground font-semibold">{t('closed', { date: closedOn })}</p>
      {showSummaryLink && (
        <Link
          href={`/dossier/${dossierId}/cotisations/bilan`}
          className="text-secondary text-sm font-semibold underline underline-offset-2"
        >
          {t('seeSummary')}
        </Link>
      )}
    </div>
  );
}
