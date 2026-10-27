'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Nouvelle clé d'idempotence (UUID v4).
 * WHY: `crypto.randomUUID` manque sur d'anciennes WebViews Android (courantes au Gabon) et hors
 * contexte sécurisé (HTTP simple) ; on construit alors un UUID v4 depuis `getRandomValues`.
 *
 * @example
 * newIdempotencyKey(); // « 3b1f8c2e-7d4a-4f0b-9c6e-2a5d8e1f4b7c »
 */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Clé d'idempotence d'un formulaire : la même tant que l'envoi n'a pas réussi, renouvelée
 * ensuite par `renew()`. WHY: un double clic ou un réseau lent renvoie la même clé, la base
 * n'écrit qu'une fois.
 *
 * La clé vaut `''` jusqu'au montage : l'appelant désactive l'envoi tant qu'elle est vide.
 * WHY: la générer pendant le rendu donnerait une valeur différente côté serveur et côté
 * navigateur (erreur d'hydratation) ; l'effet ne s'exécute que dans le navigateur.
 */
export function useIdempotencyKey(): [string, () => void] {
  const [key, setKey] = useState('');
  useEffect(() => setKey(newIdempotencyKey()), []);
  const renew = useCallback(() => setKey(newIdempotencyKey()), []);
  return [key, renew];
}
