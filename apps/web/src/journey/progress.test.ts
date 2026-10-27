import { describe, expect, it } from 'vitest';
import { defineStep, q } from './define';
import { nextQuestion, resolveQuestionIndex, stepProgress } from './progress';
import { SKIPPED } from './types';

const first = defineStep({
  id: 'first',
  questions: [q.shortText('first.a'), q.shortText('first.b'), q.shortText('first.c')],
});
const second = defineStep({ id: 'second', questions: [q.shortText('second.a')] });

describe('stepProgress', () => {
  it('compte les réponses et les questions passées séparément', () => {
    expect(stepProgress(first, { 'first.a': 'oui', 'first.b': SKIPPED })).toEqual({
      stepId: 'first',
      total: 3,
      answered: 1,
      skipped: 1,
    });
  });

  it('ignore les réponses d’autres étapes', () => {
    expect(stepProgress(first, { 'second.a': 'x' })).toMatchObject({ answered: 0, skipped: 0 });
  });
});

describe('nextQuestion', () => {
  it('renvoie la première question sans réponse, les passées comptant comme traitées', () => {
    expect(nextQuestion([first, second], { 'first.a': 'x', 'first.b': SKIPPED })).toEqual({
      stepId: 'first',
      index: 2,
    });
  });

  it('passe à l’étape suivante quand la première est traitée', () => {
    const answers = { 'first.a': 'x', 'first.b': 'y', 'first.c': SKIPPED };
    expect(nextQuestion([first, second], answers)).toEqual({ stepId: 'second', index: 0 });
  });

  it('renvoie null quand tout est répondu ou passé', () => {
    const answers = { 'first.a': 'x', 'first.b': 'y', 'first.c': 'z', 'second.a': SKIPPED };
    expect(nextQuestion([first, second], answers)).toBeNull();
  });
});

describe('resolveQuestionIndex', () => {
  it('suit ?q= quand il désigne une question de l’étape', () => {
    expect(resolveQuestionIndex(first, {}, '2')).toBe(2);
    expect(resolveQuestionIndex(first, {}, ['1', '2'])).toBe(1);
  });

  it('ouvre sinon la première question sans réponse', () => {
    expect(resolveQuestionIndex(first, { 'first.a': 'x' }, undefined)).toBe(1);
    expect(resolveQuestionIndex(first, { 'first.a': 'x' }, '9')).toBe(1);
    expect(resolveQuestionIndex(first, { 'first.a': 'x' }, '-1')).toBe(1);
  });

  it('revient à la première question quand tout est traité', () => {
    const answers = { 'first.a': 'x', 'first.b': SKIPPED, 'first.c': 'z' };
    expect(resolveQuestionIndex(first, answers, undefined)).toBe(0);
  });
});
