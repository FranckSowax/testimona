import type { Answers } from '@/journey/progress';
import { CAUSES, FLOWERS, type Cause, type Flowers } from '@/journey/options';
import type { DraftKind } from '@/journey/types';

/**
 * Réponses transmises à l'IA (union des deux types de brouillon).
 * WHY: liste blanche explicite plutôt que « les réponses de l'étape » : une liste de diffusion
 * (contacts, téléphones) ne doit jamais partir, même si une étape future en ajoute une.
 */
export const AI_SENT_KEYS = [
  'death.mentionCause',
  'announce.tone',
  'announce.aboutPerson',
  'announce.practicalInfo',
  'announce.flowersOrDonations',
] as const;

/**
 * Clés lues en base par le service : les réponses transmises, plus `death.date`.
 * WHY: `death.date` sert uniquement à `person.deathDate` (une seule date de décès) et
 * n'apparaît jamais dans `answers`.
 */
export const AI_ANSWER_KEYS = ['death.date', ...AI_SENT_KEYS] as const;

/** Clés présentes dans `answers` (hors `death.date`). */
export type AiAnswerKey = (typeof AI_SENT_KEYS)[number];

/**
 * Réponses transmises selon le type de brouillon.
 * WHY: le message WhatsApp est court et ne reprend ni texte libre ni préférence de fleurs ;
 * on n'envoie pas ce que le brouillon ne contient pas.
 */
export const AI_ANSWER_KEYS_BY_KIND: Record<DraftKind, readonly AiAnswerKey[]> = {
  whatsapp: ['death.mentionCause', 'announce.tone'],
  email: AI_SENT_KEYS,
};

const CAUSE_PHRASES: Record<Cause, string> = {
  none: 'do not mention the cause of death',
  illness: 'after an illness',
  sudden: 'sudden death',
  accident: 'in an accident',
};

const FLOWERS_PHRASES: Record<Flowers, string> = {
  flowers: 'flowers are welcome',
  donations: 'donations rather than flowers',
  both: 'flowers or donations',
  noPreference: 'no preference stated',
};

/** Phrase anglaise d'un code de choix ; `undefined` si le code est inconnu. */
function phrase<T extends string>(codes: readonly T[], phrases: Record<T, string>, value: string) {
  const code = codes.find((c) => c === value);
  return code === undefined ? undefined : phrases[code];
}

function convert(key: AiAnswerKey, text: string): string | undefined {
  if (key === 'death.mentionCause') return phrase(CAUSES, CAUSE_PHRASES, text);
  if (key === 'announce.flowersOrDonations') return phrase(FLOWERS, FLOWERS_PHRASES, text);
  // WHY: les champs libres (aboutPerson, practicalInfo) peuvent contenir un numéro que la
  // famille veut publier ; ils sont déjà recopiés dans le brouillon e-mail, donc pas
  // d'exposition nouvelle. Pas d'expurgation par regex (fragile, fausse impression de sécurité).
  return text;
}

/** Noms et dates de la personne ; rien d'autre de sa fiche n'est transmis. */
export interface AiPerson {
  firstName: string;
  lastName: string;
  nickname: string | null;
  deathDate: string | null;
}

export interface AiFacts {
  person: AiPerson;
  answers: Partial<Record<AiAnswerKey, string>>;
}

/**
 * Faits transmis à l'IA : la personne (avec une seule date de décès) et les réponses de la liste
 * blanche du type de brouillon, en texte non vide, les codes de choix étant écrits en anglais.
 *
 * @example
 * const facts = aiFacts('email', person, answers); // jamais broadcast.contacts
 */
export function aiFacts(kind: DraftKind, person: AiPerson, answers: Answers): AiFacts {
  const picked: AiFacts['answers'] = {};
  for (const key of AI_ANSWER_KEYS_BY_KIND[kind]) {
    const value = answers[key];
    if (typeof value !== 'string' || value.trim() === '') continue;
    const text = convert(key, value.trim());
    if (text !== undefined) picked[key] = text;
  }
  const answeredDeath = answers['death.date'];
  return {
    person: {
      firstName: person.firstName,
      lastName: person.lastName,
      nickname: person.nickname,
      deathDate:
        typeof answeredDeath === 'string' && answeredDeath.trim() !== ''
          ? answeredDeath.trim()
          : person.deathDate,
    },
    answers: picked,
  };
}
