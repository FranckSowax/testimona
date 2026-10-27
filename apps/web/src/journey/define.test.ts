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
});
