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

/** Liens Google Maps courts : repris tels quels. */
const MAPS_SHORT_HOSTS: ReadonlySet<string> = new Set(['goo.gl', 'maps.app.goo.gl']);
// WHY: domaines Google par pays (`google.fr`, `google.co.uk`, `google.com.br`…), ancrés pour
// qu'un sous-domaine d'un autre site (`maps.google.com.evil.example`) ne passe pas.
const GOOGLE_TLD = String.raw`(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})`;
const MAPS_HOST = new RegExp(`^maps\\.google\\.${GOOGLE_TLD}$`);
const GOOGLE_HOST = new RegExp(`^(?:www\\.)?google\\.${GOOGLE_TLD}$`);

/** Lien Google Maps collé, normalisé, ou null s'il mène ailleurs. */
function googleMapsUrl(text: string): URL | null {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname;
  if (MAPS_SHORT_HOSTS.has(host) || MAPS_HOST.test(host)) return url;
  return GOOGLE_HOST.test(host) && url.pathname.startsWith('/maps') ? url : null;
}

/**
 * Itinéraire Google Maps vers une adresse ou un lien Google Maps collé ; null si le texte n'est
 * pas exploitable. Un lien http(s) n'est repris que s'il est en `https:`, sans identifiants, et
 * sur un domaine Google Maps (`goo.gl`, `maps.app.goo.gl`, `maps.google.<tld>`, ou
 * `google.<tld>/maps…`) : un lien vers un autre site donne null, même s'il cite `goo.gl`. Une
 * adresse donne toujours un lien `https://www.google.com/maps/…`, jamais un autre schéma.
 *
 * @example
 * placeHref('Cathédrale Sainte-Marie, Libreville'); // 'https://www.google.com/maps/dir/?api=1&…'
 * placeHref('https://evil.example/goo.gl'); // null
 */
export function placeHref(text: string): string | null {
  const input = text.trim();
  // WHY: `parseLocation` (partagé avec la page publique du mémorial) juge un lien valide dès qu'il
  // contient `goo.gl` n'importe où et renvoie alors le texte collé : sans cette liste fermée, le
  // bouton « Itinéraire » deviendrait une redirection ouverte vers n'importe quel site.
  if (/^https?:\/\//i.test(input)) {
    const url = googleMapsUrl(input);
    if (!url) return null;
    const parsed = parseLocation(input);
    if (!parsed.valid) return null;
    // WHY: un lien court indéchiffrable est ouvert tel quel ; on rend sa forme normalisée, celle
    // dont on vient de vérifier le domaine.
    return parsed.kind === 'unknown' ? url.href : mapsDirectionsHref(input);
  }
  return parseLocation(input).valid ? mapsDirectionsHref(input) : null;
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
