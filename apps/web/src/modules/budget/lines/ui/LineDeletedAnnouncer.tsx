'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

const OnDeleted = createContext<() => void>(() => {});

/** Délai entre le statut vidé et la nouvelle annonce. */
const ANNOUNCE_DELAY_MS = 100;

/**
 * Signale une suppression réussie à l'annonceur le plus proche.
 *
 * @example
 * const onDeleted = useOnLineDeleted();
 */
export function useOnLineDeleted(): () => void {
  return useContext(OnDeleted);
}

interface Props {
  /** Ancre de focus quand il reste des postes (légende du tableau, tabIndex={-1}). */
  focusId: string;
  /** Ancre de focus quand il n'y a plus de poste (message vide, tabIndex={-1}). */
  fallbackFocusId: string;
  /** Vrai quand le dossier n'a plus aucun poste. */
  empty: boolean;
  children: ReactNode;
}

/**
 * Zone stable autour des postes : après une suppression, annonce « Poste supprimé. » et déplace le
 * focus sur la légende du tableau, ou sur le message vide si le dernier poste a été supprimé.
 * WHY: monté au niveau de la page, autour du tableau, du message vide et des actions : supprimer
 * le dernier poste démonte le tableau, et une annonce placée dedans serait perdue avec lui.
 *
 * @example
 * <LineDeletedAnnouncer focusId="budget-lines-caption" fallbackFocusId="budget-lines-empty" empty={!hasLines}>
 *   {content}
 * </LineDeletedAnnouncer>
 */
export function LineDeletedAnnouncer({ focusId, fallbackFocusId, empty, children }: Props) {
  const t = useTranslations('lines.form');
  const [count, setCount] = useState(0);
  const [announced, setAnnounced] = useState(false);
  const pendingFocus = useRef(false);
  const onDeleted = useCallback(() => {
    pendingFocus.current = true;
    // WHY: vider le statut avant chaque annonce, pour qu'une deuxième suppression soit relue.
    setAnnounced(false);
    setCount((n) => n + 1);
  }, []);

  // WHY: le succès est signalé avant que la revalidation retire le poste. Quand le dernier poste
  // part ensuite, `empty` change et le focus passe de la légende (démontée) au message vide.
  useEffect(() => {
    if (!pendingFocus.current) return;
    document.getElementById(empty ? fallbackFocusId : focusId)?.focus();
    if (empty) pendingFocus.current = false;
  }, [count, empty, focusId, fallbackFocusId]);

  useEffect(() => {
    if (count === 0) return;
    const timer = setTimeout(() => setAnnounced(true), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <OnDeleted.Provider value={onDeleted}>
      {children}
      <p role="status" className="text-foreground text-sm">
        {announced ? t('deleted') : ''}
      </p>
    </OnDeleted.Provider>
  );
}
