import type { DocumentTextKind } from '@/modules/documents/texts';

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

/** Les trois textes du livret proposés par l'IA, à relire par la famille avant enregistrement. */
export type DocumentTexts = Record<DocumentTextKind, string>;

export type DocumentTextsResult =
  | { ok: true; texts: DocumentTexts }
  | { ok: false; error: AiError };
