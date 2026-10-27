import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { z } from 'zod';
import type { Level } from '@/journey/options';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { fieldErrors } from '@/modules/dossier/service';
import { budgetGate } from '../gate';
import { ATTENDANCE_KEYS, attendanceFrom, NIGHTS_KEY } from '../scenarios';
import { gridRows, recomputeRows } from './model';
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
  | 'unknown';

export type LinesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LinesError; fieldErrors?: Record<string, string> };

const CODES: Record<string, LinesError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
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
  const blocked = await budgetGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const answers = await attendanceAnswers(dossierId);
  if (!answers) return { ok: false, error: 'unknown' };
  // WHY: sans affluence, les postes calculés par invité tomberaient à 0 sans prévenir.
  if (!attendanceFrom(answers).answered) return { ok: false, error: 'no_attendance' };
  const t = await getTranslations({ locale, namespace: 'budget.grid' });
  return done(
    await repo.insertGridRows(
      dossierId,
      gridRows(answers, (key) => t(key)),
    ),
    'create',
  );
}

/** Recalcule les montants des postes de la grille non modifiés (trésorier et plus). */
export async function recomputeLines(raw: unknown): Promise<LinesResult<true>> {
  const input = DossierRefSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId } = input.data;
  const blocked = await budgetGate(dossierId);
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
  const blocked = await budgetGate(dossierId);
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
  const blocked = await budgetGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const lines = await repo.listLines(dossierId);
  if (lines.error) return fromRepo(lines.error, 'addLine');
  const position = Math.min(1000, Math.max(-1, ...lines.data.map((l) => l.position)) + 1);
  return done(
    await repo.insertLine(dossierId, { label, amounts: { sober, intermediate, full }, position }),
    'addLine',
  );
}

/** Supprime un poste sans dépense (trésorier et plus). */
export async function deleteLine(raw: unknown): Promise<LinesResult<true>> {
  const input = LineRefSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const blocked = await budgetGate(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  return done(await repo.deleteLine(input.data.dossierId, input.data.lineId), 'deleteLine');
}

/** Retient un scénario ou l'efface (trésorier et plus). */
export async function chooseScenario(raw: unknown): Promise<LinesResult<Level | null>> {
  const input = ScenarioSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const blocked = await budgetGate(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.setScenario(input.data.dossierId, input.data.scenario);
  if (res.error) return fromRepo(res.error, 'chooseScenario');
  return { ok: true, data: input.data.scenario };
}
