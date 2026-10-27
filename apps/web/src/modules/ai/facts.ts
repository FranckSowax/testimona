import type { Answers } from '@/journey/progress';

/**
 * Seules réponses du parcours transmises à l'IA.
 * WHY: liste blanche explicite plutôt que « les réponses de l'étape » : une liste de diffusion
 * (contacts, téléphones) ne doit jamais partir, même si une étape future en ajoute une.
 */
export const AI_ANSWER_KEYS = [
  'death.date',
  'death.mentionCause',
  'announce.tone',
  'announce.aboutPerson',
  'announce.practicalInfo',
  'announce.flowersOrDonations',
] as const;

export type AiAnswerKey = (typeof AI_ANSWER_KEYS)[number];

/** Noms et dates de la personne ; rien d'autre de sa fiche n'est transmis. */
export interface AiPerson {
  firstName: string;
  lastName: string;
  nickname: string | null;
  birthDate: string | null;
  deathDate: string | null;
}

export interface AiFacts {
  person: AiPerson;
  answers: Partial<Record<AiAnswerKey, string>>;
}

/**
 * Faits transmis à l'IA : la personne et les réponses de la liste blanche, en texte non vide.
 *
 * @example
 * const facts = aiFacts(person, answers); // jamais broadcast.contacts
 */
export function aiFacts(person: AiPerson, answers: Answers): AiFacts {
  const picked: AiFacts['answers'] = {};
  for (const key of AI_ANSWER_KEYS) {
    const value = answers[key];
    if (typeof value === 'string' && value.trim() !== '') picked[key] = value.trim();
  }
  return {
    person: {
      firstName: person.firstName,
      lastName: person.lastName,
      nickname: person.nickname,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
    },
    answers: picked,
  };
}
