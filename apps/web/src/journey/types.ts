import { z } from 'zod';

/** Motif des clés de réponse, identique à la contrainte SQL de `journey_answer.key`. */
export const ANSWER_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

export const SHORT_TEXT_MAX = 200;
export const LONG_TEXT_MAX = 4000;
export const CITY_MAX = 120;
/** Marge sous la limite SQL de 65536 octets : `jsonb::text` ajoute des espaces. */
export const ANSWER_MAX_BYTES = 60_000;
export const MIN_YEAR = 1800;
/** Taille maximale d'un brouillon (corps d'annonce compris), sous la borne de 60 000 octets. */
export const DRAFT_MAX = 12_000;

export type ListField =
  | { name: string; kind: 'shortText' | 'longText'; required?: boolean }
  | { name: string; kind: 'choice'; options: readonly string[]; required?: boolean }
  | { name: string; kind: 'boolean' };

export type ListQuestion = {
  kind: 'list';
  key: string;
  fields: readonly ListField[];
  maxItems: number;
};
export type ChoiceQuestion = { kind: 'choice'; key: string; options: readonly string[] };
export type Question =
  | { kind: 'shortText' | 'longText' | 'date' | 'place'; key: string }
  | ChoiceQuestion
  | ListQuestion;

export type DraftKind = 'whatsapp' | 'email';

/** Brouillon rédigé à partir des réponses de l'étape, enregistré sous sa propre clé. */
export interface StepDraft {
  key: string;
  kind: DraftKind;
}

/** Une étape du parcours : `id` sert de segment d'URL (`/etape/<id>`). */
export interface Step {
  id: string;
  questions: readonly Question[];
  draft?: StepDraft;
}

export interface PlaceValue {
  city: string;
  countryCode: string;
}
export type ListItem = Record<string, string | boolean | undefined>;

/** Réponse « passée » : la prochaine question l'ignore, le tableau de bord la garde à compléter. */
export const SKIPPED = { skipped: true } as const;
const SkippedSchema = z.object({ skipped: z.literal(true) }).strict();

export function isSkipped(value: unknown): boolean {
  return SkippedSchema.safeParse(value).success;
}

// WHY: jsonb rejette le caractère NUL (erreur 22P05).
const noNul = (s: string) => !s.includes('\u0000');
/** Texte d'un brouillon enregistré : nettoyé, non vide, borné, sans caractère NUL. */
export const draftTextSchema = z
  .string()
  // WHY: un navigateur envoie les retours à la ligne d'un textarea en CRLF ; on stocke du LF
  // pour que la limite compte une seule unité par ligne.
  .transform((s) => s.replace(/\r\n?/g, '\n'))
  .pipe(
    z
      .string()
      .trim()
      .min(1, 'empty')
      .max(DRAFT_MAX, 'too long')
      .refine(noNul, 'invalid character')
      // WHY: les caractères de contrôle gonflent en `\u00XX` dans le JSON ; 12 000 caractères
      // peuvent dépasser la limite SQL, donc on mesure aussi la taille réelle.
      .refine(fitsAnswerSize, 'too large'),
  );
const requiredText = (max: number) =>
  z.string().trim().min(1).max(max).refine(noNul, 'invalid character');
// WHY: un champ facultatif laissé vide n'est pas enregistré, plutôt que stocké en chaîne vide.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(noNul, 'invalid character')
    .optional()
    .transform((v) => (v ? v : undefined));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const date = new Date(`${s}T00:00:00Z`);
    const year = Number(s.slice(0, 4));
    const maxYear = new Date().getUTCFullYear() + 1;
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === s &&
      year >= MIN_YEAR &&
      year <= maxYear
    );
  }, 'invalid date');

const oneOf = (options: readonly string[]) =>
  z.string().refine((v) => options.includes(v), 'invalid option');

// WHY: un choix facultatif vide vaut « absent », comme un texte facultatif vide.
const optionalChoice = (options: readonly string[]) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(oneOf(options).optional());

function fieldSchema(field: ListField): z.ZodTypeAny {
  switch (field.kind) {
    case 'shortText':
      return field.required ? requiredText(SHORT_TEXT_MAX) : optionalText(SHORT_TEXT_MAX);
    case 'longText':
      return field.required ? requiredText(LONG_TEXT_MAX) : optionalText(LONG_TEXT_MAX);
    case 'choice':
      return field.required ? oneOf(field.options) : optionalChoice(field.options);
    case 'boolean':
      return z.boolean().default(false);
  }
}

/** Schéma d'une vraie réponse à la question (« passée » exclue), taille bornée. */
export function answerSchema(question: Question): z.ZodTypeAny {
  return rawAnswerSchema(question).refine(fitsAnswerSize, 'too large');
}

/** Vrai si la valeur sérialisée en JSON tient dans `ANSWER_MAX_BYTES`. */
function fitsAnswerSize(v: unknown): boolean {
  return new TextEncoder().encode(JSON.stringify(v)).length <= ANSWER_MAX_BYTES;
}

function rawAnswerSchema(question: Question): z.ZodTypeAny {
  switch (question.kind) {
    case 'shortText':
      return requiredText(SHORT_TEXT_MAX);
    case 'longText':
      return requiredText(LONG_TEXT_MAX);
    case 'date':
      return isoDate;
    case 'choice':
      return oneOf(question.options);
    case 'place':
      return z
        .object({
          city: requiredText(CITY_MAX),
          countryCode: z
            .string()
            .transform((s) => s.trim().toUpperCase())
            .pipe(z.string().regex(/^[A-Z]{2}$/)),
        })
        .strict();
    case 'list':
      return z
        .array(
          z
            .object(Object.fromEntries(question.fields.map((f) => [f.name, fieldSchema(f)])))
            .strict(),
        )
        .min(1)
        .max(question.maxItems);
  }
}
