'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

const OnDeleted = createContext<() => void>(() => {});

/**
 * Signale une suppression réussie à l'annonceur le plus proche.
 *
 * @example
 * const onDeleted = useOnLineDeleted();
 */
export function useOnLineDeleted(): () => void {
  return useContext(OnDeleted);
}

/**
 * Zone stable autour des postes : après une suppression, annonce « Poste supprimé. » et déplace le
 * focus sur l'élément `focusId` (focusable avec tabIndex={-1}).
 * WHY: le poste supprimé disparaît avec son bouton ; sans point d'ancrage stable, le focus
 * tomberait sur `body` et l'annonce serait démontée avant d'être lue.
 *
 * @example
 * <LineDeletedAnnouncer focusId="budget-lines-caption">{table}</LineDeletedAnnouncer>
 */
export function LineDeletedAnnouncer({
  focusId,
  children,
}: {
  focusId: string;
  children: ReactNode;
}) {
  const t = useTranslations('lines.form');
  const [count, setCount] = useState(0);
  const onDeleted = useCallback(() => setCount((n) => n + 1), []);

  // WHY: après le rendu, quand le poste supprimé a quitté le tableau.
  useEffect(() => {
    if (count > 0) document.getElementById(focusId)?.focus();
  }, [count, focusId]);

  return (
    <OnDeleted.Provider value={onDeleted}>
      {children}
      <p role="status" className="text-foreground text-sm">
        {count > 0 ? t('deleted') : ''}
      </p>
    </OnDeleted.Provider>
  );
}
