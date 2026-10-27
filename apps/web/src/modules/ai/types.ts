/**
 * Erreurs de l'amélioration par l'IA. `unavailable`, `quota` et `failed` ont un message dédié ;
 * les autres reprennent les messages d'erreur du dossier.
 */
export type AiError =
  | 'unavailable'
  | 'quota'
  | 'failed'
  | 'validation'
  | 'not_found'
  | 'forbidden'
  | 'unauthenticated';

export type AiResult = { ok: true; text: string } | { ok: false; error: AiError };
