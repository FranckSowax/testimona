'use client';

import { useCallback, useState } from 'react';

/**
 * Clé d'idempotence d'un formulaire : la même tant que l'envoi n'a pas réussi, renouvelée
 * ensuite. WHY: un double clic ou un réseau lent renvoie la même clé, la base n'écrit qu'une fois.
 */
export function useIdempotencyKey(): [string, () => void] {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const renew = useCallback(() => setKey(crypto.randomUUID()), []);
  return [key, renew];
}
