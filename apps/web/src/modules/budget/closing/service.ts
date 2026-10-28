import 'server-only';
import { getMyRole } from '@/modules/dossier/repo';
import { hasRole } from '@/modules/dossier/roles';
import type { DossierRole } from '@/modules/dossier/schema';
import { budgetGate } from '../gate';
import { listLines } from '../lines/repo';
import * as repo from './repo';
import { ClosingRefSchema, type ExportRow } from './schema';

export type ClosingError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'too_large'
  | 'unknown';

export type ClosingResult<T> = { ok: true; data: T } | { ok: false; error: ClosingError };

/** État renvoyé par les actions de clôture et de réouverture. */
export interface ClosingFormState {
  ok?: boolean;
  error?: ClosingError;
}

/** Lignes du registre et libellés des postes, pour l'export (trésorier et plus). */
export interface LedgerExport {
  rows: ExportRow[];
  lineLabels: Map<string, string>;
}

const CODES: Record<string, ClosingError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  // WHY: JWT expiré signalé par PostgREST.
  PGRST301: 'unauthenticated',
  '22P02': 'validation',
  // WHY: registre de plus de 50 000 lignes (dépôt) : refusé plutôt que tronqué.
  too_large: 'too_large',
};

function fromRepo(error: { code: string }, scope: string): { ok: false; error: ClosingError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[budget/closing] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

/**
 * Porte : dossier ouvert au budget, puis rôle minimal.
 * WHY: la base revérifie le rôle (42501) ; ce contrôle donne une erreur claire sans appel inutile
 * et protège l'export, que la RLS ne ferait que réduire aux lignes visibles.
 */
async function roleGate(dossierId: string, min: DossierRole): Promise<ClosingError | null> {
  const blocked = await budgetGate(dossierId);
  if (blocked) return blocked;
  return hasRole(await getMyRole(dossierId), min) ? null : 'forbidden';
}

/**
 * Clôture les cotisations (trésorier et plus). Sans effet si elles le sont déjà : la date de la
 * première clôture est renvoyée.
 *
 * @example
 * await closeLedger({ dossierId }); // { ok: true, data: { closedAt: '2026-10-28T09:00:00Z' } }
 */
export async function closeLedger(raw: unknown): Promise<ClosingResult<{ closedAt: string }>> {
  const input = ClosingRefSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const blocked = await roleGate(input.data.dossierId, 'treasurer');
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.closeLedger(input.data.dossierId);
  if (res.error) return fromRepo(res.error, 'closeLedger');
  return { ok: true, data: { closedAt: res.data } };
}

/**
 * Rouvre les cotisations (propriétaire seul). Sans effet si elles sont ouvertes.
 *
 * @example
 * await reopenLedger({ dossierId });
 */
export async function reopenLedger(raw: unknown): Promise<ClosingResult<true>> {
  const input = ClosingRefSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const blocked = await roleGate(input.data.dossierId, 'owner');
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.reopenLedger(input.data.dossierId);
  if (res.error) return fromRepo(res.error, 'reopenLedger');
  return { ok: true, data: true };
}

/**
 * Registre complet et libellés des postes, pour le fichier CSV (trésorier et plus).
 * WHY: un identifiant invalide donne `not_found`, comme un dossier absent : la route répond 404.
 *
 * @example
 * const res = await exportLedger({ dossierId });
 */
export async function exportLedger(raw: unknown): Promise<ClosingResult<LedgerExport>> {
  const input = ClosingRefSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'not_found' };
  const { dossierId } = input.data;
  const blocked = await roleGate(dossierId, 'treasurer');
  if (blocked) return { ok: false, error: blocked };
  const [rows, lines] = await Promise.all([repo.listExportRows(dossierId), listLines(dossierId)]);
  if (rows.error) return fromRepo(rows.error, 'listExportRows');
  if (lines.error) return fromRepo(lines.error, 'listLines');
  return {
    ok: true,
    data: { rows: rows.data, lineLabels: new Map(lines.data.map((l) => [l.id, l.label])) },
  };
}
