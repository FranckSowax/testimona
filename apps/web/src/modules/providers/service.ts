import 'server-only';
import { z } from 'zod';
import { isPlatformAdmin } from '@/lib/auth/platform-admin';
import { fieldErrors } from '@/modules/dossier/service';
import type { ProviderCategory } from './categories';
import { type PanelGroup, panelGroups } from './panel';
import * as repo from './repo';
import {
  type Provider,
  ProviderFiltersSchema,
  ProviderSchema,
  ProviderUpdateSchema,
} from './schema';

export type ProvidersError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'unknown';

export type ProvidersResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProvidersError; fieldErrors?: Record<string, string> };

// WHY: pas de 23503 (clé étrangère) : une catégorie absente en base trahit un décalage entre le
// code et la base ; elle doit devenir `unknown` et être journalisée.
const CODES: Record<string, ProvidersError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
  '22P02': 'validation',
  no_rows: 'not_found',
};

const FORBIDDEN = { ok: false as const, error: 'forbidden' as const };
const NOT_FOUND = { ok: false as const, error: 'not_found' as const };

function fromRepo(error: { code: string }, scope: string): { ok: false; error: ProvidersError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[providers] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

const invalid = (error: z.ZodError) => ({
  ok: false as const,
  error: 'validation' as const,
  fieldErrors: fieldErrors(error.issues),
});

/**
 * Date de vérification à écrire.
 * WHY: une case restée cochée garde la date d'origine ; cochée maintenant, elle prend la date
 * du jour ; décochée, la vérification disparaît.
 */
function verifiedAtFor(verified: boolean, previous: string | null): string | null {
  if (!verified) return null;
  return previous ?? new Date().toISOString();
}

/**
 * Prestataires de l'écran admin, filtrés par ville et catégorie.
 *
 * @example
 * const res = await listProviders({ city: 'Libreville' });
 */
export async function listProviders(raw: unknown): Promise<ProvidersResult<Provider[]>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  const filters = ProviderFiltersSchema.safeParse(raw);
  if (!filters.success) return invalid(filters.error);
  const res = await repo.listProviders(filters.data);
  return res.error ? fromRepo(res.error, 'listProviders') : { ok: true, data: res.data };
}

/** Un prestataire pour l'écran de modification. */
export async function getProvider(id: string): Promise<ProvidersResult<Provider>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  if (!z.string().uuid().safeParse(id).success) return NOT_FOUND;
  const res = await repo.getProvider(id);
  return res.error ? fromRepo(res.error, 'getProvider') : { ok: true, data: res.data };
}

/** Crée un prestataire. */
export async function createProvider(raw: unknown): Promise<ProvidersResult<{ id: string }>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  const parsed = ProviderSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const { verified, ...fields } = parsed.data;
  const res = await repo.insertProvider({ ...fields, verifiedAt: verifiedAtFor(verified, null) });
  return res.error ? fromRepo(res.error, 'createProvider') : { ok: true, data: res.data };
}

/**
 * Modifie un prestataire existant.
 * WHY: la lecture (date de vérification) puis l'écriture ne sont pas atomiques ; la dernière
 * écriture gagne, acceptable pour un back-office à très peu d'administrateurs.
 */
export async function updateProvider(raw: unknown): Promise<ProvidersResult<true>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  const parsed = ProviderUpdateSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const { providerId, verified, ...fields } = parsed.data;
  const current = await repo.getProvider(providerId);
  if (current.error) return fromRepo(current.error, 'updateProvider.read');
  const res = await repo.updateProvider(providerId, {
    ...fields,
    verifiedAt: verifiedAtFor(verified, current.data.verifiedAt),
  });
  return res.error ? fromRepo(res.error, 'updateProvider') : { ok: true, data: true };
}

/**
 * Encadré prestataires d'une étape, pour tout utilisateur connecté (la RLS filtre).
 *
 * @example
 * const res = await providersForPanel(['tentsChairs', 'sound'], 'Libreville');
 */
export async function providersForPanel(
  categories: readonly ProviderCategory[],
  city: string,
): Promise<ProvidersResult<PanelGroup[]>> {
  const res = await repo.listPanelProviders(categories);
  if (res.error) return fromRepo(res.error, 'providersForPanel');
  return { ok: true, data: panelGroups(res.data, categories, city) };
}
