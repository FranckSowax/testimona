'use client';

import { useActionState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/Toast';
import {
  updateProfileAction,
  sendPasswordResetAction,
  type ProfileActionState,
} from './actions';
import { AvatarUploader } from './AvatarUploader';

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: {
    fullName: string;
    nickname: string;
    email: string;
    avatarUrl: string | null;
  };
}) {
  const t = useTranslations('dashboard.profile');
  const toast = useToast();
  const [state, formAction, isPending] = useActionState<ProfileActionState | null, FormData>(
    updateProfileAction,
    null,
  );
  const [resetPending, startResetTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) toast.success(t('saved'));
    else if (state?.error && state.error !== 'Validation') toast.error(state.error);
  }, [state, toast, t]);

  function handleResetPassword() {
    startResetTransition(async () => {
      const res = await sendPasswordResetAction();
      if (res.error) toast.error(res.error);
      else toast.success(t('passwordSent'));
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <AvatarUploader defaultUrl={defaultValues.avatarUrl} />
      </div>

      <form
        action={formAction}
        className="space-y-5 rounded-lg border border-border bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            {t('emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            value={defaultValues.email}
            readOnly
            disabled
            className="mt-1 w-full cursor-not-allowed rounded-md border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('emailHelp')}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
              {t('fullNameLabel')}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              maxLength={80}
              defaultValue={defaultValues.fullName}
              autoComplete="name"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {state?.fieldErrors?.fullName && (
              <p className="mt-1 text-xs text-destructive">{state.fieldErrors.fullName}</p>
            )}
          </div>
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-foreground">
              {t('nicknameLabel')}
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              maxLength={50}
              defaultValue={defaultValues.nickname}
              autoComplete="nickname"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {state?.fieldErrors?.nickname && (
              <p className="mt-1 text-xs text-destructive">{state.fieldErrors.nickname}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? t('saving') : t('save')}
          </button>
        </div>
      </form>

      <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t('passwordTitle')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('passwordDescription')}</p>
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={resetPending}
          className="mt-4 rounded-md border-2 border-foreground/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {t('passwordReset')}
        </button>
      </section>

      <section className="rounded-lg border border-destructive/30 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-destructive">{t('dangerTitle')}</h2>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="rounded-md border-2 border-destructive/60 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
          >
            {t('signOut')}
          </button>
        </form>
      </section>
    </div>
  );
}
