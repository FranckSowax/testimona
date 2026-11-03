import { z } from 'zod';
import {
  DOCUMENT_TEXT_KINDS,
  documentTextSchema,
  type DocumentTextKind,
} from '@/modules/documents/texts';
import type { DocumentTexts } from './types';

const TextsSchema = z
  .object({
    cover: documentTextSchema('cover'),
    tribute: documentTextSchema('tribute'),
    thanks: documentTextSchema('thanks'),
  })
  .strict();

// WHY: une heure (« 9:30 », « 14h05 », « 10 h 30 », « 15h », « 9 heures », « 3 pm ») vient du
// programme de la cérémonie, jamais de l'IA : un texte qui en contient une est refusé plutôt que
// corrigé. « midi » et « minuit » sont laissés de côté (trop de faux positifs).
const TIMES = [
  /\b([01]?\d|2[0-3])\s?[:hH]\s?[0-5]\d\b/,
  /\b([01]?\d|2[0-3])\s?h\b/i,
  /\b\d{1,2}\s?heures?\b/i,
  /\b\d{1,2}\s?(am|pm|o['’]clock)\b/i,
];

// WHY: le ton croyant peut citer un verset (« Jean 11:25 », « 1 Corinthiens 13:4-7 ») : sa
// référence ressemble à une heure. On la retire avant de chercher une heure.
const VERSE = /(?:\b[1-3]\s?)?\b\p{Lu}\p{L}+\.?\s+\d{1,3}:\d{1,3}(?:-\d{1,3})?\b/gu;

const MONTHS_FR =
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const MONTHS_EN =
  'January|February|March|April|May|June|July|August|September|October|November|December';

// WHY: les faits ne portent aucune date structurée ; une année ou un jour et un mois dans un
// texte viennent donc soit de la biographie écrite par la famille (permis), soit de l'IA
// (inventés, refusés). On cherche chaque date trouvée dans le JSON des faits envoyés.
const DATES = [
  /\b(?:18|19|20)\d{2}\b/g,
  new RegExp(`\\b\\d{1,2}(?:er)?\\s+(?:${MONTHS_FR})(?![\\p{L}])`, 'giu'),
  new RegExp(`\\b(?:${MONTHS_EN})\\s+\\d{1,2}\\b`, 'gi'),
  new RegExp(`\\b\\d{1,2}\\s+(?:${MONTHS_EN})\\b`, 'gi'),
];

/** Texte en minuscules, espaces resserrés, pour comparer une date à celles des faits. */
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ');

/** Vrai quand le texte contient une heure (hors référence de verset). */
export function hasTime(text: string): boolean {
  const withoutVerses = text.replace(VERSE, ' ');
  return TIMES.some((time) => time.test(withoutVerses));
}

/** Vrai quand le texte contient une date absente des faits envoyés au modèle. */
export function hasInventedDate(text: string, factsJson: string): boolean {
  const facts = normalize(factsJson);
  return DATES.some((date) =>
    [...text.matchAll(date)].some((match) => !facts.includes(normalize(match[0]))),
  );
}

// WHY: certains modèles enveloppent malgré la consigne leur JSON dans un bloc ```json ; on tolère
// ce seul habillage (balise de langue en toute casse, retour à la ligne facultatif), rien
// d'autre (pas de texte avant ou après).
const FENCE = /^```(?:json)?[ \t]*\n?([\s\S]*?)\n?```$/i;

/**
 * Textes validés par `documentTextSchema`, ou null quand la réponse n'est pas le JSON attendu.
 *
 * @example
 * const texts = parseDocumentTexts(response); // null pour « Voici : {…} »
 */
export function parseDocumentTexts(raw: string): DocumentTexts | null {
  const trimmed = raw.trim();
  const body = FENCE.exec(trimmed)?.[1] ?? trimmed;
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return null;
  }
  const parsed = TextsSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/**
 * Premier défaut d'un des trois textes : une heure, ou une date absente des faits ; null sinon.
 *
 * @example
 * const issue = documentTextsIssue(texts, JSON.stringify(facts));
 */
export function documentTextsIssue(
  texts: DocumentTexts,
  factsJson: string,
): { issue: 'time' | 'date'; kind: DocumentTextKind } | null {
  const withTime = DOCUMENT_TEXT_KINDS.find((kind) => hasTime(texts[kind]));
  if (withTime) return { issue: 'time', kind: withTime };
  const withDate = DOCUMENT_TEXT_KINDS.find((kind) => hasInventedDate(texts[kind], factsJson));
  return withDate ? { issue: 'date', kind: withDate } : null;
}
