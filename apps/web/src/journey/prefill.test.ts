import { describe, expect, it } from 'vitest';
import { defineStep, q } from './define';
import { initialStored, prefillKeys } from './prefill';
import { SKIPPED } from './types';

const tone = q.choice('ceremony.tone', ['believer', 'neutral'], { prefillFrom: 'announce.tone' });

describe('initialStored', () => {
  it('renvoie la réponse de la question si elle existe', () => {
    expect(initialStored(tone, { 'ceremony.tone': 'neutral', 'announce.tone': 'believer' })).toBe(
      'neutral',
    );
  });

  it('garde une réponse « passée » plutôt que de préremplir', () => {
    expect(initialStored(tone, { 'ceremony.tone': SKIPPED, 'announce.tone': 'believer' })).toBe(
      SKIPPED,
    );
  });

  it('reprend la réponse source si c’est une option valide', () => {
    expect(initialStored(tone, { 'announce.tone': 'believer' })).toBe('believer');
  });

  it('ignore une réponse source absente, passée ou hors des options', () => {
    expect(initialStored(tone, {})).toBeUndefined();
    expect(initialStored(tone, { 'announce.tone': SKIPPED })).toBeUndefined();
    expect(initialStored(tone, { 'announce.tone': 'joyful' })).toBeUndefined();
    expect(initialStored(tone, { 'announce.tone': 42 })).toBeUndefined();
  });

  it('ne préremplit pas une question sans prefillFrom', () => {
    const plain = q.choice('ceremony.tone', ['believer', 'neutral']);
    expect(initialStored(plain, { 'announce.tone': 'believer' })).toBeUndefined();
    expect(initialStored(q.shortText('demo.text'), { 'demo.text': 'Bonjour' })).toBe('Bonjour');
  });
});

describe('prefillKeys', () => {
  it('liste les clés sources des questions de l’étape, sans doublon', () => {
    const step = defineStep({
      id: 'demo',
      questions: [
        q.shortText('demo.text'),
        tone,
        q.choice('demo.other', ['believer'], { prefillFrom: 'announce.tone' }),
      ],
    });
    expect(prefillKeys(step)).toEqual(['announce.tone']);
  });

  it('renvoie une liste vide sans préremplissage', () => {
    expect(prefillKeys(defineStep({ id: 'demo', questions: [q.shortText('demo.a')] }))).toEqual([]);
  });
});
