import { describe, expect, it } from 'vitest';
import { answerSchema, isSkipped, SKIPPED, type Question } from './types';

const place: Question = { kind: 'place', key: 'biography.birthPlace' };
const traits: Question = {
  kind: 'list',
  key: 'biography.traits',
  maxItems: 2,
  fields: [
    { name: 'trait', kind: 'shortText', required: true },
    { name: 'anecdote', kind: 'longText' },
  ],
};

describe('answerSchema', () => {
  it('refuse un texte court vide ou trop long, et le nettoie', () => {
    const s = answerSchema({ kind: 'shortText', key: 'biography.motto' });
    expect(s.safeParse('   ').success).toBe(false);
    expect(s.safeParse('x'.repeat(201)).success).toBe(false);
    expect(s.parse('  Toujours debout  ')).toBe('Toujours debout');
  });

  it('accepte un texte long jusqu’à 4000 caractères', () => {
    const s = answerSchema({ kind: 'longText', key: 'biography.career' });
    expect(s.safeParse('x'.repeat(4000)).success).toBe(true);
    expect(s.safeParse('x'.repeat(4001)).success).toBe(false);
  });

  it('n’accepte qu’une vraie date du calendrier au format AAAA-MM-JJ', () => {
    const s = answerSchema({ kind: 'date', key: 'death.date' });
    expect(s.safeParse('2026-02-28').success).toBe(true);
    expect(s.safeParse('2026-02-30').success).toBe(false);
    expect(s.safeParse('28/02/2026').success).toBe(false);
  });

  it('limite un choix à ses options', () => {
    const s = answerSchema({
      kind: 'choice',
      key: 'announce.tone',
      options: ['believer', 'neutral'],
    });
    expect(s.safeParse('neutral').success).toBe(true);
    expect(s.safeParse('joyful').success).toBe(false);
  });

  it('normalise un lieu et refuse les champs inconnus', () => {
    const s = answerSchema(place);
    expect(s.parse({ city: ' Libreville ', countryCode: 'ga' })).toEqual({
      city: 'Libreville',
      countryCode: 'GA',
    });
    expect(s.safeParse({ city: 'Libreville', countryCode: 'GA', extra: 1 }).success).toBe(false);
    expect(s.safeParse({ city: '', countryCode: 'GA' }).success).toBe(false);
  });

  it('valide les éléments d’une liste et leur nombre', () => {
    const s = answerSchema(traits);
    // WHY: le champ vide ressort à `undefined` ; le JSON (ce qui est stocké) l'omet.
    const parsed = s.parse([{ trait: 'Généreux', anecdote: '' }]);
    expect(JSON.parse(JSON.stringify(parsed))).toStrictEqual([{ trait: 'Généreux' }]);
    expect(s.safeParse([]).success).toBe(false);
    expect(s.safeParse([{ trait: 'a' }, { trait: 'b' }, { trait: 'c' }]).success).toBe(false);
    expect(s.safeParse([{ anecdote: 'sans trait' }]).success).toBe(false);
  });

  it('accepte une case à cocher et un choix facultatif dans une liste', () => {
    const s = answerSchema({
      kind: 'list',
      key: 'broadcast.contacts',
      maxItems: 5,
      fields: [
        { name: 'name', kind: 'shortText', required: true },
        { name: 'circle', kind: 'choice', options: ['close_family', 'other'] },
        { name: 'priority', kind: 'boolean' },
      ],
    });
    expect(s.parse([{ name: 'Marie' }])).toEqual([{ name: 'Marie', priority: false }]);
    const empty = s.parse([{ name: 'Marie', circle: '' }]);
    expect(JSON.parse(JSON.stringify(empty))).toStrictEqual([{ name: 'Marie', priority: false }]);
    expect(s.safeParse([{ name: 'Marie', circle: 'unknown' }]).success).toBe(false);
  });
});

describe('isSkipped', () => {
  it('reconnaît exactement la réponse « passée »', () => {
    expect(isSkipped(SKIPPED)).toBe(true);
    expect(isSkipped({ skipped: false })).toBe(false);
    expect(isSkipped({ skipped: true, extra: 1 })).toBe(false);
    expect(isSkipped('skipped')).toBe(false);
  });
});

describe('answerSchema : nombre', () => {
  const guests: Question = { kind: 'number', key: 'attendance.close', min: 0, max: 2000 };
  const issue = (value: unknown) => answerSchema(guests).safeParse(value).error?.issues[0]?.message;

  it('accepte un entier ou une chaîne de chiffres, et rend un nombre', () => {
    expect(answerSchema(guests).parse(12)).toBe(12);
    expect(answerSchema(guests).parse(' 12 ')).toBe(12);
    expect(answerSchema(guests).parse(0)).toBe(0);
  });

  it('refuse un nombre mal formé', () => {
    expect(issue('-3')).toBe('invalid number');
    expect(issue('1.5')).toBe('invalid number');
    expect(issue(1.5)).toBe('invalid number');
    expect(issue('abc')).toBe('invalid number');
    expect(issue(true)).toBe('invalid number');
  });

  it('refuse un nombre hors des bornes', () => {
    expect(issue(2001)).toBe('out of range');
    expect(issue(-1)).toBe('out of range');
  });
});
