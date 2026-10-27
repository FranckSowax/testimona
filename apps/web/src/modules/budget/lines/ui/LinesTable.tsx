import { getTranslations } from 'next-intl/server';
import { LEVELS, type Level } from '@/journey/options';
import { formatXaf } from '../../format';
import { scenarioTotals, type LineView } from '../model';
import { DeleteLineButton } from './DeleteLineButton';
import { LineForm } from './LineForm';

/** Légende du tableau : nom de la zone de défilement et point de focus après une suppression. */
export const LINES_CAPTION_ID = 'budget-lines-caption';

interface Props {
  dossierId: string;
  locale: string;
  lines: readonly LineView[];
  scenario: Level | null;
  unassignedSpent: number;
  canManage: boolean;
}

/**
 * Postes du budget : montant par niveau (le scénario retenu mis en avant) et dépenses rattachées ;
 * pour le trésorier, modification et suppression de chaque poste, et ajout d'un poste libre.
 * L'annonce des suppressions (LineDeletedAnnouncer) est montée par la page, autour du tableau.
 * WHY: pas de suppression proposée pour un poste qui porte des dépenses actives. Un poste dont
 * toutes les dépenses ont été annulées affiche 0 dépensé mais reste non supprimable : la base le
 * refuse (line_in_use) et le message « porte ou a porté des dépenses » l'explique.
 *
 * @example
 * <LinesTable dossierId={id} locale="fr" lines={views} scenario="sober" unassignedSpent={0} canManage />
 */
export async function LinesTable({
  dossierId,
  locale,
  lines,
  scenario,
  unassignedSpent,
  canManage,
}: Props) {
  const t = await getTranslations('lines');
  const tLevel = await getTranslations('budget.level');
  const money = (n: number) => formatXaf(n, locale);
  const totals = scenarioTotals(lines);
  const spentTotal = lines.reduce((sum, l) => sum + l.spent, 0) + unassignedSpent;
  const levelHeader = (level: Level) =>
    scenario === level ? `${tLevel(level)} (${t('table.retained')})` : tLevel(level);
  const cell = (level: Level) =>
    `text-foreground px-3 py-2 text-right tabular-nums ${scenario === level ? 'font-bold' : ''}`;
  const table = (
    // WHY: zone focusable et nommée, pour faire défiler au clavier un tableau plus large que l'écran.
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-labelledby={LINES_CAPTION_ID}>
      <table className="w-full min-w-[36rem] text-sm">
        <caption
          id={LINES_CAPTION_ID}
          tabIndex={-1}
          className="text-foreground mb-2 text-left font-semibold"
        >
          {t('table.caption')}
        </caption>
        <thead>
          <tr className="border-border border-b">
            <th scope="col" className="text-foreground px-3 py-2 text-left">
              {t('table.line')}
            </th>
            {LEVELS.map((level) => (
              <th key={level} scope="col" className="text-foreground px-3 py-2 text-right">
                {levelHeader(level)}
              </th>
            ))}
            <th scope="col" className="text-foreground px-3 py-2 text-right">
              {t('table.spent')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-border border-b">
              <th scope="row" className="text-foreground px-3 py-2 text-left font-normal">
                {line.label}
                {line.edited && line.gridKey && <span> · {t('table.edited')}</span>}
              </th>
              {LEVELS.map((level) => (
                <td key={level} className={cell(level)}>
                  {money(line.amounts[level])}
                </td>
              ))}
              <td className="text-foreground px-3 py-2 text-right tabular-nums">
                {money(line.spent)}
              </td>
            </tr>
          ))}
          {unassignedSpent > 0 && (
            <tr className="border-border border-b">
              <th scope="row" className="text-foreground px-3 py-2 text-left font-normal">
                {t('table.unassigned')}
              </th>
              {LEVELS.map((level) => (
                <td key={level} className={cell(level)} />
              ))}
              <td className="text-foreground px-3 py-2 text-right tabular-nums">
                {money(unassignedSpent)}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="text-foreground px-3 py-2 text-left">
              {t('table.total')}
            </th>
            {LEVELS.map((level) => (
              <td key={level} className={`${cell(level)} font-semibold`}>
                {money(totals[level])}
              </td>
            ))}
            <td className="text-foreground px-3 py-2 text-right font-semibold tabular-nums">
              {money(spentTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
  if (!canManage) return <div className="space-y-4">{table}</div>;
  return (
    <div className="space-y-4">
      {table}
      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={line.id} className="border-border space-y-3 rounded-2xl border p-4">
            <details>
              <summary className="text-foreground cursor-pointer font-semibold">
                {t('form.editTitle', { label: line.label })}
              </summary>
              <div className="mt-4">
                <LineForm
                  dossierId={dossierId}
                  line={{ id: line.id, label: line.label, amounts: line.amounts }}
                />
              </div>
            </details>
            {line.spent === 0 && (
              <DeleteLineButton dossierId={dossierId} lineId={line.id} label={line.label} />
            )}
          </li>
        ))}
        <li className="border-border rounded-2xl border p-4">
          <details>
            <summary className="text-foreground cursor-pointer font-semibold">
              {t('form.addTitle')}
            </summary>
            <div className="mt-4">
              <LineForm dossierId={dossierId} />
            </div>
          </details>
        </li>
      </ul>
    </div>
  );
}
