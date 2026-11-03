import { describe, expect, it } from 'vitest';
import { DOCUMENT_AI_KEYS, documentFacts } from './documents-facts';

const PERSON = {
  firstName: 'Jean',
  lastName: 'Ndong',
  nickname: 'Papa Jo',
  birthDate: '1950-02-14',
  deathDate: '2026-10-01',
};

const ANSWERS = {
  'ceremony.tone': 'believer',
  'announce.tone': 'neutral',
  'biography.birthPlace': 'Oyem',
  'biography.parents': 'Fils de Marie et de Paul.',
  'biography.career': 'Instituteur pendant trente ans.',
  'biography.traits': [
    { trait: 'Généreux', anecdote: 'Il partageait toujours son repas.' },
    { trait: '  ', anecdote: 'ignorée' },
    { trait: 'Patient', anecdote: '' },
  ],
  'biography.passions': 'Le football et les échecs.',
  'biography.motto': 'Toujours debout.',
  'ceremony.date': '2026-10-12',
  'ceremony.servicePlace': 'Cathédrale Sainte-Marie',
  'ceremony.burialPlace': 'Cimetière de Lalala',
  'ceremony.program': [{ time: '09:00', moment: 'Accueil', place: 'Domicile familial' }],
  'broadcast.contacts': [{ name: 'Marie', phone: '+241 01 23 45 67' }],
  'broadcast.message': 'Liste privée',
};

describe('DOCUMENT_AI_KEYS', () => {
  it('ne contient ni date, ni lieu, ni programme, ni diffusion', () => {
    for (const key of DOCUMENT_AI_KEYS) {
      expect(key).not.toMatch(/date|place|program|broadcast/i);
    }
  });
});

describe('documentFacts', () => {
  it('garde le prénom, le surnom, le ton de la cérémonie et la biographie', () => {
    expect(documentFacts(PERSON, ANSWERS)).toEqual({
      person: { firstName: 'Jean', nickname: 'Papa Jo' },
      tone: 'believer',
      biography: {
        parents: 'Fils de Marie et de Paul.',
        career: 'Instituteur pendant trente ans.',
        passions: 'Le football et les échecs.',
        motto: 'Toujours debout.',
        traits: [
          { trait: 'Généreux', anecdote: 'Il partageait toujours son repas.' },
          { trait: 'Patient' },
        ],
      },
    });
  });

  it("n'envoie ni le nom, ni une date, ni un lieu, ni le programme, ni la diffusion", () => {
    const json = JSON.stringify(documentFacts(PERSON, ANSWERS));
    for (const forbidden of [
      'Ndong',
      '1950',
      '2026',
      'Oyem',
      'Cathédrale',
      'Lalala',
      'Domicile familial',
      '09:00',
      '+241',
      'Liste privée',
      'birthPlace',
      'ceremony.',
      'broadcast',
      'lastName',
      'Date',
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });

  it('se rabat sur le ton des annonces, puis sur null', () => {
    expect(documentFacts(PERSON, { 'announce.tone': 'neutral' }).tone).toBe('neutral');
    expect(
      documentFacts(PERSON, { 'ceremony.tone': 'inconnu', 'announce.tone': 'believer' }).tone,
    ).toBe('believer');
    expect(documentFacts(PERSON, {}).tone).toBeNull();
  });

  it('ignore les réponses vides, passées ou mal formées', () => {
    const facts = documentFacts(
      { firstName: ' Jean ', nickname: '  ' },
      {
        'biography.parents': '   ',
        'biography.career': { skipped: true },
        'biography.traits': 'pas une liste',
        'biography.motto': 42,
      },
    );
    expect(facts).toEqual({
      person: { firstName: 'Jean', nickname: null },
      tone: null,
      biography: {},
    });
  });

  it('plafonne les traits à dix', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ trait: `Trait ${i}` }));
    expect(documentFacts(PERSON, { 'biography.traits': many }).biography.traits).toHaveLength(10);
  });
});
