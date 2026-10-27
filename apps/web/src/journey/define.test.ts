import { describe, expect, it } from 'vitest';
import { defineStep, q } from './define';

describe('defineStep', () => {
  it('renvoie l’étape telle quelle si ses clés sont valides', () => {
    const step = { id: 'demo', questions: [q.shortText('demo.one'), q.place('demo.two')] };
    expect(defineStep(step)).toBe(step);
  });

  it('refuse une clé au mauvais format', () => {
    expect(() => defineStep({ id: 'demo', questions: [q.shortText('Demo')] })).toThrow(/invalide/);
  });

  it('refuse une clé en double', () => {
    expect(() =>
      defineStep({ id: 'demo', questions: [q.shortText('demo.one'), q.longText('demo.one')] }),
    ).toThrow(/double/);
  });

  it('fixe 20 éléments au plus par défaut pour une liste', () => {
    const list = q.list('demo.list', [{ name: 'name', kind: 'shortText', required: true }]);
    expect(list).toMatchObject({ kind: 'list', maxItems: 20 });
  });

  it('refuse un identifiant d’étape inutilisable dans une URL', () => {
    expect(() => defineStep({ id: 'Bad Id/', questions: [] })).toThrow(/identifiant/);
  });

  it('refuse des noms de champs de liste en double', () => {
    const field = { name: 'a', kind: 'shortText' as const };
    expect(() =>
      defineStep({ id: 'demo', questions: [q.list('demo.list', [field, field])] }),
    ).toThrow(/double/);
  });

  it('refuse des options vides (question ou champ)', () => {
    expect(() => defineStep({ id: 'demo', questions: [q.choice('demo.c', [])] })).toThrow(/vides/);
    const field = { name: 'c', kind: 'choice' as const, options: [] };
    expect(() => defineStep({ id: 'demo', questions: [q.list('demo.l', [field])] })).toThrow(
      /vides/,
    );
  });

  it('refuse un maxItems non entier ou inférieur à 1', () => {
    const f = [{ name: 'a', kind: 'shortText' as const }];
    for (const n of [0, 1.5, -2]) {
      expect(() => defineStep({ id: 'demo', questions: [q.list('demo.l', f, n)] })).toThrow(
        /maxItems/,
      );
    }
  });

  it('accepte un brouillon à clé valide et distincte des questions', () => {
    const step = {
      id: 'demo',
      questions: [q.shortText('demo.one')],
      draft: { key: 'demo.draft.text', kind: 'whatsapp' as const },
    };
    expect(defineStep(step)).toBe(step);
  });

  it('refuse un brouillon à clé invalide ou reprise d’une question', () => {
    expect(() =>
      defineStep({ id: 'demo', questions: [], draft: { key: 'Demo', kind: 'email' } }),
    ).toThrow(/brouillon/);
    expect(() =>
      defineStep({
        id: 'demo',
        questions: [q.shortText('demo.one')],
        draft: { key: 'demo.one', kind: 'email' },
      }),
    ).toThrow(/brouillon/);
  });
});
