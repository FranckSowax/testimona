'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Bouton de soumission désactivé pendant l'envoi du formulaire parent.
 * @example <RevokeButton label="Révoquer" hiddenLabel="Contributeur, expire le 3 nov." />
 */
export function RevokeButton({ label, hiddenLabel }: { label: ReactNode; hiddenLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-destructive text-sm font-semibold disabled:opacity-60"
    >
      {label}
      <span className="sr-only"> ({hiddenLabel})</span>
    </button>
  );
}
