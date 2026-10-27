import { describe, expect, it } from 'vitest';
import { SKIPPED, type ListQuestion, type Question } from '../types';
import { compact, isBlank, toEditable } from './values';

const traits: ListQuestion = {
  kind: 'list',
  key: 'biography.traits',
  maxItems: 10,
  fields: [
    { name: 'trait', kind: 'shortText', required: true },
    { name: 'anecdote', kind: 'longText' },
    { name: 'priority', kind: 'boolean' },
  ],
};
const place: Question = { kind: 'place', key: 'biography.birthPlace' };

describe('toEditable', () => {
  it('reprend la réponse enregistrée', () => {
    expect(toEditable({ kind: 'shortText', key: 'a.b' }, 'Debout', 'GA')).toBe('Debout');
    expect(toEditable(place, { city: 'Oyem', countryCode: 'GA' }, 'CM')).toEqual({
      city: 'Oyem',
      countryCode: 'GA',
    });
  });

  it('part d’un champ vide pour une question passée ou sans réponse', () => {
    expect(toEditable({ kind: 'longText', key: 'a.b' }, SKIPPED, 'GA')).toBe('');
    expect(toEditable(place, undefined, 'GA')).toEqual({ city: '', countryCode: 'GA' });
    expect(toEditable(traits, SKIPPED, 'GA')).toEqual([
      { trait: '', anecdote: '', priority: false },
    ]);
  });
});

describe('isBlank et compact', () => {
  it('considère vide un texte d’espaces, un lieu sans ville, une liste sans saisie', () => {
    expect(isBlank('   ')).toBe(true);
    expect(isBlank({ city: ' ', countryCode: 'GA' })).toBe(true);
    expect(isBlank([{ trait: '', anecdote: ' ', priority: true }])).toBe(true);
    expect(isBlank([{ trait: 'Drôle', anecdote: '' }])).toBe(false);
  });

  it('retire les éléments vides d’une liste avant l’envoi', () => {
    expect(compact([{ trait: 'Drôle' }, { trait: '', anecdote: '' }])).toEqual([
      { trait: 'Drôle' },
    ]);
    expect(compact('texte')).toBe('texte');
  });
});
