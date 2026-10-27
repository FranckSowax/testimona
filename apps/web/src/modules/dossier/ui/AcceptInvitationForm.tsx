'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { acceptInvitationAction, type FormState } from '../actions';

/**
 * Bouton d'acceptation d'une invitation (POST explicite, jamais au chargement).
 * @example <AcceptInvitationForm token={token} />
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const t = useTranslations('dossier');
  const tHeader = useTranslations('header');
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    acceptInvitationAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <p role="alert" className="text-accent-soft">
          {t(`errors.${state.error}`)}
        </p>
      )}
      {state?.error === 'unauthenticated' && (
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="inline-block font-semibold underline"
        >
          {tHeader('signIn')}
        </Link>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-accent rounded-full px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {t('invitation.accept')}
      </button>
    </form>
  );
}
