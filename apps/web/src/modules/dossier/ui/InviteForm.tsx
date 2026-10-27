'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createInvitationAction, type InviteState } from '../actions';
import { INVITABLE_ROLES } from '../schema';

interface Props {
  dossierId: string;
  personName: string;
  emailEnabled: boolean;
}

/**
 * Formulaire d'invitation d'un proche (lien à usage unique, e-mail facultatif).
 * @example <InviteForm dossierId={id} personName="Awa Diallo" emailEnabled={false} />
 */
export function InviteForm({ dossierId, personName, emailEnabled }: Props) {
  const t = useTranslations('dossier');
  const [state, formAction, pending] = useActionState<InviteState | null, FormData>(
    createInvitationAction,
    null,
  );
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
    } catch {
      setCopiedUrl(null);
    }
  };

  const field = 'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2';
  const emailError = state?.fieldErrors?.email;

  return (
    <div className="space-y-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="dossierId" value={dossierId} />
        <label className="space-y-1">
          <span className="text-muted-foreground text-sm">{t('members.inviteRole')}</span>
          <select name="role" defaultValue="contributor" className={field}>
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`members.roles.${r}`)}
              </option>
            ))}
          </select>
        </label>
        {emailEnabled ? (
          <label className="space-y-1">
            <span className="text-muted-foreground text-sm">{t('members.inviteEmail')}</span>
            <input
              name="email"
              type="email"
              autoComplete="off"
              aria-invalid={emailError ? true : undefined}
              className={field}
            />
          </label>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="submit"
          disabled={pending}
          className="bg-accent rounded-full px-5 py-2 font-semibold text-white disabled:opacity-60"
        >
          {t('members.inviteSubmit')}
        </button>
      </form>

      <div aria-live="polite">
        {state?.error && (
          <p role="alert" className="text-destructive text-sm">
            {t(`errors.${state.error}`)}
          </p>
        )}

        {state?.url && (
          <div className="bg-surface space-y-3 rounded-xl p-4">
            <p className="text-foreground text-sm">{t('members.inviteReady')}</p>
            {state.emailSent && (
              <p className="text-muted-foreground text-sm">{t('members.inviteEmailSent')}</p>
            )}
            <p className="text-foreground select-all break-all font-mono text-xs">{state.url}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => copy(state.url!)}
                className="border-border rounded-full border px-4 py-2 text-sm"
              >
                {t('members.copy')}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  t('members.whatsappText', { name: personName, url: state.url }),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary rounded-full px-4 py-2 text-sm font-semibold text-white"
              >
                {t('members.shareWhatsapp')}
              </a>
              <span role="status" className="text-muted-foreground text-sm">
                {copiedUrl === state.url ? t('members.copied') : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
