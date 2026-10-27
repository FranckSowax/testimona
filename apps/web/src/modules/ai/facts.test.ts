import { describe, expect, it } from 'vitest';
import { findQuestion } from '@/journey/registry';
import { SKIPPED } from '@/journey/types';
import { AI_ANSWER_KEYS, aiFacts } from './facts';

const person = {
  firstName: 'Jean',
  lastName: 'Ndong',
  nickname: 'Papa Jean',
  birthDate: '1950-02-01',
  deathDate: '2026-10-01',
};

describe('aiFacts', () => {
  it('ne garde que les réponses de la liste blanche, jamais les contacts', () => {
    const facts = aiFacts(person, {
      'death.date': '2026-10-01',
      'announce.tone': 'believer',
      'broadcast.contacts': [{ name: 'Marie', phone: '+241 01 23 45 67' }],
      'announce.whatsapp.text': 'Brouillon enregistré',
      'biography.motto': 'Toujours debout',
    });
    expect(facts.answers).toEqual({ 'death.date': '2026-10-01', 'announce.tone': 'believer' });
    expect(JSON.stringify(facts)).not.toContain('+241');
    expect(JSON.stringify(facts)).not.toContain('Marie');
  });

  it('écarte les réponses passées, vides ou qui ne sont pas du texte', () => {
    const facts = aiFacts(person, {
      'death.mentionCause': SKIPPED,
      'announce.aboutPerson': '   ',
      'announce.practicalInfo': 42,
      'announce.flowersOrDonations': ' flowers ',
    });
    expect(facts.answers).toEqual({ 'announce.flowersOrDonations': 'flowers' });
  });

  it('transmet seulement les noms et dates de la personne', () => {
    const facts = aiFacts({ ...person, extra: 'secret' } as typeof person, {});
    expect(facts.person).toEqual(person);
  });

  it('liste uniquement des questions du registre qui ne sont pas des listes', () => {
    for (const key of AI_ANSWER_KEYS) {
      const found = findQuestion(key);
      expect(found, key).toBeDefined();
      expect(found?.question.kind, key).not.toBe('list');
    }
  });
});
