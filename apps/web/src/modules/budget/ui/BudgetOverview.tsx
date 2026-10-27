import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { LEVELS, type Level } from '@/journey/options';
import { formatXaf } from '../format';
import type { Attendance, Scenarios } from '../scenarios';

interface Props {
  dossierId: string;
  locale: string;
  attendance: Attendance;
  scenarios: Scenarios;
  chosen: Level | null;
  canAnswer: boolean;
}

/**
 * Page « Budget prévisionnel » : affluence, trois totaux et détail par poste.
 * Le niveau envisagé (étape B.2) est mis en avant ; rien n'est enregistré ici.
 */
export async function BudgetOverview(props: Props) {
  const { dossierId, locale, attendance, scenarios, chosen, canAnswer } = props;
  const t = await getTranslations('budget');
  const money = (amount: number) => formatXaf(amount, locale);
  const stepHref = (stepId: string) => `/dossier/${dossierId}/etape/${stepId}`;
  const anyCapped = scenarios.lines.some((line) => line.capped);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">{t('page.title')}</h1>
        <p className="text-muted-foreground">{t('page.intro')}</p>
        <p className="text-muted-foreground text-sm">{t('page.estimateNote')}</p>
      </header>

      <section aria-labelledby="attendance-title" className="border-border rounded-2xl border p-5">
        <h2 id="attendance-title" className="text-foreground font-semibold">
          {t('page.attendanceTitle')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {attendance.answered
            ? t('page.attendanceRange', {
                low: attendance.low,
                high: attendance.high,
                nights: attendance.nights,
              })
            : t('page.noAttendance')}
        </p>
        {canAnswer && (
          <Link
            href={stepHref('attendance')}
            className="text-primary mt-3 inline-block text-sm font-semibold hover:underline"
          >
            {attendance.answered ? t('page.editAttendance') : t('page.answerAttendance')}
          </Link>
        )}
      </section>

      <section aria-labelledby="scenarios-title" className="space-y-4">
        <h2 id="scenarios-title" className="text-foreground font-semibold">
          {t('page.scenariosTitle')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <li
              key={level}
              className={`rounded-2xl border p-4 ${
                chosen === level ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <p className="text-foreground font-semibold">{t(`level.${level}`)}</p>
              <p className="font-display text-foreground mt-1 text-xl font-bold">
                {money(scenarios.totals[level])}
              </p>
              {chosen === level && (
                <p className="text-primary mt-1 text-sm font-semibold">{t('page.chosen')}</p>
              )}
            </li>
          ))}
        </ul>
        {canAnswer && (
          <Link
            href={stepHref('budget')}
            className={buttonClasses({ variant: 'primary', size: 'md' })}
          >
            {chosen ? t('page.changeLevel') : t('page.chooseLevel')}
          </Link>
        )}
      </section>

      <div className="border-border overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-border border-b text-left">
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('page.line')}
              </th>
              {LEVELS.map((level) => (
                <th key={level} scope="col" className="px-4 py-3 text-right font-semibold">
                  {t(`level.${level}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenarios.lines.map((line) => (
              <tr key={line.key} className="border-border border-b last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  {t(`grid.${line.key}`)}
                  {line.capped && (
                    <>
                      <span aria-hidden="true"> *</span>
                      <span className="sr-only"> ({t('page.capped')})</span>
                    </>
                  )}
                </th>
                {LEVELS.map((level) => (
                  <td key={level} className="px-4 py-2 text-right tabular-nums">
                    {money(line.amounts[level])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-border border-t font-semibold">
              <th scope="row" className="px-4 py-3 text-left">
                {t('page.total')}
              </th>
              {LEVELS.map((level) => (
                <td key={level} className="px-4 py-3 text-right tabular-nums">
                  {money(scenarios.totals[level])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {anyCapped && (
        <p role="note" className="text-muted-foreground text-sm">
          * {t('page.cappedNote')}
        </p>
      )}

      <Link
        href={`/dossier/${dossierId}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← {t('page.backToDossier')}
      </Link>
    </div>
  );
}
