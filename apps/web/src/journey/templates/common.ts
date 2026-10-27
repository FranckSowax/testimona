import { CAUSES, TONES, type Cause, type Tone } from '../options';
import type { Answers } from '../progress';

export type TemplateLocale = 'fr' | 'en';

export interface PersonNames {
  firstName: string;
  lastName: string;
  nickname: string | null;
}

/** Ce dont un modèle a besoin : langue, personne, et réponses du dossier (toutes étapes). */
export interface DraftContext {
  locale: TemplateLocale;
  person: PersonNames;
  answers: Answers;
}

/** Réponse texte utilisable : chaîne non vide (une réponse passée ou absente donne null). */
export function textAnswer(answers: Answers, key: string): string | null {
  const value = answers[key];
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text === '' ? null : text;
}

/** Réponse de choix utilisable : une des options attendues, sinon null. */
export function choiceAnswer<T extends string>(
  answers: Answers,
  key: string,
  options: readonly T[],
): T | null {
  const value = answers[key];
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Espaces internes réduits, espaces d'extrémité retirés. */
function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function fullName(person: PersonNames): string {
  return squash(`${person.firstName} ${person.lastName}`);
}

/** Nom de famille nettoyé, pour les signatures. */
export function familyName(person: PersonNames): string {
  return squash(person.lastName);
}

/** Bénédiction du ton croyant, commune au message immédiat et à l'e-mail. */
export const BLESSING: Record<TemplateLocale, string> = {
  fr: 'Que Dieu l’accueille dans sa miséricorde.',
  en: 'May God have mercy on their soul.',
};

/** Date AAAA-MM-JJ en toutes lettres (« 3 mars 2026 », « 3 March 2026 »), sinon null. */
export function formatDate(iso: string | null, locale: TemplateLocale): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  // WHY: une date impossible (2026-02-31) serait réinterprétée par Date ; on la refuse.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Ton choisi en 2.2 ; neutre par défaut. */
export function toneOf(answers: Answers): Tone {
  return choiceAnswer(answers, 'announce.tone', TONES) ?? 'neutral';
}

const CAUSE_TEXT: Record<TemplateLocale, Record<Exclude<Cause, 'none'>, string>> = {
  fr: {
    illness: 'des suites d’une maladie',
    sudden: 'de manière soudaine',
    accident: 'des suites d’un accident',
  },
  en: { illness: 'after an illness', sudden: 'suddenly', accident: 'following an accident' },
};

/**
 * Phrase d'annonce du décès : `<ouverture> <nom>[, survenu le <date> <circonstance>].`
 * WHY: date et circonstance sont facultatives ; la phrase reste correcte avec l'une, l'autre ou
 * aucune.
 */
export function deathSentence(ctx: DraftContext, opening: string): string {
  const { locale, person, answers } = ctx;
  const nickname = person.nickname ? squash(person.nickname) : '';
  const sameAsFirstName =
    nickname.toLocaleLowerCase(locale) === squash(person.firstName).toLocaleLowerCase(locale);
  const nick =
    nickname === '' || sameAsFirstName
      ? ''
      : locale === 'fr'
        ? ` (« ${nickname} »)`
        : ` ("${nickname}")`;
  const date = formatDate(textAnswer(answers, 'death.date'), locale);
  const cause = choiceAnswer(answers, 'death.mentionCause', CAUSES);
  const causeText = cause && cause !== 'none' ? CAUSE_TEXT[locale][cause] : null;
  let suffix = '';
  if (locale === 'fr') {
    const parts = [date ? `le ${date}` : null, causeText].filter(Boolean);
    if (parts.length > 0) suffix = `, survenu ${parts.join(' ')}`;
  } else {
    const when = date ? `on ${date}` : null;
    const parts = (cause === 'sudden' ? [causeText, when] : [when, causeText]).filter(Boolean);
    if (parts.length > 0) suffix = `, who passed away ${parts.join(' ')}`;
  }
  return `${opening} ${fullName(person)}${nick}${suffix}.`;
}

/** Paragraphes non vides, séparés par une ligne blanche. */
export function paragraphs(parts: readonly (string | null)[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p !== '').join('\n\n');
}
