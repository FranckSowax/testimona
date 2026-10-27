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
  onImproved: (text: string) => void;
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
  const run = () =>
    startTransition(async () => {
      const res = await improveDraftAction({
        dossierId: props.dossierId,
        stepId: props.stepId,
        text: props.text,
      });
      if (res.ok) props.onImproved(res.text);
      else props.onError(res.error);
    });
  return (
    <button
      type="button"
      onClick={run}
      disabled={props.disabled || pending}
      aria-busy={pending || undefined}
      className={props.className}
    >
      {pending ? t('improving') : t('improve')}
    </button>
  );
}
