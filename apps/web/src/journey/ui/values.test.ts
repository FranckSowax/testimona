import { describe, expect, it } from 'vitest';
import { SKIPPED, type ListQuestion, type Question } from '../types';
import { compact, isBlank, keptIndices, missingRequired, toEditable } from './values';

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

describe('toEditable : réponses enregistrées devenues invalides', () => {
  it('ignore un lieu dont les champs ne sont pas des chaînes', () => {
    expect(toEditable(place, { city: 3, countryCode: 'GA' }, 'CM')).toEqual({
      city: '',
      countryCode: 'CM',
    });
  });

  it('ne garde des éléments de liste que les champs de la question', () => {
    const stored = [{ trait: 'Drôle', extra: 'x', priority: 'oui' }];
    expect(toEditable(traits, stored, 'GA')).toEqual([
      { trait: 'Drôle', anecdote: '', priority: false },
    ]);
  });

  it('repart d’un champ vide si le choix enregistré n’existe plus', () => {
    const choice: Question = { kind: 'choice', key: 'a.b', options: ['x', 'y'] };
    expect(toEditable(choice, 'z', 'GA')).toBe('');
    expect(toEditable(choice, 'y', 'GA')).toBe('y');
  });
});

describe('keptIndices et missingRequired', () => {
  it('indique les éléments conservés et les champs obligatoires manquants', () => {
    const items = [{ trait: 'A' }, { trait: '' }, { trait: ' ', anecdote: 'souvenir' }];
    expect(keptIndices(items)).toEqual([0, 2]);
    expect(missingRequired(traits, items)).toEqual(['2.trait']);
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
