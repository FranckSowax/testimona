'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { improveDraftAction } from '@/modules/ai/actions';
import type { AiError } from '@/modules/ai/types';

interface Props {
  dossierId: string;
  stepId: string;
  text: string;
  disabled: boolean;
  className: string;
  /** Début et fin de l'appel (le parent verrouille la saisie pendant ce temps). */
  onPendingChange: (pending: boolean) => void;
  /** `sent` est le texte envoyé : le parent ne remplace que s'il n'a pas changé. */
  onImproved: (text: string, sent: string) => void;
  onError: (error: AiError) => void;
}

/**
 * Demande une version améliorée du texte affiché ; ne l'enregistre pas.
 *
 * @example
 * <ImproveDraftButton dossierId={id} stepId={stepId} text={text} onImproved={setText} … />
 */
export function ImproveDraftButton(props: Props) {
  const t = useTranslations('journey.draft');
  const [pending, startTransition] = useTransition();
  const run = () => {
    // WHY: pas de `disabled` pendant l'appel (le focus partirait sur body) : on ignore le clic.
    if (pending) return;
    const sent = props.text;
    props.onPendingChange(true);
    startTransition(async () => {
      try {
        const res = await improveDraftAction({
          dossierId: props.dossierId,
          stepId: props.stepId,
          text: sent,
        });
        props.onPendingChange(false);
        if (res.ok) props.onImproved(res.text, sent);
        else props.onError(res.error);
      } catch {
        props.onPendingChange(false);
        props.onError('failed');
      }
    });
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={props.disabled}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      className={props.className}
    >
      {pending ? t('improving') : t('improve')}
    </button>
  );
}
