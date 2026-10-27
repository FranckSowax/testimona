import { describe, expect, it } from 'vitest';
import { findQuestion } from '@/journey/registry';
import { SKIPPED } from '@/journey/types';
import { AI_ANSWER_KEYS, AI_ANSWER_KEYS_BY_KIND, aiFacts } from './facts';

const person = {
  firstName: 'Jean',
  lastName: 'Ndong',
  nickname: 'Papa Jean',
  deathDate: '2026-10-01',
};

describe('aiFacts', () => {
  it('ne garde que les réponses de la liste blanche, jamais les contacts', () => {
    const facts = aiFacts('email', person, {
      'announce.tone': 'believer',
      'broadcast.contacts': [{ name: 'Marie', phone: '+241 01 23 45 67' }],
      'announce.whatsapp.text': 'Brouillon enregistré',
      'biography.motto': 'Toujours debout',
    });
    expect(facts.answers).toEqual({ 'announce.tone': 'believer' });
    expect(JSON.stringify(facts)).not.toContain('+241');
    expect(JSON.stringify(facts)).not.toContain('Marie');
  });

  it("pour WhatsApp, n'envoie ni texte libre ni préférence de fleurs", () => {
    const facts = aiFacts('whatsapp', person, {
      'announce.tone': 'neutral',
      'announce.aboutPerson': 'Un homme bon',
      'announce.practicalInfo': 'Appeler le 01 02 03 04',
      'announce.flowersOrDonations': 'flowers',
    });
    expect(facts.answers).toEqual({ 'announce.tone': 'neutral' });
    for (const key of AI_ANSWER_KEYS_BY_KIND.whatsapp) expect(AI_ANSWER_KEYS).toContain(key);
  });

  it('écarte les réponses passées, vides ou qui ne sont pas du texte', () => {
    const facts = aiFacts('email', person, {
      'death.mentionCause': SKIPPED,
      'announce.aboutPerson': '   ',
      'announce.practicalInfo': 42,
      'announce.flowersOrDonations': 'flowers',
    });
    expect(facts.answers).toEqual({ 'announce.flowersOrDonations': 'flowers are welcome' });
  });

  it('convertit les codes de choix en phrases et écarte les codes inconnus', () => {
    const facts = aiFacts('email', person, {
      'death.mentionCause': 'none',
      'announce.flowersOrDonations': 'donations',
    });
    expect(facts.answers).toEqual({
      'death.mentionCause': 'do not mention the cause of death',
      'announce.flowersOrDonations': 'donations rather than flowers',
    });
    const unknown = aiFacts('email', person, { 'death.mentionCause': 'poison' });
    expect(unknown.answers).toEqual({});
  });

  it('garde le texte libre tel quel, nettoyé des espaces', () => {
    const facts = aiFacts('email', person, { 'announce.aboutPerson': ' Un homme bon ' });
    expect(facts.answers['announce.aboutPerson']).toBe('Un homme bon');
  });

  it('utilise la date de décès de la réponse, sinon celle de la fiche', () => {
    expect(aiFacts('email', person, { 'death.date': '2026-10-05' }).person.deathDate).toBe(
      '2026-10-05',
    );
    expect(aiFacts('email', person, { 'death.date': '  ' }).person.deathDate).toBe('2026-10-01');
    expect(aiFacts('email', person, {}).answers).not.toHaveProperty('death.date');
  });

  it('transmet seulement les noms et la date de décès, sans date de naissance', () => {
    const facts = aiFacts('email', { ...person, birthDate: '1950-02-01', extra: 'x' } as never, {});
    expect(facts.person).toEqual(person);
  });

  it('liste uniquement des questions du registre de type texte, choix ou date', () => {
    for (const key of AI_ANSWER_KEYS) {
      const found = findQuestion(key);
      expect(found, key).toBeDefined();
      expect(['longText', 'choice', 'date'], key).toContain(found?.question.kind);
    }
  });
});
