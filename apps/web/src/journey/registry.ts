import type { EntryPoint } from '@/modules/dossier/schema';
import { biographyStep } from './steps/1-6-biography';
import type { Question, Step } from './types';

const ALL_STEPS: readonly Step[] = [biographyStep];

/** Étapes proposées, dans l'ordre, selon la porte d'entrée du dossier. */
const STEPS_BY_ENTRY: Record<EntryPoint, readonly Step[]> = {
  death: [biographyStep],
  prepare: [biographyStep],
  after: [],
};

export interface FoundQuestion {
  step: Step;
  question: Question;
  index: number;
}

export function stepsFor(entryPoint: EntryPoint): readonly Step[] {
  return STEPS_BY_ENTRY[entryPoint];
}

export function getStep(id: string): Step | undefined {
  return ALL_STEPS.find((step) => step.id === id);
}

export function isStepOpen(entryPoint: EntryPoint, stepId: string): boolean {
  return stepsFor(entryPoint).some((step) => step.id === stepId);
}

/** Question du registre portant cette clé, avec son étape et sa position. */
export function findQuestion(key: string): FoundQuestion | undefined {
  for (const step of ALL_STEPS) {
    const index = step.questions.findIndex((question) => question.key === key);
    const question = step.questions[index];
    if (question) return { step, question, index };
  }
  return undefined;
}

/**
 * Temps des questions : porte « préparer » = personne vivante.
 * WHY: les textes utilisent `{status, select, alive {…} other {…}}` pour passer au présent.
 */
export function personStatus(entryPoint: EntryPoint): 'alive' | 'deceased' {
  return entryPoint === 'prepare' ? 'alive' : 'deceased';
}
