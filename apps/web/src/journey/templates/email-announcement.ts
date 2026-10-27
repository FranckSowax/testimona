import { FLOWERS } from '../options';
import {
  choiceAnswer,
  deathSentence,
  fullName,
  paragraphs,
  textAnswer,
  toneOf,
  type DraftContext,
} from './common';

const TEXT = {
  fr: {
    greeting: 'Chers parents, chers amis,',
    opening: 'C’est avec une profonde tristesse que nous vous faisons part du décès de',
    flowers: {
      flowers: 'Les fleurs seront les bienvenues.',
      donations: 'Plutôt que des fleurs, la famille recevra avec reconnaissance vos dons.',
      both: 'Fleurs et dons seront reçus avec reconnaissance.',
    },
    thanks: {
      believer: 'Nous vous remercions de vos prières et de votre soutien.',
      neutral: 'Nous vous remercions de vos pensées et de votre soutien.',
    },
    signature: (lastName: string) => `La famille ${lastName}`,
    subject: (name: string) => `Décès de ${name}`,
  },
  en: {
    greeting: 'Dear family and friends,',
    opening: 'It is with deep sadness that we share the news of the passing of',
    flowers: {
      flowers: 'Flowers are welcome.',
      donations: 'In lieu of flowers, the family will gratefully receive donations.',
      both: 'Flowers and donations will be gratefully received.',
    },
    thanks: {
      believer: 'Thank you for your prayers and support.',
      neutral: 'Thank you for your thoughts and support.',
    },
    signature: (lastName: string) => `The ${lastName} family`,
    subject: (name: string) => `Passing of ${name}`,
  },
} as const;

/**
 * Corps de l'annonce par e-mail (2.3) : salutation, annonce, quelques mots sur la personne,
 * informations pratiques, fleurs ou dons, remerciements, signature. Tolère toute réponse manquante.
 */
export function emailAnnouncement(ctx: DraftContext): string {
  const t = TEXT[ctx.locale];
  const flowers = choiceAnswer(ctx.answers, 'announce.flowersOrDonations', FLOWERS);
  return paragraphs([
    t.greeting,
    deathSentence(ctx, t.opening),
    textAnswer(ctx.answers, 'announce.aboutPerson'),
    textAnswer(ctx.answers, 'announce.practicalInfo'),
    flowers && flowers !== 'noPreference' ? t.flowers[flowers] : null,
    t.thanks[toneOf(ctx.answers)],
    t.signature(ctx.person.lastName),
  ]);
}

/** Objet de l'annonce par e-mail (recalculé, jamais enregistré). */
export function emailSubject(ctx: DraftContext): string {
  return TEXT[ctx.locale].subject(fullName(ctx.person));
}
