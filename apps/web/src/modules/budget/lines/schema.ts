import { z } from 'zod';
import { LEVELS } from '@/journey/options';
import { AMOUNT_MAX } from '../scenarios';

const uuid = z.string().uuid();
// WHY: text refuse le caractère NUL ; on le refuse avant la base.
const noNul = (s: string) => !s.includes('\u0000');
// WHY: compter en caractères comme char_length en base, pas en unités UTF-16.
const maxChars = (n: number) => (s: string) => [...s].length <= n;

// WHY: un montant se saisit souvent avec des espaces (« 200 000 ») ; on ne retire que ceux-là.
// Un montant de poste peut valoir zéro (poste non retenu à ce niveau).
const levelAmount = z
  .string()
  .transform((s) => s.replace(/[\s\u00a0\u202f]/g, ''))
  .pipe(z.string().regex(/^\d+$/, 'invalid number'))
  .transform(Number)
  .pipe(
    z
      .number()
      .min(0, 'out of range')
      .max(AMOUNT_MAX, 'out of range')
      .refine(Number.isSafeInteger, 'out of range'),
  );

const label = z
  .string()
  .trim()
  .min(1, 'required')
  .refine(maxChars(120), 'too long')
  .refine(noNul, 'invalid character');

/** Nouveau poste libre : libellé et montant par niveau. */
export const NewLineSchema = z.object({
  dossierId: uuid,
  label,
  sober: levelAmount,
  intermediate: levelAmount,
  full: levelAmount,
});

/** Modification d'un poste existant. */
export const LineSchema = NewLineSchema.extend({ lineId: uuid });

/** Désignation d'un poste (suppression). */
export const LineRefSchema = z.object({ dossierId: uuid, lineId: uuid });

/** Désignation d'un dossier (création et recalcul des postes). */
export const DossierRefSchema = z.object({ dossierId: uuid });

/** Scénario retenu ; une chaîne vide efface le choix. */
export const ScenarioSchema = z.object({
  dossierId: uuid,
  scenario: z.union([z.enum(LEVELS), z.literal('')]).transform((v) => (v === '' ? null : v)),
});
