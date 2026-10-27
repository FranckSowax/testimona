import { getTranslations } from 'next-intl/server';
import { formatXaf } from '../../format';
import { balance, remaining, type LedgerTotals } from '../model';

interface Props {
  locale: string;
  budget: number | null;
  totals: LedgerTotals;
}

/** Chiffres clés du registre : budget envisagé, reçu, promis, dépensé, disponible, reste. */
export async function LedgerSummary({ locale, budget, totals }: Props) {
  const t = await getTranslations('ledger.summary');
  const money = (amount: number) => formatXaf(amount, locale);
  const rest = remaining(budget, totals);
  const items = [
    {
      label: budget === null ? t('budgetNone') : t('budget'),
      value: budget === null ? '—' : money(budget),
    },
    { label: t('received'), value: money(totals.received) },
    { label: t('pledgedOpen'), value: money(totals.pledgedOpen) },
    { label: t('spent'), value: money(totals.spent) },
    { label: t('balance'), value: money(balance(totals)) },
    { label: t('remaining'), value: rest === null ? '—' : money(rest) },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-border rounded-2xl border p-4">
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="font-display text-foreground mt-1 text-xl font-bold tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
