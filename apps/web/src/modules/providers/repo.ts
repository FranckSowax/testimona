import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import type { ProviderCategory } from './categories';
import type { PanelProvider, Provider, ProviderInput } from './schema';

// WHY: `whatsapp` n'est pas lisible par le rôle `authenticated` (migration 20261029000200) ; le
// client utilisateur ne la sélectionne jamais. L'écran admin la lit par le chemin privilégié.
const PANEL_COLUMNS =
  'id, category_key, name, city, district, price_note, is_example, verified_at, active';
/** Colonnes de l'écran admin, lues avec le client service-role seulement. */
export const ADMIN_COLUMNS = `${PANEL_COLUMNS}, whatsapp`;
/** WHY: le tri et la ville se font en code ; 200 lignes couvrent largement le pilote. */
const PANEL_LIMIT = 200;

interface PanelRow {
  id: string;
  category_key: ProviderCategory;
  name: string;
  city: string;
  district: string | null;
  price_note: string | null;
  is_example: boolean;
  verified_at: string | null;
  active: boolean;
}

/** Ligne lue avec `ADMIN_COLUMNS`. */
export interface ProviderRow extends PanelRow {
  whatsapp: string | null;
}

/** Données écrites : la saisie, avec la date de vérification calculée par le service. */
export type ProviderWrite = Omit<ProviderInput, 'verified'> & { verifiedAt: string | null };

const toPanelProvider = (r: PanelRow): PanelProvider => ({
  id: r.id,
  categoryKey: r.category_key,
  name: r.name,
  city: r.city,
  district: r.district,
  priceNote: r.price_note,
  isExample: r.is_example,
  verifiedAt: r.verified_at,
  active: r.active,
});

/** Convertit une ligne `ADMIN_COLUMNS` en prestataire complet. */
export const toProvider = (r: ProviderRow): Provider => ({
  ...toPanelProvider(r),
  whatsapp: r.whatsapp,
});

const toRow = (p: ProviderWrite) => ({
  category_key: p.categoryKey,
  name: p.name,
  city: p.city,
  district: p.district,
  whatsapp: p.whatsapp,
  price_note: p.priceNote,
  is_example: p.isExample,
  verified_at: p.verifiedAt,
  active: p.active,
});

export function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'providers error' },
  };
}

export const NO_ROWS = { data: null, error: { code: 'no_rows', message: 'no row matched' } };

/**
 * Prestataires des catégories d'un encadré : actifs, vérifiés ou d'exemple.
 * WHY: un administrateur lit aussi les non-vérifiés (RLS) ; ce filtre donne à tous le même
 * encadré. Pas de numéro : il ne sort que par la RPC `request_quote`.
 */
export async function listPanelProviders(
  categories: readonly ProviderCategory[],
): Promise<RepoResult<PanelProvider[]>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('provider')
    .select(PANEL_COLUMNS)
    .in('category_key', [...categories])
    .eq('active', true)
    .or('is_example.eq.true,verified_at.not.is.null')
    .order('name')
    .limit(PANEL_LIMIT)
    .returns<PanelRow[]>();
  if (error) {
    console.error('[providers] listPanelProviders impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toPanelProvider), error: null };
}

/** Crée un prestataire (RLS : administrateur seulement). */
export async function insertProvider(write: ProviderWrite): Promise<RepoResult<{ id: string }>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.from('provider').insert(toRow(write)).select('id').single();
  if (error) return fail(error);
  return { data: { id: (data as { id: string }).id }, error: null };
}

/** Modifie un prestataire ; `no_rows` si la RLS filtre la ligne. */
export async function updateProvider(id: string, write: ProviderWrite): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.from('provider').update(toRow(write)).eq('id', id).select('id');
  if (error) return fail(error);
  return data && data.length > 0 ? { data: true, error: null } : NO_ROWS;
}
