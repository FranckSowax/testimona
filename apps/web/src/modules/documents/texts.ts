import { z } from 'zod';

/**
 * Clés de réponse (`journey_answer`) des trois textes du livret et de l'affiche.
 * WHY: ces textes ne sont pas des questions du moteur de parcours ; ils sont relus et enregistrés
 * depuis la synthèse de l'étape 3.5 (voir `texts-service.ts`).
 */
export const DOCUMENT_TEXTS = {
  cover: 'documents.booklet.cover',
  tribute: 'documents.booklet.tribute',
  thanks: 'documents.booklet.thanks',
} as const;

/** Type de texte du livret : phrase de couverture, hommage ou remerciements. */
export type DocumentTextKind = keyof typeof DOCUMENT_TEXTS;

/** Types de texte, dans l'ordre du livret. */
export const DOCUMENT_TEXT_KINDS = [
  'cover',
  'tribute',
  'thanks',
] as const satisfies readonly DocumentTextKind[];

/**
 * Longueur maximale de chaque texte, en caractères.
 * WHY: les gabarits PDF ont une mise en page fixe ; l'hommage (environ 150 mots) doit tenir sur
 * une page A5, la phrase de couverture sous la photo, les remerciements en quatrième de couverture.
 */
export const DOCUMENT_TEXT_MAX: Record<DocumentTextKind, number> = {
  cover: 200,
  tribute: 1500,
  thanks: 600,
};

const noNul = (s: string) => !s.includes('\u0000');

/**
 * Schéma d'un texte du livret : même nettoyage que `draftTextSchema` (CRLF en LF, espaces de
 * bord retirés, pas de NUL, non vide), avec la limite propre au type.
 *
 * @example
 * documentTextSchema('cover').parse('  Merci pour tout  '); // 'Merci pour tout'
 */
export function documentTextSchema(kind: DocumentTextKind) {
  // WHY: pas de `fitsAnswerSize` : 1 500 caractères restent très loin des 60 ko d'une réponse.
  return (
    z
      .string()
      // WHY: un textarea envoie des CRLF ; on stocke du LF pour qu'une ligne compte un caractère.
      .transform((s) => s.replace(/\r\n?/g, '\n'))
      .pipe(
        z
          .string()
          .trim()
          .min(1, 'empty')
          .max(DOCUMENT_TEXT_MAX[kind], 'too long')
          .refine(noNul, 'invalid character'),
      )
  );
}

/**
 * Textes enregistrés du livret, chacun valide ou `null` (absent, passé ou hors limites).
 *
 * @example
 * const { cover, tribute, thanks } = readDocumentTexts(answers);
 */
export function readDocumentTexts(
  answers: Record<string, unknown>,
): Record<DocumentTextKind, string | null> {
  const read = (kind: DocumentTextKind) => {
    const parsed = documentTextSchema(kind).safeParse(answers[DOCUMENT_TEXTS[kind]]);
    return parsed.success ? parsed.data : null;
  };
  return { cover: read('cover'), tribute: read('tribute'), thanks: read('thanks') };
}
