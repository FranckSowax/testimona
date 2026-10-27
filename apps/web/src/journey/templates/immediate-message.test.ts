import { describe, expect, it } from 'vitest';
import { immediateMessage } from './immediate-message';

const person = { firstName: 'Jean', lastName: 'Ndong', nickname: null };

describe('immediateMessage', () => {
  it('rédige le message croyant complet en français', () => {
    const text = immediateMessage({
      locale: 'fr',
      person,
      answers: {
        'death.date': '2026-03-03',
        'death.mentionCause': 'illness',
        'announce.tone': 'believer',
      },
    });
    expect(text).toBe(
      [
        'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong, survenu le 3 mars 2026 des suites d’une maladie.',
        'Que Dieu l’accueille dans sa paix.',
        'Nous vous communiquerons très vite les informations sur les obsèques.',
        'Merci de vos prières pour notre famille.',
        '— La famille Ndong',
      ].join('\n\n'),
    );
  });

  it('reste neutre et sobre sans réponses', () => {
    expect(immediateMessage({ locale: 'fr', person, answers: {} })).toBe(
      [
        'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong.',
        'Nous vous communiquerons très vite les informations sur les obsèques.',
        'Merci de vos pensées pour notre famille.',
        '— La famille Ndong',
      ].join('\n\n'),
    );
  });

  it('ignore les réponses passées, inconnues ou « ne pas mentionner »', () => {
    const text = immediateMessage({
      locale: 'fr',
      person,
      answers: {
        'death.date': { skipped: true },
        'death.mentionCause': 'none',
        'announce.tone': 'joyful',
      },
    });
    expect(text.split('\n\n')[0]).toBe(
      'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong.',
    );
    expect(text).toContain('Merci de vos pensées');
  });

  it('cite le surnom et rédige en anglais', () => {
    const text = immediateMessage({
      locale: 'en',
      person: { ...person, nickname: 'Papa Jean' },
      answers: { 'death.date': '2026-03-03', 'death.mentionCause': 'sudden' },
    });
    expect(text.split('\n\n')[0]).toBe(
      'It is with great sadness that we announce the passing of Jean Ndong ("Papa Jean"), on 3 March 2026, suddenly.',
    );
    expect(text.endsWith('— The Ndong family')).toBe(true);
  });

  it('mentionne la circonstance sans date', () => {
    const text = immediateMessage({
      locale: 'fr',
      person,
      answers: { 'death.mentionCause': 'accident' },
    });
    expect(text.split('\n\n')[0]).toBe(
      'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong, survenu des suites d’un accident.',
    );
  });
});
