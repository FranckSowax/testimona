import 'server-only';
import type { Level } from '@/journey/options';
import { LEVELS } from '@/journey/options';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import { type BudgetLine, type GridRow, type RecomputedRow, UNASSIGNED_KEY } from './model';

const COLUMNS =
  'id, grid_key, label, amount_sober, amount_intermediate, amount_full, edited, position';

interface LineRow {
  id: string;
  grid_key: string | null;
  label: string;
  amount_sober: number;
  amount_intermediate: number;
  amount_full: number;
  edited: boolean;
  position: number;
}

const toLine = (r: LineRow): BudgetLine => ({
  id: r.id,
  gridKey: r.grid_key,
  label: r.label,
  amounts: { sober: r.amount_sober, intermediate: r.amount_intermediate, full: r.amount_full },
  edited: r.edited,
  position: r.position,
});

const amountColumns = (amounts: Readonly<Record<Level, number>>) => ({
  amount_sober: amounts.sober,
  amount_intermediate: amounts.intermediate,
  amount_full: amounts.full,
});

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'budget lines error' },
  };
}

const NO_ROWS = { data: null, error: { code: 'no_rows', message: 'no row matched' } };

/** Postes du dossier (tout membre, RLS). */
export async function listLines(dossierId: string): Promise<RepoResult<BudgetLine[]>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('budget_line')
    .select(COLUMNS)
    .eq('dossier_id', dossierId)
    .order('position')
    .returns<LineRow[]>();
  if (error) {
    console.error('[budget/lines] listLines impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toLine), error: null };
}

/**
 * Crée les postes de la grille ; un poste déjà présent (même clé) est laissé tel quel.
 * WHY: un double clic sur « Créer les postes » ne crée rien de plus.
 */
export async function insertGridRows(
  dossierId: string,
  rows: readonly GridRow[],
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.from('budget_line').upsert(
    rows.map((row) => ({
      dossier_id: dossierId,
      grid_key: row.gridKey,
      label: row.label,
      position: row.position,
      ...amountColumns(row.amounts),
    })),
    { onConflict: 'dossier_id,grid_key', ignoreDuplicates: true },
  );
  if (error) return fail(error);
  return { data: true, error: null };
}

/**
 * Met à jour les montants des postes recalculés, seulement s'ils sont toujours non modifiés.
 * WHY: le filtre `edited = false` évite d'écraser un poste modifié entre la lecture et l'écriture.
 * WHY: les mises à jour ne sont pas atomiques (une requête par poste) ; si l'une échoue, les
 * autres restent appliquées. C'est acceptable : un nouveau recalcul est idempotent et termine
 * le travail.
 */
export async function updateRecomputed(
  dossierId: string,
  rows: readonly RecomputedRow[],
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const results = await Promise.all(
    rows.map((row) =>
      db
        .from('budget_line')
        .update(amountColumns(row.amounts))
        .eq('dossier_id', dossierId)
        .eq('id', row.id)
        .eq('edited', false),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(failed.error);
  return { data: true, error: null };
}

/** Ajoute un poste libre, marqué modifié (jamais recalculé). */
export async function insertLine(
  dossierId: string,
  line: { label: string; amounts: Record<Level, number>; position: number },
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.from('budget_line').insert({
    dossier_id: dossierId,
    grid_key: null,
    label: line.label,
    position: line.position,
    edited: true,
    ...amountColumns(line.amounts),
  });
  if (error) return fail(error);
  return { data: true, error: null };
}

/** Modifie le libellé et les montants d'un poste, qui devient modifié. */
export async function updateLine(
  dossierId: string,
  lineId: string,
  line: { label: string; amounts: Record<Level, number> },
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('budget_line')
    .update({ label: line.label, edited: true, ...amountColumns(line.amounts) })
    .eq('dossier_id', dossierId)
    .eq('id', lineId)
    .select('id');
  if (error) return fail(error);
  // WHY: la RLS fait échouer en silence une mise à jour interdite (0 ligne) : on le signale.
  if (!data || data.length === 0) return NO_ROWS;
  return { data: true, error: null };
}

/** Supprime un poste ; refusé par la base s'il porte des dépenses (23503). */
export async function deleteLine(dossierId: string, lineId: string): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('budget_line')
    .delete()
    .eq('dossier_id', dossierId)
    .eq('id', lineId)
    .select('id');
  if (error) return fail(error);
  if (!data || data.length === 0) return NO_ROWS;
  return { data: true, error: null };
}

/** Scénario retenu, ou null. */
export async function getScenario(dossierId: string): Promise<RepoResult<Level | null>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_finance')
    .select('scenario')
    .eq('dossier_id', dossierId)
    .maybeSingle<{ scenario: string | null }>();
  if (error) {
    console.error('[budget/lines] getScenario impossible', { code: error.code });
    return fail(error);
  }
  const value = data?.scenario ?? null;
  return {
    data: value && (LEVELS as readonly string[]).includes(value) ? (value as Level) : null,
    error: null,
  };
}

/** Retient un scénario (trésorier et plus, vérifié par la base) ; null l'efface. */
export async function setScenario(
  dossierId: string,
  scenario: Level | null,
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.rpc('set_budget_scenario', {
    p_dossier_id: dossierId,
    p_scenario: scenario,
  });
  if (error) return fail(error);
  return { data: true, error: null };
}

/** Dépenses actives par poste ; la clé UNASSIGNED_KEY regroupe les dépenses sans poste. */
export async function spentByLine(dossierId: string): Promise<RepoResult<Map<string, number>>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('ledger_spent_by_line', { p_dossier_id: dossierId });
  if (error) {
    console.error('[budget/lines] spentByLine impossible', { code: error.code });
    return fail(error);
  }
  const rows = (data ?? []) as { budget_line_id: string | null; spent: number | string }[];
  return {
    data: new Map(rows.map((r) => [r.budget_line_id ?? UNASSIGNED_KEY, Number(r.spent)])),
    error: null,
  };
}
