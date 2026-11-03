import { TONES, type Tone } from '@/journey/options';
import type { Answers } from '@/journey/progress';

/**
 * Réponses lues en base pour rédiger les textes du livret (étape 3.5).
 * WHY: liste blanche explicite, comme `AI_SENT_KEYS` : ni lieu de naissance, ni lieux et programme
 * de la cérémonie (3.4), ni liste de diffusion (`broadcast.*`), ni aucune date ne doivent partir,
 * même si une étape future ajoute une réponse voisine.
 */
export const DOCUMENT_AI_KEYS = [
  'ceremony.tone',
  'announce.tone',
  'biography.parents',
  'biography.career',
  'biography.traits',
  'biography.passions',
  'biography.motto',
] as const;

/** Réponses texte libre de la biographie transmises telles quelles (nettoyées). */
const BIOGRAPHY_TEXT_KEYS = {
  parents: 'biography.parents',
  career: 'biography.career',
  passions: 'biography.passions',
  motto: 'biography.motto',
} as const;

type BiographyTextField = keyof typeof BIOGRAPHY_TEXT_KEYS;

// WHY: même plafond que la question `biography.traits` ; une liste plus longue en base ne
// gonfle pas le prompt.
const MAX_TRAITS = 10;

/** Prénom et surnom ; le nom de famille et les dates ne sont jamais transmis. */
export interface DocumentPerson {
  firstName: string;
  nickname: string | null;
}

/** Trait de caractère, avec son anecdote facultative. */
export interface DocumentTrait {
  trait: string;
  anecdote?: string;
}

/** Faits transmis à l'IA pour rédiger la couverture, l'hommage et les remerciements. */
export interface DocumentFacts {
  person: DocumentPerson;
  /** Ton choisi (code anglais `believer` ou `neutral`), ou null s'il n'a pas été choisi. */
  tone: Tone | null;
  biography: Partial<Record<BiographyTextField, string>> & { traits?: DocumentTrait[] };
}

/** Texte non vide, nettoyé, ou undefined. */
function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function tone(value: unknown): Tone | null {
  return TONES.find((code) => code === value) ?? null;
}

function traits(value: unknown): DocumentTrait[] {
  if (!Array.isArray(value)) return [];
  const picked: DocumentTrait[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const trait = text(record.trait);
    if (!trait) continue;
    const anecdote = text(record.anecdote);
    picked.push(anecdote ? { trait, anecdote } : { trait });
    if (picked.length >= MAX_TRAITS) break;
  }
  return picked;
}

/**
 * Faits transmis à l'IA pour les textes du livret : prénom, surnom, ton (celui de la cérémonie,
 * sinon celui des annonces) et réponses de la biographie de la liste blanche, en texte non vide.
 * Seuls les champs nommés sont recopiés : une réponse hors liste passée par erreur est ignorée.
 *
 * @example
 * const facts = documentFacts(person, answers); // jamais le nom, une date ou un lieu
 */
export function documentFacts(person: DocumentPerson, answers: Answers): DocumentFacts {
  const biography: DocumentFacts['biography'] = {};
  for (const [field, key] of Object.entries(BIOGRAPHY_TEXT_KEYS) as [
    BiographyTextField,
    (typeof BIOGRAPHY_TEXT_KEYS)[BiographyTextField],
  ][]) {
    const value = text(answers[key]);
    if (value) biography[field] = value;
  }
  const pickedTraits = traits(answers['biography.traits']);
  if (pickedTraits.length > 0) biography.traits = pickedTraits;

  return {
    // WHY: on reconstruit l'objet au lieu de l'étaler : une fiche complète (`PersonSummary`)
    // porte le nom et les dates, qui ne doivent jamais partir.
    person: { firstName: person.firstName.trim(), nickname: text(person.nickname) ?? null },
    tone: tone(answers['ceremony.tone']) ?? tone(answers['announce.tone']),
    biography,
  };
}
