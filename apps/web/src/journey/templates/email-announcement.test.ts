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
        'Que Dieu l’accueille dans sa miséricorde.',
        'Instituteur aimé de tout Lambaréné.',
        'Veillée le 6 mars à Libreville, inhumation le 7 à Lambaréné.',
        'Plutôt que des fleurs, la famille recevra vos dons avec reconnaissance.',
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

  it('assemble tous les paragraphes en anglais', () => {
    const text = emailAnnouncement({
      locale: 'en',
      person,
      answers: {
        'death.date': '2026-03-03',
        'announce.tone': 'believer',
        'announce.aboutPerson': 'A beloved teacher.',
        'announce.practicalInfo': 'Wake on 6 March in Libreville, burial on 7 March.',
        'announce.flowersOrDonations': 'donations',
      },
    });
    expect(text).toBe(
      [
        'Dear family and friends,',
        'It is with deep sadness that we share the news of the death of Jean Ndong, who passed away on 3 March 2026.',
        'May God have mercy on their soul.',
        'A beloved teacher.',
        'Wake on 6 March in Libreville, burial on 7 March.',
        'In lieu of flowers, the family will gratefully receive donations.',
        'Thank you for your prayers and support.',
        'The Ndong family',
      ].join('\n\n'),
    );
  });

  it('formule les fleurs en français', () => {
    const flowers = (value: string) =>
      emailAnnouncement({
        locale: 'fr',
        person,
        answers: { 'announce.flowersOrDonations': value },
      });
    expect(flowers('flowers')).toContain('Les fleurs seront les bienvenues.');
    expect(flowers('both')).toContain('Fleurs et dons seront reçus avec reconnaissance.');
  });

  it('cite le surnom en français', () => {
    const text = emailAnnouncement({
      locale: 'fr',
      person: { ...person, nickname: 'Papa Jean' },
      answers: {},
    });
    expect(text).toContain('décès de Jean Ndong (« Papa Jean »).');
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
