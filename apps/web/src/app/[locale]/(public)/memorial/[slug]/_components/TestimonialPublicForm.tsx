'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { submitTestimonialAction, type TestimonialActionState } from '../actions';

interface Props {
  memorialId: string;
  slug: string;
  memorialName: string;
  /** Account required to post (recette T7). */
  isLoggedIn: boolean;
  /** When the user is logged-in we pre-fill name from their profile. */
  prefill?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
}

/**
 * Open-to-anyone testimonial form. Logged-in users get their name and
 * email pre-filled (still editable), anonymous visitors fill the form
 * from scratch. Everyone except the memorial owner lands in
 * status='pending' and waits for owner moderation.
 */
export function TestimonialPublicForm({
  memorialId,
  slug,
  memorialName,
  isLoggedIn,
  prefill,
}: Props) {
  const t = useTranslations('memorial.testimonialForm');
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<TestimonialActionState | null, FormData>(
    submitTestimonialAction,
    null,
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      // Give the user a beat to read the success message, then close
      // and refresh so any auto-approved (owner) entries show up.
      const t = setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  // Recette T7 — un compte est requis pour témoigner.
  if (!isLoggedIn) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2">
        <a
          href={`/login?next=/memorial/${slug}`}
          className="press-scale bg-primary font-display text-primary-foreground rounded-md px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
        >
          {t('signinCta')}
        </a>
        <p className="text-muted-foreground text-xs">{t('signinHelp')}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press-scale bg-primary font-display text-primary-foreground rounded-md px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
        >
          {t('leaveCta')}
        </button>
        <p className="text-muted-foreground text-xs">{t('leaveHelp')}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-border mt-8 space-y-4 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <input type="hidden" name="memorialId" value={memorialId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="language" value="fr" />

      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
            {t('forMemorial', { name: memorialName })}
          </p>
          <h3 className="font-display text-foreground text-lg font-bold">{t('shareMemory')}</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t('close')}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-full"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
            {t('firstname')}
          </span>
          <input
            name="authorFirstname"
            type="text"
            required
            maxLength={60}
            defaultValue={prefill?.firstname ?? ''}
            placeholder="Marie"
            className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
          />
          {state?.fieldErrors?.authorFirstname && (
            <p className="text-destructive mt-1 text-xs">{state.fieldErrors.authorFirstname}</p>
          )}
        </label>
        <label className="block">
          <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
            {t('lastname')}
          </span>
          <input
            name="authorName"
            type="text"
            required
            maxLength={80}
            defaultValue={prefill?.lastname ?? ''}
            placeholder="Dupont"
            className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
          />
          {state?.fieldErrors?.authorName && (
            <p className="text-destructive mt-1 text-xs">{state.fieldErrors.authorName}</p>
          )}
        </label>
      </div>

      <label className="block">
        <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
          {t('relationshipLabel')}{' '}
          <span className="text-foreground/60 font-normal">{t('relationshipHint')}</span>
        </span>
        <input
          name="authorRelationship"
          type="text"
          maxLength={60}
          placeholder={t('relationshipPlaceholder')}
          className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
        />
      </label>

      <label className="block">
        <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
          {t('emailLabel')} <span className="text-foreground/60 font-normal">{t('emailHint')}</span>
        </span>
        <input
          name="authorEmail"
          type="email"
          maxLength={200}
          defaultValue={prefill?.email ?? ''}
          placeholder="marie@exemple.fr"
          className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
        />
        {state?.fieldErrors?.authorEmail && (
          <p className="text-destructive mt-1 text-xs">{state.fieldErrors.authorEmail}</p>
        )}
      </label>

      <label className="block">
        <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
          {t('messageLabel')}
        </span>
        <textarea
          name="message"
          required
          rows={5}
          minLength={10}
          maxLength={2000}
          placeholder={t('messagePlaceholder')}
          className="border-border text-foreground focus:border-primary mt-1 w-full rounded-md border bg-white px-3 py-2.5 text-base focus:outline-none sm:text-sm"
        />
        {state?.fieldErrors?.message && (
          <p className="text-destructive mt-1 text-xs">{state.fieldErrors.message}</p>
        )}
      </label>

      {state?.error && state.error !== 'Validation' && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
          {t('successMessage')}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-[11px] italic">{t('moderationNote')}</p>
        <button
          type="submit"
          disabled={isPending}
          className="press-scale bg-primary font-display text-primary-foreground rounded-md px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t('sending') : t('publish')}
        </button>
      </div>
    </form>
  );
}
