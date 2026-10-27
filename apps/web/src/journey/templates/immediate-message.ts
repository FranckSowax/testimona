import { deathSentence, paragraphs, toneOf, type DraftContext } from './common';

const TEXT = {
  fr: {
    opening: 'C’est avec une immense tristesse que nous vous annonçons le décès de',
    blessing: 'Que Dieu l’accueille dans sa paix.',
    next: 'Nous vous communiquerons très vite les informations sur les obsèques.',
    thanks: {
      believer: 'Merci de vos prières pour notre famille.',
      neutral: 'Merci de vos pensées pour notre famille.',
    },
    signature: (lastName: string) => `La famille ${lastName}`,
  },
  en: {
    opening: 'It is with great sadness that we announce the passing of',
    blessing: 'May God grant them eternal rest.',
    next: 'We will share the funeral arrangements very soon.',
    thanks: {
      believer: 'Thank you for your prayers for our family.',
      neutral: 'Thank you for your thoughts for our family.',
    },
    signature: (lastName: string) => `The ${lastName} family`,
  },
} as const;

/**
 * Message immédiat (2.2), à partager par WhatsApp ou SMS. Tolère toute réponse manquante.
 *
 * @example
 * immediateMessage({ locale: 'fr', person, answers }) // « C’est avec une immense tristesse… »
 */
export function immediateMessage(ctx: DraftContext): string {
  const t = TEXT[ctx.locale];
  const tone = toneOf(ctx.answers);
  return paragraphs([
    deathSentence(ctx, t.opening),
    tone === 'believer' ? t.blessing : null,
    t.next,
    t.thanks[tone],
    `— ${t.signature(ctx.person.lastName)}`,
  ]);
}
