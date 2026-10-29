import { summaryPath } from '@/journey/paths';
import { nextQuestionInStep, type Answers } from '@/journey/progress';
import type { Step } from '@/journey/types';

/**
 * Chemin (non localisé) qui conclut une étape : son brouillon (2.2, 2.3), sa page de synthèse
 * (B.1, B.2 → budget ; 3.1, 3.2 → synthèse de l'étape), sinon le tableau de bord du dossier.
 *
 * @example
 * stepEndPath(dossierId, attendanceStep); // '/dossier/<id>/budget'
 */
export function stepEndPath(dossierId: string, step: Step): string {
  if (step.draft) return `/dossier/${dossierId}/etape/${step.id}/brouillon`;
  return summaryPath(dossierId, step) ?? `/dossier/${dossierId}`;
}

/**
 * Chemin (non localisé) où aller après avoir enregistré la question `index` de `step` : la
 * prochaine question non traitée ou passée de l'étape, sinon la fin de l'étape
 * (`stepEndPath`).
 *
 * @example
 * answerRedirectTarget(dossierId, biography, answers, 0); // '/dossier/<id>/etape/biography?q=1'
 */
export function answerRedirectTarget(
  dossierId: string,
  step: Step,
  answers: Answers,
  index: number,
): string {
  const next = nextQuestionInStep(step, answers, index);
  if (next !== null) return `/dossier/${dossierId}/etape/${step.id}?q=${next}`;
  return stepEndPath(dossierId, step);
}
