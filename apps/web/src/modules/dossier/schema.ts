import { z } from 'zod';

export const DOSSIER_ROLES = [
  'owner',
  'coordinator',
  'treasurer',
  'contributor',
  'viewer',
] as const;
export type DossierRole = (typeof DOSSIER_ROLES)[number];

/** Rôles proposés dans une invitation : jamais propriétaire. */
export const INVITABLE_ROLES = ['coordinator', 'treasurer', 'contributor', 'viewer'] as const;

export type EntryPoint = 'death' | 'prepare' | 'after';

/** Portes ouvertes au lot 1 (« après les funérailles » arrive au lot 4). */
export const OPEN_ENTRY_POINTS = ['death', 'prepare'] as const;

export const RELATIONSHIPS = [
  'child',
  'spouse',
  'parent',
  'sibling',
  'grandchild',
  'friend',
  'other',
] as const;

/**
 * Pays proposés dans l'interface (Afrique centrale et de l'Ouest proche, diaspora), rien de plus :
 * le serveur accepte tout code ISO à deux lettres, comme la base.
 */
export const COUNTRY_CODES = [
  'GA',
  'CM',
  'CG',
  'CD',
  'GQ',
  'TD',
  'CF',
  'SN',
  'CI',
  'BJ',
  'TG',
  'FR',
  'BE',
  'CH',
  'CA',
  'US',
  'GB',
  'DE',
] as const;

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const CreateDossierInputSchema = z.object({
  entryPoint: z.enum(OPEN_ENTRY_POINTS),
  firstName: trimmed(120),
  lastName: trimmed(120),
  countryCode: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/)),
  city: trimmed(120),
  relationship: z.enum(RELATIONSHIPS),
});
export type CreateDossierInput = z.infer<typeof CreateDossierInputSchema>;

export const CreateInvitationInputSchema = z.object({
  dossierId: z.string().uuid(),
  role: z.enum(INVITABLE_ROLES),
  email: z
    .string()
    .trim()
    .pipe(z.union([z.literal(''), z.string().email().max(254)]))
    .optional()
    .transform((v) => v || undefined),
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationInputSchema>;

/** Paramètre `?porte=` de l'URL vers une porte d'entrée (décès par défaut). */
export function parseEntryPoint(
  porte: string | string[] | undefined,
): (typeof OPEN_ENTRY_POINTS)[number] {
  const value = Array.isArray(porte) ? porte[0] : porte;
  return value === 'preparer' ? 'prepare' : 'death';
}
