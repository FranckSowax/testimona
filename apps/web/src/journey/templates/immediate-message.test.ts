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
        'Que Dieu l’accueille dans sa miséricorde.',
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
      'It is with great sadness that we announce the death of Jean Ndong ("Papa Jean"), who passed away suddenly on 3 March 2026.',
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

  it('rédige le message croyant complet en anglais', () => {
    expect(
      immediateMessage({
        locale: 'en',
        person,
        answers: {
          'death.date': '2026-03-03',
          'death.mentionCause': 'illness',
          'announce.tone': 'believer',
        },
      }),
    ).toBe(
      [
        'It is with great sadness that we announce the death of Jean Ndong, who passed away on 3 March 2026 after an illness.',
        'May God have mercy on their soul.',
        'We will share the funeral arrangements very soon.',
        'Thank you for keeping our family in your prayers.',
        '— The Ndong family',
      ].join('\n\n'),
    );
  });

  it('couvre les circonstances anglaises illness et accident', () => {
    const first = (cause: string) =>
      immediateMessage({ locale: 'en', person, answers: { 'death.mentionCause': cause } }).split(
        '\n\n',
      )[0];
    expect(first('illness')).toBe(
      'It is with great sadness that we announce the death of Jean Ndong, who passed away after an illness.',
    );
    expect(first('accident')).toBe(
      'It is with great sadness that we announce the death of Jean Ndong, who passed away following an accident.',
    );
  });

  it('cite le surnom en français', () => {
    const text = immediateMessage({
      locale: 'fr',
      person: { ...person, nickname: 'Papa Jean' },
      answers: {},
    });
    expect(text.split('\n\n')[0]).toBe(
      'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong (« Papa Jean »).',
    );
  });

  it('ignore un surnom vide ou identique au prénom', () => {
    const opening =
      'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong.';
    for (const nickname of ['', '   ', 'jean', ' JEAN ']) {
      const text = immediateMessage({ locale: 'fr', person: { ...person, nickname }, answers: {} });
      expect(text.split('\n\n')[0]).toBe(opening);
    }
  });

  it('réduit les espaces des noms et ignore une date impossible', () => {
    const text = immediateMessage({
      locale: 'fr',
      person: { firstName: ' Jean  Pierre ', lastName: ' Ndong  Obame ', nickname: null },
      answers: { 'death.date': '2026-02-31' },
    });
    expect(text.split('\n\n')[0]).toBe(
      'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Pierre Ndong Obame.',
    );
    expect(text.endsWith('— La famille Ndong Obame')).toBe(true);
  });
});
