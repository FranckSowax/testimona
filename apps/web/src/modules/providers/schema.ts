import { z } from 'zod';
import { PROVIDER_CATEGORIES, type ProviderCategory } from './categories';

// WHY: text refuse le caractère NUL ; on le refuse avant la base.
const noNul = (s: string) => !s.includes('\u0000');
// WHY: compter en caractères comme char_length en base, pas en unités UTF-16.
const maxChars = (n: number) => (s: string) => [...s].length <= n;
/** Même motif que la contrainte de `provider.whatsapp`. */
const PHONE = /^\+[1-9][0-9]{7,14}$/;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'required')
    .refine(maxChars(max), 'too long')
    .refine(noNul, 'invalid character');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .transform((s) => (s === '' ? null : s))
    .pipe(
      z.union([
        z.null(),
        z.string().refine(maxChars(max), 'too long').refine(noNul, 'invalid character'),
      ]),
    );

// WHY: un numéro se saisit avec des espaces, tirets, points ou parenthèses ; on ne garde que
// l'indicatif et les chiffres. Le « (0) » national (« +241 (0)77… ») est retiré d'abord.
const whatsapp = z
  .string()
  .transform((s) => s.replace(/\(0\)/g, '').replace(/[\s().-]/g, ''))
  .transform((s) => (s === '' ? null : s))
  .pipe(z.union([z.null(), z.string().regex(PHONE, 'invalid phone')]));

const fields = z.object({
  categoryKey: z.enum(PROVIDER_CATEGORIES),
  name: text(120),
  city: text(120),
  district: optionalText(120),
  whatsapp,
  priceNote: optionalText(200),
  isExample: z.boolean(),
  verified: z.boolean(),
  active: z.boolean(),
});

/** WHY: miroir de la contrainte `provider_example_unreachable`, pour un message lisible. */
function exampleUnreachable(p: z.infer<typeof fields>, ctx: z.RefinementCtx) {
  if (p.isExample && (p.whatsapp !== null || p.verified)) {
    ctx.addIssue({ code: 'custom', path: ['isExample'], message: 'example with contact' });
  }
}

/** Nouveau prestataire saisi par l'équipe Testimona. */
export const ProviderSchema = fields.superRefine(exampleUnreachable);

/** Modification d'un prestataire existant. */
export const ProviderUpdateSchema = fields
  .extend({ providerId: z.string().uuid() })
  .superRefine(exampleUnreachable);

export type ProviderInput = z.infer<typeof ProviderSchema>;

/** Filtres de la liste admin ; une valeur vide ou inconnue est ignorée. */
export const ProviderFiltersSchema = z.object({
  // WHY: comme `category`, une ville invalide (trop longue, NUL, non textuelle) est ignorée.
  city: z
    .string()
    .trim()
    .refine(maxChars(120))
    .refine(noNul)
    .optional()
    .catch(undefined)
    .transform((v) => v || undefined),
  category: z.enum(PROVIDER_CATEGORIES).optional().catch(undefined),
});

export type ProviderFilters = z.infer<typeof ProviderFiltersSchema>;

/** Prestataire lu en base. */
export interface Provider {
  id: string;
  categoryKey: ProviderCategory;
  name: string;
  city: string;
  district: string | null;
  whatsapp: string | null;
  priceNote: string | null;
  isExample: boolean;
  verifiedAt: string | null;
  active: boolean;
}
