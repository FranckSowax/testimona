import { getTranslations } from 'next-intl/server';
import { formatXaf } from '../../format';
import type { LineView } from '../../lines/model';

interface Props {
  locale: string;
  /** Identifiant du titre de la section, qui nomme le tableau. */
  labelledBy: string;
  lines: readonly LineView[];
  unassignedSpent: number;
}

/**
 * Dépenses actives par poste : postes qui ont des dépenses, dépenses sans poste, total.
 *
 * @example
 * <SpentTable locale="fr" labelledBy="spent-title" lines={views} unassignedSpent={0} />
 */
export async function SpentTable({ locale, labelledBy, lines, unassignedSpent }: Props) {
  const t = await getTranslations('closing.spent');
  const rows = [
    ...lines.filter((l) => l.spent > 0).map((l) => ({ key: l.id, label: l.label, spent: l.spent })),
    ...(unassignedSpent > 0
      ? [{ key: 'unassigned', label: t('unassigned'), spent: unassignedSpent }]
      : []),
  ];
  if (rows.length === 0) return <p className="text-foreground">{t('empty')}</p>;
  const total = rows.reduce((sum, r) => sum + r.spent, 0);
  return (
    <table aria-labelledby={labelledBy} className="w-full text-sm">
      <thead>
        <tr className="border-border border-b">
          <th scope="col" className="text-foreground py-2 text-left">
            {t('line')}
          </th>
          <th scope="col" className="text-foreground py-2 text-right">
            {t('spent')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-border border-b">
            <th scope="row" className="text-foreground py-2 text-left font-normal">
              {r.label}
            </th>
            <td className="text-foreground py-2 text-right tabular-nums">
              {formatXaf(r.spent, locale)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className="text-foreground py-2 text-left">
            {t('total')}
          </th>
          <td className="text-foreground py-2 text-right font-semibold tabular-nums">
            {formatXaf(total, locale)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
