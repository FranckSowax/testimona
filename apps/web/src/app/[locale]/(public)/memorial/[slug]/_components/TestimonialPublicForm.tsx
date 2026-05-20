'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  submitTestimonialAction,
  type TestimonialActionState,
} from '../actions';

interface Props {
  memorialId: string;
  slug: string;
  memorialName: string;
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
  prefill,
}: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    TestimonialActionState | null,
    FormData
  >(submitTestimonialAction, null);
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

  if (!open) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press-scale rounded-md bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Laisser un témoignage
        </button>
        <p className="text-xs text-muted-foreground">
          Pas besoin de compte — laissez votre prénom et votre nom. Votre
          message sera publié après validation par la famille.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-8 space-y-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <input type="hidden" name="memorialId" value={memorialId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="language" value="fr" />

      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Témoignage pour {memorialName}
          </p>
          <h3 className="font-display text-lg font-bold text-foreground">
            Partager un souvenir
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Prénom *
          </span>
          <input
            name="authorFirstname"
            type="text"
            required
            maxLength={60}
            defaultValue={prefill?.firstname ?? ''}
            placeholder="Marie"
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
          />
          {state?.fieldErrors?.authorFirstname && (
            <p className="mt-1 text-xs text-destructive">
              {state.fieldErrors.authorFirstname}
            </p>
          )}
        </label>
        <label className="block">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nom *
          </span>
          <input
            name="authorName"
            type="text"
            required
            maxLength={80}
            defaultValue={prefill?.lastname ?? ''}
            placeholder="Dupont"
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
          />
          {state?.fieldErrors?.authorName && (
            <p className="mt-1 text-xs text-destructive">
              {state.fieldErrors.authorName}
            </p>
          )}
        </label>
      </div>

      <label className="block">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Email <span className="font-normal text-foreground/60">(optionnel — pour vous notifier)</span>
        </span>
        <input
          name="authorEmail"
          type="email"
          maxLength={200}
          defaultValue={prefill?.email ?? ''}
          placeholder="marie@exemple.fr"
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
        />
        {state?.fieldErrors?.authorEmail && (
          <p className="mt-1 text-xs text-destructive">
            {state.fieldErrors.authorEmail}
          </p>
        )}
      </label>

      <label className="block">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Votre message *
        </span>
        <textarea
          name="message"
          required
          rows={5}
          minLength={10}
          maxLength={2000}
          placeholder="Un souvenir, une anecdote, un message d'hommage…"
          className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
        />
        {state?.fieldErrors?.message && (
          <p className="mt-1 text-xs text-destructive">
            {state.fieldErrors.message}
          </p>
        )}
      </label>

      {state?.error && state.error !== 'Validation' && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
          Merci ! Votre témoignage a été envoyé. Il apparaîtra après
          validation par la famille.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] italic text-muted-foreground">
          Tous les témoignages sont relus avant publication.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="press-scale rounded-md bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Envoi…' : 'Publier'}
        </button>
      </div>
    </form>
  );
}
