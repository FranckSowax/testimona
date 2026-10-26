'use client';

import { useActionState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/Toast';
import { updateProfileAction, sendPasswordResetAction, type ProfileActionState } from './actions';
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
      <div className="border-border rounded-lg border bg-white p-6 shadow-sm">
        <AvatarUploader defaultUrl={defaultValues.avatarUrl} />
      </div>

      <form
        action={formAction}
        className="border-border space-y-5 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="email" className="text-foreground block text-sm font-medium">
            {t('emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            value={defaultValues.email}
            readOnly
            disabled
            className="border-border bg-muted text-muted-foreground mt-1 w-full cursor-not-allowed rounded-md border px-3 py-2.5 text-base sm:text-sm"
          />
          <p className="text-muted-foreground mt-1 text-xs">{t('emailHelp')}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="text-foreground block text-sm font-medium">
              {t('fullNameLabel')}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              maxLength={80}
              defaultValue={defaultValues.fullName}
              autoComplete="name"
              className="border-border focus:border-primary focus:ring-primary mt-1 w-full rounded-md border bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-1 sm:text-sm"
            />
            {state?.fieldErrors?.fullName && (
              <p className="text-destructive mt-1 text-xs">{state.fieldErrors.fullName}</p>
            )}
          </div>
          <div>
            <label htmlFor="nickname" className="text-foreground block text-sm font-medium">
              {t('nicknameLabel')}
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              maxLength={50}
              defaultValue={defaultValues.nickname}
              autoComplete="nickname"
              className="border-border focus:border-primary focus:ring-primary mt-1 w-full rounded-md border bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-1 sm:text-sm"
            />
            {state?.fieldErrors?.nickname && (
              <p className="text-destructive mt-1 text-xs">{state.fieldErrors.nickname}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? t('saving') : t('save')}
          </button>
        </div>
      </form>

      <section className="border-border rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="font-display text-foreground text-lg font-semibold">{t('passwordTitle')}</h2>
        <p className="text-muted-foreground mt-2 text-sm">{t('passwordDescription')}</p>
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={resetPending}
          className="border-foreground/80 text-foreground hover:border-primary hover:text-primary mt-4 rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {t('passwordReset')}
        </button>
      </section>

      <section className="border-border rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="font-display text-foreground text-lg font-semibold">{t('dangerTitle')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('signOutDesc')}</p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="border-foreground/70 text-foreground hover:border-primary hover:text-primary rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors"
          >
            {t('signOut')}
          </button>
        </form>
      </section>
    </div>
  );
}
