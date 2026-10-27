import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { allSteps } from './registry';
import type { Step } from './types';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );

/** Chemins de textes qu'une étape du registre exige. */
function requiredPaths(step: Step): string[] {
  const paths = [`journey.steps.${step.id}.title`, `journey.steps.${step.id}.description`];
  if (step.draft) paths.push(`journey.draft.title.${step.draft.kind}`);
  for (const question of step.questions) {
    const base = `journey.q.${question.key}`;
    paths.push(`${base}.title`, `${base}.hint`);
    if (question.kind === 'choice') {
      paths.push(...question.options.map((o) => `${base}.options.${o}`));
    }
    if (question.kind === 'list') {
      for (const field of question.fields) {
        paths.push(`${base}.fields.${field.name}.label`);
        if (field.kind === 'choice') {
          paths.push(...field.options.map((o) => `${base}.fields.${field.name}.options.${o}`));
        }
      }
    }
  }
  return paths;
}

describe.each([
  ['fr', fr],
  ['en', en],
])('textes du parcours (%s)', (_locale, messages) => {
  it('couvrent chaque étape, question, option et champ du registre', () => {
    const missing = allSteps()
      .flatMap(requiredPaths)
      .filter((path) => typeof get(messages, path) !== 'string');
    expect(missing).toEqual([]);
  });
});
