import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { z } from 'zod';
import type { Level } from '@/journey/options';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getMyRole } from '@/modules/dossier/repo';
import { hasRole } from '@/modules/dossier/roles';
import { fieldErrors } from '@/modules/dossier/service';
import { budgetGate } from '../gate';
import { ATTENDANCE_KEYS, attendanceFrom, NIGHTS_KEY } from '../scenarios';
import { type BudgetLine, gridRows, recomputeRows } from './model';
import * as repo from './repo';
import {
  DossierRefSchema,
  LineRefSchema,
  LineSchema,
  NewLineSchema,
  ScenarioSchema,
} from './schema';

export type LinesError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'line_in_use'
  | 'no_attendance'
  | 'too_many_lines'
  | 'closed'
  | 'unknown';

export type LinesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LinesError; fieldErrors?: Record<string, string> };

/** Même borne que le trigger de `budget_line` (au plus 100 postes par dossier). */
const MAX_LINES = 100;
/** Même borne que la contrainte `position between 0 and 1000`. */
const MAX_POSITION = 1000;

const CODES: Record<string, LinesError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
  // WHY: limite de 100 postes atteinte entre la lecture et l'insertion (course).
  TL005: 'too_many_lines',
  // WHY: dossier clôturé (postes, scénario) ; la base vérifie le rôle avant.
  TL009: 'closed',
  '22P02': 'validation',
  '23503': 'line_in_use',
  no_rows: 'not_found',
};

function fromRepo(error: { code: string }, scope: string): { ok: false; error: LinesError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[budget/lines] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

function invalid(error: z.ZodError) {
  return {
    ok: false as const,
    error: 'validation' as const,
    fieldErrors: fieldErrors(error.issues),
  };
}

const done = (res: { error: { code: string } | null }, scope: string): LinesResult<true> =>
  res.error ? fromRepo(res.error, scope) : { ok: true, data: true };

/**
 * Porte des écritures : dossier ouvert au budget, puis rôle trésorier ou plus.
 * WHY: `budgetGate` ne contrôle que la lecture ; pour un rôle inférieur la RLS filtre les UPDATE
 * en silence et l'opération semblerait réussir. Les mappages 42501 / no_rows restent le
 * garde-fou de la base.
 */
async function writeGate(dossierId: string): Promise<LinesError | null> {
  const blocked = await budgetGate(dossierId);
  if (blocked) return blocked;
  return hasRole(await getMyRole(dossierId), 'treasurer') ? null : 'forbidden';
}

/** Position qui suit le dernier poste, plafonnée à la borne de la base. */
const nextPosition = (lines: readonly BudgetLine[]) =>
  Math.min(MAX_POSITION, Math.max(-1, ...lines.map((l) => l.position)) + 1);

async function attendanceAnswers(dossierId: string) {
  const res = await listAnswersResult(dossierId, [...ATTENDANCE_KEYS, NIGHTS_KEY]);
  if (res.error) console.error('[budget/lines] answers unreadable', { code: res.error.code });
  return res.error ? null : res.data;
}

/**
 * Crée les postes de la grille à partir de l'estimation (trésorier et plus).
 *
 * @example
 * await createGridLines({ dossierId }, 'fr');
 */
export async function createGridLines(raw: unknown, locale: string): Promise<LinesResult<true>> {
  const input = DossierRefSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId } = input.data;
  const blocked = await writeGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const [answers, lines] = await Promise.all([
    attendanceAnswers(dossierId),
    repo.listLines(dossierId),
  ]);
  if (!answers) return { ok: false, error: 'unknown' };
  // WHY: sans affluence, les postes calculés par invité tomberaient à 0 sans prévenir.
  if (!attendanceFrom(answers).answered) return { ok: false, error: 'no_attendance' };
  if (lines.error) return fromRepo(lines.error, 'create');
  // WHY: un poste de la grille existe déjà, donc la grille a été créée : on ne recrée rien, ce
  // qui évite aussi de faire revenir un poste de la grille supprimé exprès.
  if (lines.data.some((line) => line.gridKey !== null)) return { ok: true, data: true };
  const t = await getTranslations({ locale, namespace: 'budget.grid' });
  const rows = gridRows(answers, (key) => t(key));
  if (lines.data.length + rows.length > MAX_LINES) return { ok: false, error: 'too_many_lines' };
  // WHY: les postes de la grille suivent les postes libres déjà ajoutés, sans s'y entremêler.
  const start = nextPosition(lines.data);
  return done(
    await repo.insertGridRows(
      dossierId,
      rows.map((row) => ({ ...row, position: Math.min(MAX_POSITION, start + row.position) })),
    ),
    'create',
  );
}

/** Recalcule les montants des postes de la grille non modifiés (trésorier et plus). */
export async function recomputeLines(raw: unknown): Promise<LinesResult<true>> {
  const input = DossierRefSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId } = input.data;
  const blocked = await writeGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const [answers, lines] = await Promise.all([
    attendanceAnswers(dossierId),
    repo.listLines(dossierId),
  ]);
  if (!answers) return { ok: false, error: 'unknown' };
  // WHY: sans affluence, les postes calculés par invité tomberaient à 0 sans prévenir.
  if (!attendanceFrom(answers).answered) return { ok: false, error: 'no_attendance' };
  if (lines.error) return fromRepo(lines.error, 'recompute');
  return done(
    await repo.updateRecomputed(dossierId, recomputeRows(lines.data, answers)),
    'recompute',
  );
}

/** Modifie un poste (trésorier et plus) ; il ne sera plus recalculé. */
export async function saveLine(raw: unknown): Promise<LinesResult<true>> {
  const input = LineSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId, lineId, label, sober, intermediate, full } = input.data;
  const blocked = await writeGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  return done(
    await repo.updateLine(dossierId, lineId, { label, amounts: { sober, intermediate, full } }),
    'saveLine',
  );
}

/** Ajoute un poste libre après le dernier (trésorier et plus). */
export async function addLine(raw: unknown): Promise<LinesResult<true>> {
  const input = NewLineSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId, label, sober, intermediate, full } = input.data;
  const blocked = await writeGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const lines = await repo.listLines(dossierId);
  if (lines.error) return fromRepo(lines.error, 'addLine');
  if (lines.data.length >= MAX_LINES) return { ok: false, error: 'too_many_lines' };
  return done(
    await repo.insertLine(dossierId, {
      label,
      amounts: { sober, intermediate, full },
      position: nextPosition(lines.data),
    }),
    'addLine',
  );
}

/** Supprime un poste sans dépense (trésorier et plus). */
export async function deleteLine(raw: unknown): Promise<LinesResult<true>> {
  const input = LineRefSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const blocked = await writeGate(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  return done(await repo.deleteLine(input.data.dossierId, input.data.lineId), 'deleteLine');
}

/** Retient un scénario ou l'efface (trésorier et plus). */
export async function chooseScenario(raw: unknown): Promise<LinesResult<Level | null>> {
  const input = ScenarioSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const blocked = await writeGate(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.setScenario(input.data.dossierId, input.data.scenario);
  if (res.error) return fromRepo(res.error, 'chooseScenario');
  return { ok: true, data: input.data.scenario };
}
