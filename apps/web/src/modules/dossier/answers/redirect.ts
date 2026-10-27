import { nextQuestionInStep, type Answers } from '@/journey/progress';
import type { Step } from '@/journey/types';

/**
 * Chemin (non localisé) où aller après avoir enregistré la question `index` de `step` : la
 * prochaine question non traitée ou passée de l'étape, sinon le brouillon de l'étape s'il
 * existe, sinon le tableau de bord du dossier.
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
  // WHY: une étape à brouillon (2.2, 2.3) se termine sur le texte à partager.
  return step.draft ? `/dossier/${dossierId}/etape/${step.id}/brouillon` : `/dossier/${dossierId}`;
}
