'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  inviteCoOwnerAction,
  type MemberActionState,
} from '../_actions/members';

export function InviteCoOwnerForm({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const t = useTranslations('memorial.membersSection');
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<MemberActionState | null, FormData>(
    inviteCoOwnerAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="memorialId" value={memorialId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="min-w-0 flex-1">
        <input
          name="email"
          type="email"
          required
          placeholder={t('emailPlaceholder')}
          className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        {state?.fieldErrors?.email && (
          <p className="mt-1 text-xs text-destructive">{state.fieldErrors.email}</p>
        )}
        {state?.error && state.error !== 'Validation' && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="mt-1 text-xs font-bold text-emerald-600">{t('inviteSent')}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-10 shrink-0 rounded-md bg-primary px-4 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t('sending') : t('invite')}
      </button>
    </form>
  );
}
