import { ANSWER_KEY_PATTERN, type ListField, type Question, type Step } from './types';

/** Fabriques de questions, pour des définitions d'étapes lisibles. */
export const q = {
  shortText: (key: string): Question => ({ kind: 'shortText', key }),
  longText: (key: string): Question => ({ kind: 'longText', key }),
  date: (key: string): Question => ({ kind: 'date', key }),
  place: (key: string): Question => ({ kind: 'place', key }),
  choice: (key: string, options: readonly string[]): Question => ({ kind: 'choice', key, options }),
  list: (key: string, fields: readonly ListField[], maxItems = 20): Question => ({
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
  const seen = new Set<string>();
  for (const question of step.questions) {
    if (!ANSWER_KEY_PATTERN.test(question.key)) {
      throw new Error(`Étape ${step.id} : clé invalide « ${question.key} »`);
    }
    if (seen.has(question.key)) {
      throw new Error(`Étape ${step.id} : clé en double « ${question.key} »`);
    }
    seen.add(question.key);
  }
  return step;
}
