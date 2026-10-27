'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { createLinesAction, recomputeLinesAction } from '../actions';
import { linesErrorText } from './linesError';
import { useLinesForm } from './useLinesForm';

type Done = 'created' | 'recomputed' | null;

/**
 * « Créer les postes » quand il n'y en a aucun, sinon « Recalculer selon l'affluence ».
 *
 * @example
 * <LinesActions dossierId={id} hasLines={lines.length > 0} />
 */
export function LinesActions({ dossierId, hasLines }: { dossierId: string; hasLines: boolean }) {
  const t = useTranslations('lines.page');
  const tRoot = useTranslations();
  const { state, pending, saved, onSubmit, formRef } = useLinesForm(
    hasLines ? recomputeLinesAction : createLinesAction,
  );
  // WHY: après « Créer les postes », la revalidation fait passer hasLines à true sans remonter le
  // composant ; on retient donc l'opération envoyée pour annoncer celle qui a réussi.
  const sentRef = useRef<Done>(null);
  const [done, setDone] = useState<Done>(null);
  useEffect(() => {
    if (state?.ok) setDone(sentRef.current);
  }, [state]);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    sentRef.current = hasLines ? 'recomputed' : 'created';
    onSubmit(e);
  };
  const hintId = `${useId()}-recompute-hint`;
  return (
    <form ref={formRef} onSubmit={submit} className="space-y-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      {hasLines && (
        <p id={hintId} className="text-foreground text-sm">
          {t('recomputeHint')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          aria-describedby={hasLines ? hintId : undefined}
          className={buttonClasses({
            variant: 'secondary',
            size: 'md',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {hasLines ? t('recompute') : t('create')}
        </button>
        <p role="status" className="text-foreground text-sm">
          {saved && done ? t(done) : ''}
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
