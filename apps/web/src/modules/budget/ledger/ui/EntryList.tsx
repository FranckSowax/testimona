import { getTranslations } from 'next-intl/server';
import { formatXaf } from '../../format';
import { canReverse, type EntryView } from '../model';
import { ReverseButton } from './ReverseButton';

interface Props {
  dossierId: string;
  locale: string;
  views: readonly EntryView[];
  canManage: boolean;
}

/** Mouvements visibles ; une annulation apparaît comme une ligne, rien ne disparaît. */
export async function EntryList({ dossierId, locale, views, canManage }: Props) {
  const t = await getTranslations('ledger');
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  if (views.length === 0) return <p className="text-muted-foreground">{t('page.empty')}</p>;
  return (
    <ul className="border-border divide-border divide-y rounded-2xl border">
      {views.map((v) => {
        const sign = v.kind === 'expense' ? '−' : v.kind === 'reversal' ? '±' : '+';
        const label =
          v.kind === 'reversal' && v.reversesKind
            ? t('entry.reversalOf', { kind: t(`kind.${v.reversesKind}`) })
            : t(`kind.${v.kind}`);
        const struck = v.reversed ? 'line-through' : '';
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
              </p>
              <p className={`font-semibold tabular-nums ${struck}`}>
                {sign}
                {formatXaf(v.amount, locale)}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {date.format(new Date(`${v.occurredOn}T00:00:00Z`))}
              {v.reversed && ` · ${t('entry.reversed')}`}
              {v.fulfilled && ` · ${t('entry.fulfilled')}`}
              {v.kind === 'pledge' &&
                !v.fulfilled &&
                v.paid > 0 &&
                ` · ${t('entry.partlyPaid', { paid: formatXaf(v.paid, locale) })}`}
              {v.note && ` · ${v.note}`}
            </p>
            {canManage && canReverse(v) && <ReverseButton dossierId={dossierId} entryId={v.id} />}
          </li>
        );
      })}
    </ul>
  );
}
