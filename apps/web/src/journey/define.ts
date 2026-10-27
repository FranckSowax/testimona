import {
  ANSWER_KEY_PATTERN,
  type ChoiceQuestion,
  type ListField,
  type ListQuestion,
  type Question,
  type Step,
} from './types';

const STEP_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Fabriques de questions, pour des définitions d'étapes lisibles. */
export const q = {
  shortText: (key: string): Question => ({ kind: 'shortText', key }),
  longText: (key: string): Question => ({ kind: 'longText', key }),
  date: (key: string): Question => ({ kind: 'date', key }),
  place: (key: string): Question => ({ kind: 'place', key }),
  choice: (key: string, options: readonly string[]): ChoiceQuestion => ({
    kind: 'choice',
    key,
    options,
  }),
  list: (key: string, fields: readonly ListField[], maxItems = 20): ListQuestion => ({
    kind: 'list',
    key,
    fields,
    maxItems,
  }),
};

/**
 * Vérifie une étape au chargement : clés au format de la base et sans doublon.
 *
 * @example
 * export const demoStep = defineStep({ id: 'demo', questions: [q.shortText('demo.motto')] });
 */
export function defineStep(step: Step): Step {
  if (!STEP_ID_PATTERN.test(step.id)) {
    throw new Error(`Étape « ${step.id} » : identifiant invalide pour une URL`);
  }
  const seen = new Set<string>();
  for (const question of step.questions) {
    if (!ANSWER_KEY_PATTERN.test(question.key)) {
      throw new Error(`Étape ${step.id} : clé invalide « ${question.key} »`);
    }
    if (seen.has(question.key)) {
      throw new Error(`Étape ${step.id} : clé en double « ${question.key} »`);
    }
    seen.add(question.key);
    checkQuestion(step.id, question);
  }
  return step;
}

function checkQuestion(stepId: string, question: Question): void {
  if (question.kind === 'choice' && question.options.length === 0) {
    throw new Error(`Étape ${stepId} : options vides pour « ${question.key} »`);
  }
  if (question.kind !== 'list') return;
  if (!Number.isInteger(question.maxItems) || question.maxItems < 1) {
    throw new Error(`Étape ${stepId} : maxItems invalide pour « ${question.key} »`);
  }
  const names = new Set<string>();
  for (const field of question.fields) {
    if (names.has(field.name)) {
      throw new Error(
        `Étape ${stepId} : champ en double « ${field.name} » dans « ${question.key} »`,
      );
    }
    names.add(field.name);
    if (field.kind === 'choice' && field.options.length === 0) {
      throw new Error(`Étape ${stepId} : options vides pour le champ « ${field.name} »`);
    }
  }
}
