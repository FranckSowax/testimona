import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatXaf } from '@/modules/budget/format';
import type { LineAdjustment } from '@/modules/budget/lines/model';
import { AdjustLineButton } from '@/modules/budget/lines/ui/AdjustLineButton';
import { AMOUNT_MAX } from '@/modules/budget/scenarios';
import type { PanelGroup } from '@/modules/providers/panel';
import { ProviderPanel } from '@/modules/providers/ui/ProviderPanel';
import type { StepEstimate } from '../quantities';

interface Props {
  dossierId: string;
  locale: string;
  stepId: string;
  /** null sans réponse à B.1. */
  estimate: StepEstimate | null;
  /** null si la personne ne peut pas ajuster les postes (rôle, clôture). */
  adjustments: readonly LineAdjustment[] | null;
  canAnswer: boolean;
  panel: { city: string; groups: readonly PanelGroup[] };
}

/**
 * Synthèse d'une étape (3.1, 3.2) : quantités, coût estimé au niveau de B.2, ajustement des
 * postes pour un trésorier, puis encadré prestataires. Rien n'est enregistré sans clic.
 */
export function StepSynthesis(props: Props) {
  const { dossierId, locale, stepId, estimate, adjustments, canAnswer, panel } = props;
  const t = useTranslations('journey');
  const tBudget = useTranslations('budget');
  const money = (amount: number) => formatXaf(amount, locale);
  const anyCapped = estimate?.costs.some((cost) => cost.capped) ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">
          {t(`steps.${stepId}.title`)}
        </h1>
        {estimate && (
          <p className="text-muted-foreground">
            {t('synthesis.intro', {
              high: estimate.attendance.high,
              nights: estimate.attendance.nights,
            })}
          </p>
        )}
        {estimate?.attendance.nightsAssumed && (
          <p className="text-muted-foreground text-sm">{t('synthesis.nightsAssumed')}</p>
        )}
      </header>

      {!estimate ? (
        <section className="border-border space-y-3 rounded-2xl border p-5">
          <p className="text-foreground">{t('synthesis.noAttendance')}</p>
          {canAnswer && (
            <Link
              href={`/dossier/${dossierId}/etape/attendance`}
              className="text-primary text-sm font-semibold hover:underline"
            >
              {t('synthesis.answerAttendance')}
            </Link>
          )}
        </section>
      ) : (
        <>
          <section aria-labelledby="quantities-title" className="space-y-3">
            <h2
              id="quantities-title"
              className="font-display text-foreground text-lg font-semibold"
            >
              {t('synthesis.quantitiesTitle')}
            </h2>
            {estimate.quantities.length === 0 ? (
              <p className="text-muted-foreground">{t('synthesis.noQuantities')}</p>
            ) : (
              <ul className="text-foreground list-disc space-y-1 pl-5">
                {estimate.quantities.map((quantity) => (
                  <li key={quantity.key}>
                    {t(`synthesis.quantity.${quantity.key}`, { count: quantity.count })}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {estimate.costs.length > 0 && (
            <section aria-labelledby="cost-title" className="space-y-3">
              <h2 id="cost-title" className="font-display text-foreground text-lg font-semibold">
                {t('synthesis.costTitle', { level: tBudget(`level.${estimate.level}`) })}
              </h2>
              <div className="border-border overflow-x-auto rounded-2xl border">
                <table className="w-full text-sm">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">{t('synthesis.line')}</th>
                      <th scope="col">{tBudget(`level.${estimate.level}`)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.costs.map((cost) => (
                      <tr key={cost.gridKey} className="border-border border-b last:border-0">
                        <th scope="row" className="px-4 py-2 text-left font-normal">
                          {tBudget(`grid.${cost.gridKey}`)}
                          {cost.capped && (
                            <>
                              <span aria-hidden="true"> *</span>
                              <span className="sr-only"> ({t('synthesis.capped')})</span>
                            </>
                          )}
                        </th>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {money(cost.amounts[estimate.level])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm">{t('synthesis.costNote')}</p>
              {anyCapped && (
                <p role="note" className="text-muted-foreground text-sm">
                  * {t('synthesis.cappedNote', { max: money(AMOUNT_MAX) })}
                </p>
              )}
            </section>
          )}

          {adjustments && adjustments.length > 0 && (
            <section aria-labelledby="adjust-title" className="space-y-3">
              <h2 id="adjust-title" className="font-display text-foreground text-lg font-semibold">
                {t('synthesis.adjustTitle')}
              </h2>
              <p className="text-muted-foreground text-sm">{t('synthesis.adjustHint')}</p>
              <ul className="space-y-3">
                {adjustments.map((adjustment) => (
                  <li key={adjustment.gridKey}>
                    {adjustment.upToDate ? (
                      <p className="text-foreground text-sm">
                        {t('synthesis.upToDate', { line: adjustment.line.label })}
                      </p>
                    ) : (
                      <AdjustLineButton
                        dossierId={dossierId}
                        lineId={adjustment.line.id}
                        label={adjustment.line.label}
                        amounts={adjustment.amounts}
                        text={t('synthesis.adjust', {
                          line: adjustment.line.label,
                          amount: money(adjustment.amounts[estimate.level]),
                        })}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ProviderPanel city={panel.city} groups={panel.groups} />

      <div className="flex flex-wrap justify-between gap-3 text-sm">
        {canAnswer && (
          <Link
            href={`/dossier/${dossierId}/etape/${stepId}`}
            className="text-secondary font-semibold underline underline-offset-2"
          >
            {t('synthesis.editAnswers')}
          </Link>
        )}
        <Link
          href={`/dossier/${dossierId}`}
          className="text-foreground underline underline-offset-2"
        >
          ← {t('synthesis.backToDossier')}
        </Link>
      </div>
    </div>
  );
}
