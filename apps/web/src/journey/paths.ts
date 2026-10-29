import type { Step } from './types';

/**
 * Chemin (non localisé) de la page de synthèse d'une étape, ou null si elle n'en a pas.
 *
 * @example
 * summaryPath(dossierId, vigilSetupStep); // '/dossier/<id>/etape/vigil-setup/synthese'
 */
export function summaryPath(dossierId: string, step: Step): string | null {
  if (step.summary === 'step') return `/dossier/${dossierId}/etape/${step.id}/synthese`;
  if (step.summary) return `/dossier/${dossierId}/${step.summary}`;
  return null;
}
