import { describe, expect, it } from 'vitest';
import { emailAnnouncement, emailSubject } from './email-announcement';

const person = { firstName: 'Jean', lastName: 'Ndong', nickname: null };

describe('emailAnnouncement', () => {
  it('assemble tous les paragraphes disponibles en français', () => {
    const text = emailAnnouncement({
      locale: 'fr',
      person,
      answers: {
        'death.date': '2026-03-03',
        'announce.tone': 'believer',
        'announce.aboutPerson': 'Instituteur aimé de tout Lambaréné.',
        'announce.practicalInfo': 'Veillée le 6 mars à Libreville, inhumation le 7 à Lambaréné.',
        'announce.flowersOrDonations': 'donations',
      },
    });
    expect(text).toBe(
      [
        'Chers parents, chers amis,',
        'C’est avec une profonde tristesse que nous vous faisons part du décès de Jean Ndong, survenu le 3 mars 2026.',
        'Instituteur aimé de tout Lambaréné.',
        'Veillée le 6 mars à Libreville, inhumation le 7 à Lambaréné.',
        'Plutôt que des fleurs, la famille recevra avec reconnaissance vos dons.',
        'Nous vous remercions de vos prières et de votre soutien.',
        'La famille Ndong',
      ].join('\n\n'),
    );
  });

  it('omet les paragraphes sans réponse et « pas de préférence »', () => {
    const text = emailAnnouncement({
      locale: 'fr',
      person,
      answers: { 'announce.flowersOrDonations': 'noPreference', 'announce.aboutPerson': '   ' },
    });
    expect(text).toBe(
      [
        'Chers parents, chers amis,',
        'C’est avec une profonde tristesse que nous vous faisons part du décès de Jean Ndong.',
        'Nous vous remercions de vos pensées et de votre soutien.',
        'La famille Ndong',
      ].join('\n\n'),
    );
  });

  it('rédige en anglais', () => {
    const text = emailAnnouncement({
      locale: 'en',
      person,
      answers: { 'announce.flowersOrDonations': 'both' },
    });
    expect(text).toContain('Dear family and friends,');
    expect(text).toContain('Flowers and donations will be gratefully received.');
    expect(text.endsWith('The Ndong family')).toBe(true);
  });
});

describe('emailSubject', () => {
  it('nomme la personne dans les deux langues', () => {
    expect(emailSubject({ locale: 'fr', person, answers: {} })).toBe('Décès de Jean Ndong');
    expect(emailSubject({ locale: 'en', person, answers: {} })).toBe('Passing of Jean Ndong');
  });
});
