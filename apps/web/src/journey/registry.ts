import type { EntryPoint } from '@/modules/dossier/schema';
import { biographyStep } from './steps/1-6-biography';
import type { Question, Step } from './types';

/** Étapes proposées, dans l'ordre, selon la porte d'entrée du dossier. */
const STEPS_BY_ENTRY: Record<EntryPoint, readonly Step[]> = {
  death: [biographyStep],
  prepare: [biographyStep],
  after: [],
};

/**
 * Vérifie qu'aucun `id` d'étape ni aucune clé de question n'apparaît deux fois.
 * WHY: `getStep` et `findQuestion` doivent rester sans ambiguïté quand les étapes 2.x arriveront.
 */
export function assertUniqueSteps(steps: readonly Step[]): void {
  const stepIds = new Set<string>();
  const keys = new Map<string, string>();
  for (const step of steps) {
    if (stepIds.has(step.id)) throw new Error(`Registre : étape en double « ${step.id} »`);
    stepIds.add(step.id);
    for (const question of step.questions) {
      const owner = keys.get(question.key);
      if (owner !== undefined) {
        throw new Error(
          `Registre : clé « ${question.key} » présente dans les étapes ${owner} et ${step.id}`,
        );
      }
      keys.set(question.key, step.id);
    }
  }
}

// WHY: une seule source de vérité (STEPS_BY_ENTRY) ; la liste globale en est dérivée, sans doublon.
const ALL_STEPS: readonly Step[] = [...new Set(Object.values(STEPS_BY_ENTRY).flat())];
assertUniqueSteps(ALL_STEPS);

export interface FoundQuestion {
  step: Step;
  question: Question;
  index: number;
}

export function stepsFor(entryPoint: EntryPoint): readonly Step[] {
  return STEPS_BY_ENTRY[entryPoint];
}

/** Toutes les étapes du registre, sans doublon (pour les contrôles transverses). */
export function allSteps(): readonly Step[] {
  return ALL_STEPS;
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
