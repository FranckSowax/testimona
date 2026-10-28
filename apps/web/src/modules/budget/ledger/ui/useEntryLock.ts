'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { LedgerFormState } from '../actions';
import type { LedgerError } from '../service';

/**
 * Formulaire figé après une dépense enregistrée sans son reçu : `unlinked` (le rattachement peut
 * être retenté) ou `final` (reçu inutilisable, ou saisie changée depuis un premier envoi).
 */
export type EntryLock = 'unlinked' | 'final' | null;

/**
 * Verrou après une réponse du serveur.
 * WHY: la dépense existe déjà ; modifier les champs puis renvoyer la même clé serait refusé
 * (`changed_since_saved`). Une autre erreur pendant un nouvel essai garde le verrou.
 *
 * @example
 * lockAfter('receipt_unlinked', null); // 'unlinked'
 */
export function lockAfter(error: LedgerError | undefined, current: EntryLock): EntryLock {
  if (error === 'receipt_unlinked') return 'unlinked';
  if (error === 'receipt_unavailable' || error === 'changed_since_saved') return 'final';
  return current;
}

/**
 * Verrou du formulaire de dépense avec reçu, focus compris : le focus va à la première action
 * quand le formulaire se fige, puis au premier champ quand il se libère.
 *
 * @example
 * const { lock, actionRef, release, visibleState } = useEntryLock(formRef, state, true);
 */
export function useEntryLock(
  formRef: RefObject<HTMLFormElement | null>,
  state: LedgerFormState | null,
  enabled: boolean,
) {
  const [lock, setLock] = useState<EntryLock>(null);
  // Réponse écartée par « Continuer sans le reçu » : son message n'est plus affiché.
  const [dismissed, setDismissed] = useState<LedgerFormState | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const previous = useRef<EntryLock>(null);

  useEffect(() => {
    if (!enabled || !state) return;
    setLock((current) => (state.ok ? null : lockAfter(state.error, current)));
  }, [state, enabled]);

  useEffect(() => {
    if (lock && !previous.current) actionRef.current?.focus();
    if (!lock && previous.current) {
      formRef.current?.querySelector<HTMLElement>('[name="partyName"]')?.focus();
    }
    previous.current = lock;
  }, [lock, formRef]);

  const release = useCallback(() => {
    setDismissed(state);
    setLock(null);
  }, [state]);

  const visibleState = state && state !== dismissed ? state : null;
  return { lock, actionRef, release, visibleState };
}
