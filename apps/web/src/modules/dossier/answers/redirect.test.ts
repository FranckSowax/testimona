import { describe, expect, it } from 'vitest';
import { defineStep, q } from '@/journey/define';
import { SKIPPED } from '@/journey/types';
import type { Step } from '@/journey/types';
import { answerRedirectTarget, stepEndPath } from './redirect';

const ID = '44444444-4444-4444-8444-444444444444';
const step = defineStep({
  id: 'demo',
  questions: [q.shortText('demo.a'), q.shortText('demo.b'), q.shortText('demo.c')],
});

describe('answerRedirectTarget', () => {
  it('va à la question suivante non traitée', () => {
    expect(answerRedirectTarget(ID, step, { 'demo.a': 'x' }, 0)).toBe(
      `/dossier/${ID}/etape/demo?q=1`,
    );
  });

  it('revient au tableau de bord après la dernière question quand tout est traité', () => {
    const answers = { 'demo.a': 'x', 'demo.b': 'y', 'demo.c': 'z' };
    expect(answerRedirectTarget(ID, step, answers, 2)).toBe(`/dossier/${ID}`);
  });

  it('après la dernière question, reboucle sur une question restée sans réponse', () => {
    const answers = { 'demo.b': 'y', 'demo.c': 'z' };
    expect(answerRedirectTarget(ID, step, answers, 2)).toBe(`/dossier/${ID}/etape/demo?q=0`);
  });

  it('mène à une question passée plus loin', () => {
    const answers = { 'demo.a': 'x', 'demo.b': 'y', 'demo.c': SKIPPED };
    expect(answerRedirectTarget(ID, step, answers, 0)).toBe(`/dossier/${ID}/etape/demo?q=2`);
  });

  it('revient au tableau de bord quand tout est répondu', () => {
    const answers = { 'demo.a': 'x', 'demo.b': 'y', 'demo.c': 'z' };
    expect(answerRedirectTarget(ID, step, answers, 0)).toBe(`/dossier/${ID}`);
  });

  it('mène au brouillon après la dernière question d’une étape à brouillon', () => {
    const withDraft = defineStep({
      id: 'with-draft',
      questions: [q.shortText('withDraft.a')],
      draft: { key: 'withDraft.text', kind: 'whatsapp' },
    });
    expect(answerRedirectTarget(ID, withDraft, { 'withDraft.a': 'x' }, 0)).toBe(
      `/dossier/${ID}/etape/with-draft/brouillon`,
    );
  });
});

describe('stepEndPath', () => {
  const base: Step = { id: 'plain', questions: [{ kind: 'shortText', key: 'plain.a' }] };

  it('mène au brouillon, à la page de synthèse ou au dossier', () => {
    expect(stepEndPath(ID, { ...base, draft: { key: 'plain.text', kind: 'whatsapp' } })).toBe(
      `/dossier/${ID}/etape/plain/brouillon`,
    );
    expect(stepEndPath(ID, { ...base, summary: 'budget' })).toBe(`/dossier/${ID}/budget`);
    expect(stepEndPath(ID, { ...base, summary: 'step' })).toBe(
      `/dossier/${ID}/etape/plain/synthese`,
    );
    expect(stepEndPath(ID, base)).toBe(`/dossier/${ID}`);
  });

  it('termine une étape à synthèse sur sa page', () => {
    const withSummary: Step = { ...base, summary: 'budget' };
    expect(answerRedirectTarget(ID, withSummary, { 'plain.a': 'x' }, 0)).toBe(
      `/dossier/${ID}/budget`,
    );
  });
});
