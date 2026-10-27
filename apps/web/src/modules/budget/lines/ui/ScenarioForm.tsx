'use client';

import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { LEVELS, type Level } from '@/journey/options';
import { chooseScenarioAction } from '../actions';
import { linesErrorText } from './linesError';
import { useLinesForm } from './useLinesForm';

interface Props {
  dossierId: string;
  scenario: Level | null;
  /** Total des postes de chaque niveau, déjà formaté. */
  totals: Readonly<Record<Level, string>>;
}

/**
 * Choix du scénario retenu (trésorier et plus), avec le total des postes de chaque niveau.
 *
 * @example
 * <ScenarioForm dossierId={id} scenario="intermediate" totals={{ sober: '1 200 000 FCFA', … }} />
 */
export function ScenarioForm({ dossierId, scenario, totals }: Props) {
  const t = useTranslations('lines.scenario');
  const tLevel = useTranslations('budget.level');
  const tRoot = useTranslations();
  const { state, pending, saved, onSubmit, clearSaved, formRef } =
    useLinesForm(chooseScenarioAction);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onChange={clearSaved}
      className="border-border space-y-3 rounded-2xl border p-4"
    >
      <input type="hidden" name="dossierId" value={dossierId} />
      <fieldset className="space-y-2">
        <legend className="text-foreground font-semibold">{t('title')}</legend>
        <p className="text-foreground text-sm">{t('hint')}</p>
        {LEVELS.map((level) => (
          <label key={level} className="text-foreground flex items-center gap-2 text-sm">
            <input type="radio" name="scenario" value={level} defaultChecked={scenario === level} />
            {t('option', { level: tLevel(level), total: totals[level] })}
          </label>
        ))}
        <label className="text-foreground flex items-center gap-2 text-sm">
          <input type="radio" name="scenario" value="" defaultChecked={scenario === null} />
          {t('none')}
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: 'secondary',
            size: 'sm',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {t('save')}
        </button>
        <p role="status" className="text-foreground text-sm">
          {saved ? t('saved') : ''}
        </p>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {linesErrorText(state.error, tRoot)}
        </p>
      )}
    </form>
  );
}
