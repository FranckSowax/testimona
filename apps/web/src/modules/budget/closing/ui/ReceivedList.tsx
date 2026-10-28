import { getTranslations } from 'next-intl/server';
import { formatXaf } from '../../format';
import type { EntryView } from '../../ledger/model';

interface Props {
  locale: string;
  /** Cotisations reçues actives déjà filtrées par la RLS (voir `receivedContributions`). */
  views: readonly EntryView[];
}

/**
 * Cotisations reçues nominatives, telles que la visibilité du dossier les montre.
 *
 * @example
 * <ReceivedList locale="fr" views={receivedContributions(views)} />
 */
export async function ReceivedList({ locale, views }: Props) {
  const t = await getTranslations('closing.page');
  if (views.length === 0) return <p className="text-foreground">{t('receivedEmpty')}</p>;
  // WHY: occurred_on est une date sans heure ; lue en UTC, elle ne glisse pas d'un jour.
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  return (
    <ul className="divide-border divide-y">
      {views.map((v) => (
        <li
          key={v.id}
          className="text-foreground flex flex-wrap justify-between gap-2 py-2 text-sm"
        >
          <span>{v.partyName}</span>
          <span className="tabular-nums">
            {formatXaf(v.amount, locale)} · {date.format(new Date(`${v.occurredOn}T00:00:00Z`))}
          </span>
        </li>
      ))}
    </ul>
  );
}
