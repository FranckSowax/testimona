'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { inviteCoOwnerAction, type MemberActionState } from '../_actions/members';

export function InviteCoOwnerForm({ memorialId, slug }: { memorialId: string; slug: string }) {
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
          className="border-border text-foreground focus:border-primary h-10 w-full rounded-md border bg-white px-3 text-sm focus:outline-none"
        />
        {state?.fieldErrors?.email && (
          <p className="text-destructive mt-1 text-xs">{state.fieldErrors.email}</p>
        )}
        {state?.error && state.error !== 'Validation' && (
          <p role="alert" className="text-destructive mt-1 text-xs">
            {state.error}
          </p>
        )}
        {state?.ok && <p className="mt-1 text-xs font-bold text-emerald-600">{t('inviteSent')}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-primary font-display text-primary-foreground h-10 shrink-0 rounded-md px-4 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t('sending') : t('invite')}
      </button>
    </form>
  );
}
