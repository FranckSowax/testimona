'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { LEVELS, type Level } from '@/journey/options';
import { saveLineAction } from '../actions';
import { linesErrorText } from './linesError';
import { useLinesForm } from './useLinesForm';

interface Props {
  dossierId: string;
  lineId: string;
  /** Libellé actuel du poste, renvoyé tel quel. */
  label: string;
  amounts: Readonly<Record<Level, number>>;
  /** Texte du bouton, montant déjà formaté côté serveur. */
  text: string;
}

/**
 * « Mettre à jour le poste … » : remplace les trois montants du poste par l'estimation de
 * l'étape, avec l'action existante de modification d'un poste.
 *
 * @example
 * <AdjustLineButton dossierId={id} lineId={line.id} label={line.label} amounts={a} text={text} />
 */
export function AdjustLineButton({ dossierId, lineId, label, amounts, text }: Props) {
  const t = useTranslations('journey.synthesis');
  const tRoot = useTranslations();
  const router = useRouter();
  const { state, pending, saved, onSubmit, formRef } = useLinesForm(saveLineAction);
  // WHY: l'action revalide les pages des cotisations, pas cette synthèse : on la relit.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="lineId" value={lineId} />
      <input type="hidden" name="label" value={label} />
      {LEVELS.map((level) => (
        <input key={level} type="hidden" name={level} value={String(amounts[level])} />
      ))}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={buttonClasses({
          variant: 'secondary',
          size: 'md',
          className: 'disabled:cursor-not-allowed disabled:opacity-60',
        })}
      >
        {text}
      </button>
      <p role="status" className="text-foreground text-sm">
        {saved ? t('adjusted') : ''}
      </p>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {linesErrorText(state.error, tRoot)}
        </p>
      )}
    </form>
  );
}
