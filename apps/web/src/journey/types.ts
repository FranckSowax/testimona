import { z } from 'zod';

/** Motif des clés de réponse, identique à la contrainte SQL de `journey_answer.key`. */
export const ANSWER_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

export const SHORT_TEXT_MAX = 200;
export const LONG_TEXT_MAX = 4000;
export const CITY_MAX = 120;

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

/** Une étape du parcours : `id` sert de segment d'URL (`/etape/<id>`). */
export interface Step {
  id: string;
  questions: readonly Question[];
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

const requiredText = (max: number) => z.string().trim().min(1).max(max);
// WHY: un champ facultatif laissé vide n'est pas enregistré, plutôt que stocké en chaîne vide.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const date = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === s;
  }, 'invalid date');

const oneOf = (options: readonly string[]) =>
  z.string().refine((v) => options.includes(v), 'invalid option');

function fieldSchema(field: ListField): z.ZodTypeAny {
  switch (field.kind) {
    case 'shortText':
      return field.required ? requiredText(SHORT_TEXT_MAX) : optionalText(SHORT_TEXT_MAX);
    case 'longText':
      return field.required ? requiredText(LONG_TEXT_MAX) : optionalText(LONG_TEXT_MAX);
    case 'choice':
      return field.required ? oneOf(field.options) : oneOf(field.options).optional();
    case 'boolean':
      return z.boolean().default(false);
  }
}

/** Schéma d'une vraie réponse à la question (« passée » exclue). */
export function answerSchema(question: Question): z.ZodTypeAny {
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
