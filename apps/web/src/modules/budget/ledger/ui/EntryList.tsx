import { getTranslations } from 'next-intl/server';
import { formatXaf } from '../../format';
import { canReverse, entrySign, type EntryView } from '../model';
import { ReverseButton } from './ReverseButton';

interface Props {
  dossierId: string;
  locale: string;
  views: readonly EntryView[];
  canManage: boolean;
  /** Libellé de chaque poste du budget, par identifiant. */
  lineLabels: ReadonlyMap<string, string>;
  /** Reçu rattaché à chaque dépense, par identifiant de dépense. */
  receiptByEntry: ReadonlyMap<string, string>;
}

/** Mouvements visibles ; une annulation apparaît comme une ligne, rien ne disparaît. */
export async function EntryList({
  dossierId,
  locale,
  views,
  canManage,
  lineLabels,
  receiptByEntry,
}: Props) {
  const t = await getTranslations('ledger');
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  if (views.length === 0) return <p className="text-muted-foreground">{t('page.empty')}</p>;
  return (
    <ul className="border-border divide-border divide-y rounded-2xl border">
      {views.map((v) => {
        const amount = formatXaf(v.amount, locale);
        const label =
          v.kind === 'reversal' && v.reversesKind
            ? t('entry.reversalOf', { kind: t(`kind.${v.reversesKind}`) })
            : t(`kind.${v.kind}`);
        const day = date.format(new Date(`${v.occurredOn}T00:00:00Z`));
        const struck = v.reversed ? 'line-through' : '';
        const lineLabel =
          v.kind === 'expense' && v.budgetLineId ? lineLabels.get(v.budgetLineId) : undefined;
        const receiptId = v.kind === 'expense' ? receiptByEntry.get(v.id) : undefined;
        const entryLabel = `${v.partyName}, ${label}, ${amount}, ${day}`;
        return (
          <li key={v.id} className="space-y-1 px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className={`text-foreground font-semibold ${struck}`}>
                {v.partyName}
                <span className="text-muted-foreground font-normal"> · {label}</span>
                {v.method && (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · {t(`method.${v.method}`)}
                  </span>
                )}
                {lineLabel && (
                  <span className="font-normal"> · {t('entry.line', { line: lineLabel })}</span>
                )}
              </p>
              <p className={`font-semibold tabular-nums ${struck}`}>
                {entrySign(v)}
                {amount}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {day}
              {v.reversed && ` · ${t('entry.reversed')}`}
              {v.fulfilled && ` · ${t('entry.fulfilled')}`}
              {v.kind === 'pledge' &&
                !v.fulfilled &&
                v.paid > 0 &&
                ` · ${t('entry.partlyPaid', { paid: formatXaf(v.paid, locale) })}`}
              {v.note && ` · ${v.note}`}
            </p>
            {receiptId && (
              <p className="text-sm">
                {/* WHY: lien simple (pas de prélecture de <Link>) ; la route crée un lien signé de
                    5 minutes à chaque clic. */}
                <a
                  href={`/api/receipts/${receiptId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('entry.receiptLabel', { entry: entryLabel })}
                  className="text-secondary font-semibold underline underline-offset-2"
                >
                  {t('entry.receipt')}
                </a>
              </p>
            )}
            {canManage && canReverse(v) && (
              <ReverseButton dossierId={dossierId} entryId={v.id} label={entryLabel} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
