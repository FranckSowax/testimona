import { describe, expect, it } from 'vitest';
import type { Step } from './types';
import {
  assertUniqueSteps,
  findQuestion,
  getStep,
  isStepOpen,
  personStatus,
  stepsFor,
} from './registry';

describe('registre du parcours', () => {
  it('annonce d’abord, puis raconte, pour la porte décès', () => {
    expect(stepsFor('death').map((s) => s.id)).toEqual([
      'broadcast-list',
      'immediate-message',
      'email-announcement',
      'biography',
    ]);
    expect(stepsFor('prepare').map((s) => s.id)).toEqual(['biography']);
    expect(stepsFor('after')).toEqual([]);
    expect(isStepOpen('prepare', 'immediate-message')).toBe(false);
    expect(isStepOpen('death', 'biography')).toBe(true);
  });

  it('pose les questions des étapes 2.x avec les clés de la spec', () => {
    expect(getStep('broadcast-list')?.questions.map((q) => q.key)).toEqual(['broadcast.contacts']);
    expect(getStep('immediate-message')?.questions.map((q) => q.key)).toEqual([
      'death.date',
      'death.mentionCause',
      'announce.tone',
    ]);
    expect(getStep('email-announcement')?.questions.map((q) => q.key)).toEqual([
      'announce.aboutPerson',
      'announce.practicalInfo',
      'announce.flowersOrDonations',
    ]);
  });

  it('associe un brouillon WhatsApp à 2.2 et un brouillon e-mail à 2.3', () => {
    expect(getStep('immediate-message')?.draft).toEqual({
      key: 'announce.whatsapp.text',
      kind: 'whatsapp',
    });
    expect(getStep('email-announcement')?.draft).toEqual({
      key: 'announce.email.text',
      kind: 'email',
    });
    expect(getStep('broadcast-list')?.draft).toBeUndefined();
  });

  it('décrit chaque contact de la liste de diffusion', () => {
    const contacts = findQuestion('broadcast.contacts')?.question;
    expect(contacts).toMatchObject({ kind: 'list', maxItems: 80 });
    expect(contacts?.kind === 'list' && contacts.fields.map((f) => [f.name, f.kind])).toEqual([
      ['name', 'shortText'],
      ['phone', 'shortText'],
      ['circle', 'choice'],
      ['caller', 'shortText'],
      ['priority', 'boolean'],
    ]);
  });

  it('pose les six questions de la biographie dans l’ordre de la spec', () => {
    expect(getStep('biography')?.questions.map((q) => q.key)).toEqual([
      'biography.birthPlace',
      'biography.parents',
      'biography.career',
      'biography.traits',
      'biography.passions',
      'biography.motto',
    ]);
  });

  it('retrouve une question par sa clé', () => {
    const found = findQuestion('biography.traits');
    expect(found?.step.id).toBe('biography');
    expect(found?.index).toBe(3);
    expect(found?.question.kind).toBe('list');
  });

  it('ignore une clé ou une étape inconnue', () => {
    expect(findQuestion('biography.unknown')).toBeUndefined();
    expect(findQuestion('creator.relationship')).toBeUndefined();
    expect(getStep('nope')).toBeUndefined();
  });

  it('considère la personne vivante seulement pour la porte préparer', () => {
    expect(personStatus('prepare')).toBe('alive');
    expect(personStatus('death')).toBe('deceased');
    expect(personStatus('after')).toBe('deceased');
  });

  it('fixe la forme de la question biography.traits', () => {
    expect(findQuestion('biography.traits')?.question).toEqual({
      kind: 'list',
      key: 'biography.traits',
      maxItems: 10,
      fields: [
        { name: 'trait', kind: 'shortText', required: true },
        { name: 'anecdote', kind: 'longText' },
      ],
    });
  });

  describe('assertUniqueSteps', () => {
    const step = (id: string, ...keys: string[]): Step => ({
      id,
      questions: keys.map((key) => ({ kind: 'shortText' as const, key })),
    });

    it('refuse deux étapes de même id', () => {
      expect(() => assertUniqueSteps([step('a', 'a.one'), step('a', 'a.two')])).toThrow(/a/);
    });

    it('refuse une même clé dans deux étapes', () => {
      expect(() => assertUniqueSteps([step('a', 'x.key'), step('b', 'x.key')])).toThrow(/x\.key/);
    });

    it('accepte le registre réel', () => {
      expect(() => assertUniqueSteps(stepsFor('death'))).not.toThrow();
    });
  });
});

describe('assertUniqueSteps et brouillons', () => {
  it('refuse une clé de brouillon déjà utilisée par une autre étape', () => {
    const a: Step = { id: 'a', questions: [], draft: { key: 'shared.text', kind: 'email' } };
    const b: Step = { id: 'b', questions: [{ kind: 'shortText', key: 'shared.text' }] };
    expect(() => assertUniqueSteps([a, b])).toThrow(/shared\.text/);
  });
});
