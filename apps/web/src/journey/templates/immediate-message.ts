import {
  BLESSING,
  deathSentence,
  familyName,
  paragraphs,
  toneOf,
  type DraftContext,
} from './common';

const TEXT = {
  fr: {
    opening: 'C’est avec une immense tristesse que nous vous annonçons le décès de',
    next: 'Nous vous communiquerons très vite les informations sur les obsèques.',
    thanks: {
      believer: 'Merci de vos prières pour notre famille.',
      neutral: 'Merci de vos pensées pour notre famille.',
    },
    signature: (lastName: string) => `La famille ${lastName}`,
  },
  en: {
    opening: 'It is with great sadness that we announce the death of',
    next: 'We will share the funeral arrangements very soon.',
    thanks: {
      believer: 'Thank you for keeping our family in your prayers.',
      neutral: 'Thank you for keeping our family in your thoughts.',
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
    tone === 'believer' ? BLESSING[ctx.locale] : null,
    t.next,
    t.thanks[tone],
    `— ${t.signature(familyName(ctx.person))}`,
  ]);
}
