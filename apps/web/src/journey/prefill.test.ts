import { describe, expect, it } from 'vitest';
import { defineStep, q } from './define';
import { initialStored, prefillKeys, screenState } from './prefill';
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

  it('ajoute les réponses lues par un programme type', () => {
    const step = defineStep({
      id: 'demo',
      questions: [
        q.list('demo.items', [{ name: 'time', kind: 'time' }], 10, { starter: 'ceremonyProgram' }),
      ],
    });
    expect(prefillKeys(step)).toEqual(
      expect.arrayContaining(['ceremony.tone', 'announce.tone', 'ceremony.servicePlace']),
    );
  });

  it('renvoie une liste vide sans préremplissage', () => {
    expect(prefillKeys(defineStep({ id: 'demo', questions: [q.shortText('demo.a')] }))).toEqual([]);
  });
});

describe('initialStored : null', () => {
  it('traite une réponse null comme non répondue', () => {
    expect(initialStored(tone, { 'ceremony.tone': null, 'announce.tone': 'believer' })).toBe(
      'believer',
    );
    expect(initialStored(tone, { 'ceremony.tone': null })).toBeUndefined();
  });
});

describe('screenState', () => {
  const step = defineStep({
    id: 'demo',
    questions: [q.shortText('demo.text'), tone],
  });

  it('préremplit pour un rédacteur, sans compter la valeur comme répondue', () => {
    const answers = { 'demo.text': 'Bonjour', 'announce.tone': 'believer' };
    expect(screenState(step, answers, undefined, true)).toEqual({ index: 1, stored: 'believer' });
  });

  it('montre à un lecteur la seule réponse enregistrée', () => {
    const answers = { 'demo.text': 'Bonjour', 'announce.tone': 'believer' };
    expect(screenState(step, answers, '1', false)).toEqual({ index: 1, stored: undefined });
    expect(screenState(step, { ...answers, 'ceremony.tone': 'neutral' }, '1', false)).toEqual({
      index: 1,
      stored: 'neutral',
    });
  });

  it('garde une réponse « passée » plutôt que la valeur préremplie', () => {
    const answers = {
      'demo.text': 'Bonjour',
      'ceremony.tone': SKIPPED,
      'announce.tone': 'neutral',
    };
    expect(screenState(step, answers, undefined, true)).toEqual({ index: 1, stored: SKIPPED });
  });

  it('calcule la progression sans la clé source', () => {
    // WHY: la valeur reprise de la clé source ne rend pas « ceremony.tone » traitée ; seules
    // les réponses de l'étape comptent.
    const answers = { 'announce.tone': 'believer' };
    expect(screenState(step, answers, undefined, true).index).toBe(0);
    const done = { 'demo.text': 'Bonjour', 'announce.tone': 'believer' };
    expect(screenState(step, done, undefined, false).index).toBe(1);
  });
});
