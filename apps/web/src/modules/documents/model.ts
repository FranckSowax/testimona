import {
  type CeremonyPlace,
  type CeremonyPlaceKey,
  ceremonyDate,
  ceremonyPlaces,
  type ProgramItem,
  sortedProgram,
} from '@/journey/ceremony';
import { DOCUMENT_STYLES, type DocumentStyle } from '@/journey/options';
import type { Answers } from '@/journey/progress';
import type { PersonSummary } from '@/modules/dossier/repo';
import { type DocumentTextKind, readDocumentTexts } from './texts';

export type { DocumentStyle };

/** Documents de l'étape 3.5 : livret A5, affiche A4, affiche carrée pour WhatsApp. */
export const DOCUMENT_KINDS = ['booklet.pdf', 'poster.pdf', 'poster.png'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
/** Langue des documents imprimés (dates, intitulés, langue déclarée du PDF). */
export type DocumentLocale = 'fr' | 'en';

/** Formats de l'affiche : PDF A4 ou PNG carré. */
export type PosterKind = Exclude<DocumentKind, 'booklet.pdf'>;

/** Élément manquant empêchant de produire un document. */
export type DocumentMissing = 'name' | 'program' | DocumentTextKind;

/**
 * Intitulés traduits imprimés par les gabarits.
 * WHY: passés en paramètre pour que le modèle reste pur et sans next-intl (testable, appelable
 * depuis une route).
 */
export interface DocumentLabels {
  tribute: string;
  program: string;
  thanks: string;
  /** En-têtes du tableau du programme. */
  time: string;
  moment: string;
  place: string;
  lead: string;
  /** Imprimé à la place de la date des obsèques quand elle n'est pas encore connue. */
  dateToBeConfirmed: string;
  places: Record<CeremonyPlaceKey, string>;
}

/** Faits lus du dossier et des réponses, avant mise en forme d'un document. */
export interface DocumentInputs {
  locale: DocumentLocale;
  style: DocumentStyle;
  /** Nom imprimé : prénom et nom de la fiche, sinon titre du dossier ; null si rien. */
  fullName: string | null;
  nickname: string | null;
  /** « 3 mars 1950 – 12 octobre 2026 », une seule date, ou null. */
  lifeDates: string | null;
  /** Date des obsèques en toutes lettres, null si non renseignée (facultative). */
  ceremonyDate: string | null;
  places: CeremonyPlace[];
  program: ProgramItem[];
  texts: Record<DocumentTextKind, string | null>;
}

/** Données du gabarit du livret. */
export interface BookletData {
  locale: DocumentLocale;
  style: DocumentStyle;
  photo: Uint8Array | null;
  fullName: string;
  nickname: string | null;
  lifeDates: string | null;
  cover: string;
  tribute: string;
  thanks: string;
  ceremonyDate: string | null;
  places: { label: string; text: string }[];
  program: ProgramItem[];
  labels: DocumentLabels;
}

/** Données des gabarits de l'affiche (PDF A4 et PNG carré). */
export interface PosterData {
  locale: DocumentLocale;
  style: DocumentStyle;
  photo: Uint8Array | null;
  fullName: string;
  lifeDates: string | null;
  /** Phrase de couverture si elle est enregistrée ; l'affiche ne l'exige pas. */
  cover: string | null;
  ceremonyDate: string | null;
  /** Cinq moments au plus, par heure. */
  moments: ProgramItem[];
  labels: DocumentLabels;
}

export interface DocumentInputsParams {
  person: PersonSummary | null;
  dossierTitle: string;
  answers: Answers;
  locale: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const POSTER_MAX_MOMENTS = 5;

/**
 * Locale Intl des dates imprimées.
 * WHY: même rendu que les autres dates longues de l'application (`formatClosedOn`), et une seule
 * convention sur un même document : sans cela, `en` donnerait « 3 March 1950 » à côté de
 * « Saturday, November 14, 2026 ».
 */
function _intlLocale(locale: string): string {
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}
/** Langue du document : l'anglais si demandé, sinon le français (langue par défaut). */
function _documentLocale(locale: string): DocumentLocale {
  return locale === 'en' ? 'en' : 'fr';
}
/** Date `AAAA-MM-JJ` écrite « 3 mars 1950 », ou null si absente ou invalide. */
function _lifeDate(value: unknown, locale: string): string | null {
  if (typeof value !== 'string') return null;
  const iso = value.trim();
  if (!ISO_DATE.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  // WHY: une date impossible (1950-02-31) serait réinterprétée par Date ; on la refuse.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  // WHY: UTC car c'est un jour civil sans fuseau.
  return new Intl.DateTimeFormat(_intlLocale(locale), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(date);
}

function _fullName(person: PersonSummary | null, dossierTitle: string): string | null {
  const fromRecord = person ? `${person.firstName.trim()} ${person.lastName.trim()}`.trim() : '';
  // WHY: même repli que les pages du dossier : sans fiche, le titre du dossier tient lieu de nom.
  const name = fromRecord || dossierTitle.trim();
  return name || null;
}

function _style(value: unknown): DocumentStyle {
  return DOCUMENT_STYLES.find((style) => style === value) ?? 'sober';
}

function _assertReady(kind: DocumentKind, inputs: DocumentInputs): void {
  const missing = documentReadiness(kind, inputs);
  if (missing.length > 0) throw new Error(`${kind} not ready: ${missing.join(', ')}`);
}

/**
 * Faits imprimés sur le livret et l'affiche, lus directement de la fiche et des réponses ;
 * jamais d'un texte produit par l'IA. La date de décès répondue (`death.date`) prime sur celle
 * de la fiche quand elle est valide, comme dans `aiFacts`.
 *
 * @example
 * const inputs = documentInputs({ person, dossierTitle: dossier.title, answers, locale: 'fr' });
 */
export function documentInputs({
  person,
  dossierTitle,
  answers,
  locale,
}: DocumentInputsParams): DocumentInputs {
  // WHY: une réponse non vide mais invalide ne doit pas masquer une date valide de la fiche.
  const death = _lifeDate(answers['death.date'], locale) ?? _lifeDate(person?.deathDate, locale);
  const dates = [_lifeDate(person?.birthDate, locale), death].filter(
    (d): d is string => d !== null,
  );
  return {
    locale: _documentLocale(locale),
    style: _style(answers['documents.style']),
    fullName: _fullName(person, dossierTitle),
    nickname: person?.nickname?.trim() || null,
    lifeDates: dates.length > 0 ? dates.join(' – ') : null,
    ceremonyDate: ceremonyDate(answers['ceremony.date'], _intlLocale(locale)),
    places: ceremonyPlaces(answers),
    program: sortedProgram(answers['ceremony.program']),
    texts: readDocumentTexts(answers),
  };
}

/**
 * Moments imprimés sur l'affiche : les cinq premiers par heure, liste vide sans programme.
 * WHY: une affiche carrée lisible sur un téléphone ne tient pas plus de cinq lignes.
 *
 * @example
 * posterMoments(inputs.program); // ≤ 5 moments
 */
export function posterMoments(program: readonly ProgramItem[]): ProgramItem[] {
  return sortedProgram(program).slice(0, POSTER_MAX_MOMENTS);
}

/**
 * Éléments manquants pour produire un document, liste vide quand il est prêt. La date des
 * obsèques n'en fait jamais partie : sans elle, les gabarits impriment « Date à préciser ».
 *
 * @example
 * documentReadiness('booklet.pdf', inputs); // ['tribute'] si l'hommage manque
 */
export function documentReadiness(kind: DocumentKind, inputs: DocumentInputs): DocumentMissing[] {
  const missing: DocumentMissing[] = [];
  if (!inputs.fullName) missing.push('name');
  if (inputs.program.length === 0) missing.push('program');
  if (kind === 'booklet.pdf') {
    for (const text of ['cover', 'tribute', 'thanks'] as const) {
      if (!inputs.texts[text]) missing.push(text);
    }
  }
  return missing;
}

/**
 * Données du livret. Lève si le livret n'est pas prêt (`documentReadiness` non vide) : la route
 * vérifie avant d'appeler.
 *
 * @example
 * bookletData(inputs, labels, photoBytes);
 */
export function bookletData(
  inputs: DocumentInputs,
  labels: DocumentLabels,
  photo: Uint8Array | null,
): BookletData {
  _assertReady('booklet.pdf', inputs);
  const { cover, tribute, thanks } = inputs.texts as Record<DocumentTextKind, string>;
  return {
    locale: inputs.locale,
    style: inputs.style,
    photo,
    fullName: inputs.fullName as string,
    nickname: inputs.nickname,
    lifeDates: inputs.lifeDates,
    cover,
    tribute,
    thanks,
    ceremonyDate: inputs.ceremonyDate,
    places: inputs.places.map((place) => ({ label: labels.places[place.key], text: place.text })),
    program: inputs.program,
    labels,
  };
}

/**
 * Données de l'affiche (PDF A4 ou PNG carré). Lève si l'affiche n'est pas prête dans le format
 * demandé.
 *
 * @example
 * posterData('poster.png', inputs, labels, null);
 */
export function posterData(
  kind: PosterKind,
  inputs: DocumentInputs,
  labels: DocumentLabels,
  photo: Uint8Array | null,
): PosterData {
  _assertReady(kind, inputs);
  return {
    locale: inputs.locale,
    style: inputs.style,
    photo,
    fullName: inputs.fullName as string,
    lifeDates: inputs.lifeDates,
    cover: inputs.texts.cover,
    ceremonyDate: inputs.ceremonyDate,
    moments: posterMoments(inputs.program),
    labels,
  };
}
