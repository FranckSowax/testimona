import { describe, expect, it } from 'vitest';
import { answerSchema, DRAFT_MAX, draftTextSchema, type Question } from './types';

const notes: Question = {
  kind: 'list',
  key: 'biography.notes',
  maxItems: 20,
  fields: [
    { name: 'title', kind: 'shortText', required: true },
    { name: 'text', kind: 'longText' },
  ],
};

describe('taille des réponses', () => {
  it('refuse une liste valide pour Zod mais trop lourde pour la base', () => {
    const items = Array.from({ length: 20 }, () => ({
      title: 'x'.repeat(200),
      text: 'x'.repeat(4000),
    }));
    expect(answerSchema(notes).safeParse(items).success).toBe(false);
  });

  it('compte les octets, pas les caractères', () => {
    const items = Array.from({ length: 20 }, () => ({ title: 'a', text: '漢'.repeat(1500) }));
    expect(answerSchema(notes).safeParse(items).success).toBe(false);
  });

  it('accepte une liste raisonnable', () => {
    const items = [{ title: 'Humour', text: 'Il riait de tout.' }];
    expect(answerSchema(notes).safeParse(items).success).toBe(true);
  });
});

describe('caractère NUL', () => {
  it('est refusé dans un texte obligatoire ou facultatif', () => {
    expect(answerSchema({ kind: 'shortText', key: 'a.b' }).safeParse('a\u0000b').success).toBe(
      false,
    );
    expect(answerSchema(notes).safeParse([{ title: 'a', text: 'b\u0000' }]).success).toBe(false);
  });
});

describe('dates', () => {
  const s = answerSchema({ kind: 'date', key: 'death.date' });
  it('borne l’année', () => {
    expect(s.safeParse('0000-01-01').success).toBe(false);
    expect(s.safeParse('1799-12-31').success).toBe(false);
    expect(s.safeParse(`${new Date().getUTCFullYear() + 2}-01-01`).success).toBe(false);
  });
  it('gère les années bissextiles', () => {
    expect(s.safeParse('2024-02-29').success).toBe(true);
    expect(s.safeParse('2023-02-29').success).toBe(false);
  });
});

describe('lieu', () => {
  it('refuse un code pays de 3 lettres', () => {
    const s = answerSchema({ kind: 'place', key: 'a.b' });
    expect(s.safeParse({ city: 'Libreville', countryCode: 'GAB' }).success).toBe(false);
  });
});

describe('draftTextSchema', () => {
  it('nettoie le texte et le borne à DRAFT_MAX', () => {
    expect(draftTextSchema.parse('  Bonjour  ')).toBe('Bonjour');
    expect(draftTextSchema.safeParse('   ').success).toBe(false);
    expect(draftTextSchema.safeParse('x'.repeat(DRAFT_MAX)).success).toBe(true);
    expect(draftTextSchema.safeParse('x'.repeat(DRAFT_MAX + 1)).success).toBe(false);
    expect(draftTextSchema.safeParse('a\u0000b').success).toBe(false);
  });

  it('refuse un texte dont la taille JSON réelle dépasse la borne', () => {
    expect(draftTextSchema.safeParse('\u0001'.repeat(12_000)).success).toBe(false);
  });
});
