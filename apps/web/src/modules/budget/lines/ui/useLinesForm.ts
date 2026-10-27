'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { LinesFormState } from '../actions';

type Action = (prev: LinesFormState | null, formData: FormData) => Promise<LinesFormState>;

/**
 * État commun des formulaires de postes : envoi par onSubmit, statut « enregistré » effacé à la
 * saisie suivante, focus sur le premier champ en erreur.
 * WHY: onSubmit plutôt que `<form action>` : React 19 vide le formulaire après chaque action,
 * même en erreur, et la personne perdrait sa saisie.
 *
 * @example
 * const { state, pending, saved, onSubmit, clearSaved, formRef } = useLinesForm(addLineAction, true);
 */
export function useLinesForm(action: Action, resetOnSuccess = false) {
  const [state, formAction, pending] = useActionState<LinesFormState | null, FormData>(
    action,
    null,
  );
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      setSaved(true);
    } else if (state?.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state, resetOnSuccess]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return { state, pending, saved, onSubmit, clearSaved: () => setSaved(false), formRef };
}
