'use client';

import { useActionState, useEffect, useRef } from 'react';
import { submitTestimonialAction, type TestimonialActionState } from '../actions';

export function TestimonialForm({
  memorialId,
  slug,
  defaultAuthorName,
  language = 'fr',
}: {
  memorialId: string;
  slug: string;
  defaultAuthorName?: string;
  language?: string;
}) {
  const [state, formAction, isPending] = useActionState<TestimonialActionState | null, FormData>(
    submitTestimonialAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-6 space-y-4 rounded-md border border-border p-4"
    >
      <input type="hidden" name="memorialId" value={memorialId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="language" value={language} />

      <div>
        <label htmlFor="authorName" className="block text-sm font-medium">
          Votre nom
        </label>
        <input
          id="authorName"
          name="authorName"
          type="text"
          required
          maxLength={80}
          defaultValue={defaultAuthorName}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {state?.fieldErrors?.authorName && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.authorName}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Votre témoignage
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={4000}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {state?.fieldErrors?.message && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.message}</p>
        )}
      </div>

      {state?.error && state.error !== 'Validation' && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p
          role="status"
          className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          Merci, votre témoignage a été publié.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Envoi...' : 'Publier mon témoignage'}
      </button>
    </form>
  );
}
