import { describe, expect, it } from 'vitest';
import type { Step } from './types';
import {
  assertUniqueSteps,
  findQuestion,
  getStep,
  isStepOpen,
  personStatus,
  stepsFor,
} from './registry';

describe('registre du parcours', () => {
  it('propose la biographie aux portes décès et préparer', () => {
    expect(stepsFor('death').map((s) => s.id)).toEqual(['biography']);
    expect(stepsFor('prepare').map((s) => s.id)).toEqual(['biography']);
    expect(stepsFor('after')).toEqual([]);
    expect(isStepOpen('death', 'biography')).toBe(true);
    expect(isStepOpen('after', 'biography')).toBe(false);
  });

  it('pose les six questions de la biographie dans l’ordre de la spec', () => {
    expect(getStep('biography')?.questions.map((q) => q.key)).toEqual([
      'biography.birthPlace',
      'biography.parents',
      'biography.career',
      'biography.traits',
      'biography.passions',
      'biography.motto',
    ]);
  });

  it('retrouve une question par sa clé', () => {
    const found = findQuestion('biography.traits');
    expect(found?.step.id).toBe('biography');
    expect(found?.index).toBe(3);
    expect(found?.question.kind).toBe('list');
  });

  it('ignore une clé ou une étape inconnue', () => {
    expect(findQuestion('biography.unknown')).toBeUndefined();
    expect(findQuestion('creator.relationship')).toBeUndefined();
    expect(getStep('nope')).toBeUndefined();
  });

  it('considère la personne vivante seulement pour la porte préparer', () => {
    expect(personStatus('prepare')).toBe('alive');
    expect(personStatus('death')).toBe('deceased');
    expect(personStatus('after')).toBe('deceased');
  });

  it('fixe la forme de la question biography.traits', () => {
    expect(findQuestion('biography.traits')?.question).toEqual({
      kind: 'list',
      key: 'biography.traits',
      maxItems: 10,
      fields: [
        { name: 'trait', kind: 'shortText', required: true },
        { name: 'anecdote', kind: 'longText' },
      ],
    });
  });

  describe('assertUniqueSteps', () => {
    const step = (id: string, ...keys: string[]): Step => ({
      id,
      questions: keys.map((key) => ({ kind: 'shortText' as const, key })),
    });

    it('refuse deux étapes de même id', () => {
      expect(() => assertUniqueSteps([step('a', 'a.one'), step('a', 'a.two')])).toThrow(/a/);
    });

    it('refuse une même clé dans deux étapes', () => {
      expect(() => assertUniqueSteps([step('a', 'x.key'), step('b', 'x.key')])).toThrow(/x\.key/);
    });

    it('accepte le registre réel', () => {
      expect(() => assertUniqueSteps(stepsFor('death'))).not.toThrow();
    });
  });
});
