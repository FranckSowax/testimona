import { mapsDirectionsHref, parseLocation } from '@/lib/geo/maps';
import type { Answers } from './progress';
import { ceremonyProgramStep } from './steps/3-4-ceremony-program';
import { answerSchema, type ListQuestion } from './types';

/** Un moment du programme de la cérémonie, textes rognés, champs facultatifs omis si vides. */
export interface ProgramItem {
  time: string;
  moment: string;
  place?: string;
  lead?: string;
}

/** Lieux de l'étape 3.4, dans l'ordre de la journée. */
export type CeremonyPlaceKey = 'liftPlace' | 'servicePlace' | 'burialPlace';

export interface CeremonyPlace {
  key: CeremonyPlaceKey;
  text: string;
  /** Itinéraire Google Maps, null si le texte n'est ni une adresse ni un lien reconnu. */
  href: string | null;
}

const PLACE_KEYS: readonly CeremonyPlaceKey[] = ['liftPlace', 'servicePlace', 'burialPlace'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// WHY: un moment est validé par le schéma même de la question (heure `HH:MM`, moment requis,
// longueurs) plutôt que par une copie de ses règles, qui pourrait diverger.
const programQuestion = ceremonyProgramStep.questions.find(
  (question): question is ListQuestion =>
    question.kind === 'list' && question.key === 'ceremony.program',
);
if (!programQuestion) throw new Error('ceremony.program question missing');
const itemSchema = answerSchema(programQuestion);

function toProgramItem(raw: unknown): ProgramItem | null {
  const parsed = itemSchema.safeParse([raw]);
  if (!parsed.success) return null;
  const [item] = parsed.data as [Record<string, string | undefined>];
  const { time, moment, place, lead } = item;
  if (!time || !moment) return null;
  return { time, moment, ...(place ? { place } : {}), ...(lead ? { lead } : {}) };
}

/**
 * Programme de la cérémonie trié par heure. Une valeur absente, « passée » ou mal formée donne
 * une liste vide ; un moment sans heure ou sans intitulé valides est écarté.
 *
 * @example
 * sortedProgram(answers['ceremony.program']); // [{ time: '08:00', moment: 'Accueil' }, …]
 */
export function sortedProgram(value: unknown): ProgramItem[] {
  if (!Array.isArray(value)) return [];
  const items = value.map(toProgramItem).filter((item): item is ProgramItem => item !== null);
  // WHY: `sort` est stable ; deux moments à la même heure gardent l'ordre saisi par la famille.
  // Le format `HH:MM` se compare correctement en ordre lexical.
  return items.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

/**
 * Date des obsèques en toutes lettres dans la langue demandée, sinon null (absente, « passée »,
 * mal formée ou impossible).
 *
 * @example
 * ceremonyDate('2026-11-14', 'fr'); // 'samedi 14 novembre 2026'
 */
export function ceremonyDate(value: unknown, locale: string): string | null {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  // WHY: une date impossible (2026-02-31) serait réinterprétée par Date ; on la refuse.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  // WHY: la date est un jour civil sans fuseau ; UTC évite un décalage d'un jour.
  return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(date);
}

/**
 * Itinéraire Google Maps vers une adresse ou un lien Maps collé ; null si le texte n'est pas
 * exploitable (un lien vers un autre site n'est jamais repris).
 *
 * @example
 * placeHref('Cathédrale Sainte-Marie, Libreville'); // 'https://www.google.com/maps/dir/?api=1&…'
 */
export function placeHref(text: string): string | null {
  return parseLocation(text).valid ? mapsDirectionsHref(text) : null;
}

/**
 * Lieux répondus de l'étape 3.4 (levée du corps, cérémonie, inhumation), dans cet ordre, avec
 * leur lien Maps quand il est exploitable.
 *
 * @example
 * ceremonyPlaces({ 'ceremony.liftPlace': 'Morgue de Libreville' });
 */
export function ceremonyPlaces(answers: Answers): CeremonyPlace[] {
  return PLACE_KEYS.flatMap((key) => {
    const value = answers[`ceremony.${key}`];
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? [{ key, text, href: placeHref(text) }] : [];
  });
}
