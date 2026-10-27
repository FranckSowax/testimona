'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { revokeInvitationAction, type FormState } from '../actions';

interface Props {
  dossierId: string;
  invitationId: string;
  /** Contexte lu par les lecteurs d'écran (rôle, e-mail, échéance). */
  hiddenLabel: string;
}

/**
 * Formulaire de révocation d'une invitation : bouton désactivé pendant l'envoi,
 * erreur affichée à côté du bouton si la révocation échoue.
 * @example <RevokeButton dossierId={id} invitationId={inv.id} hiddenLabel="Contributeur, expire le 3 nov." />
 */
export function RevokeButton({ dossierId, invitationId, hiddenLabel }: Props) {
  const t = useTranslations('dossier');
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    revokeInvitationAction,
    null,
  );
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <button
        type="submit"
        disabled={pending}
        className="text-destructive text-sm font-semibold disabled:opacity-60"
      >
        {t('members.revoke')}
        <span className="sr-only"> ({hiddenLabel})</span>
      </button>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}
