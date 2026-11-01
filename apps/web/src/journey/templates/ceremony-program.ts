import { TONES, type Tone } from '../options';
import type { Answers } from '../progress';
import type { ListItem } from '../types';
import { choiceAnswer, textAnswer } from './common';

/** Moments du programme type ; textes sous `journey.templates.ceremony.<moment>`. */
export type CeremonyMoment =
  | 'welcome'
  | 'lift'
  | 'procession'
  | 'religiousService'
  | 'remembrance'
  | 'tributes'
  | 'departure'
  | 'burial'
  | 'reception';

/** Lieux de l'étape 3.4 repris par le programme type. */
export interface CeremonyPlaces {
  liftPlace?: string | null;
  servicePlace?: string | null;
  burialPlace?: string | null;
}

// WHY: heures indicatives d'une journée d'obsèques ; la famille les ajuste ensuite.
const WELCOME_TIME = '08:00';
const LIFT_TIME = '08:30';
const PROCESSION_TIME = '09:00';
const SERVICE_TIME = '10:00';
const TRIBUTES_TIME = '11:30';
const DEPARTURE_TIME = '12:30';
const BURIAL_TIME = '13:30';
const RECEPTION_TIME = '15:00';

interface TemplateRow {
  time: string;
  moment: (tone: Tone) => CeremonyMoment;
  place?: keyof CeremonyPlaces;
}

const ROWS: readonly TemplateRow[] = [
  { time: WELCOME_TIME, moment: () => 'welcome' },
  { time: LIFT_TIME, moment: () => 'lift', place: 'liftPlace' },
  { time: PROCESSION_TIME, moment: () => 'procession' },
  {
    time: SERVICE_TIME,
    moment: (tone) => (tone === 'believer' ? 'religiousService' : 'remembrance'),
    place: 'servicePlace',
  },
  { time: TRIBUTES_TIME, moment: () => 'tributes' },
  { time: DEPARTURE_TIME, moment: () => 'departure' },
  { time: BURIAL_TIME, moment: () => 'burial', place: 'burialPlace' },
  { time: RECEPTION_TIME, moment: () => 'reception' },
];

/** Nombre de moments du programme type. */
export const CEREMONY_TEMPLATE_SIZE = ROWS.length;

/** Réponses lues pour construire le programme type. */
export const CEREMONY_TEMPLATE_KEYS = [
  'ceremony.tone',
  'announce.tone',
  'ceremony.liftPlace',
  'ceremony.servicePlace',
  'ceremony.burialPlace',
] as const;

/**
 * Programme type d'une journée d'obsèques, sans IA : 8 moments aux heures croissantes, l'office
 * religieux (registre croyant) ou une cérémonie de recueillement (neutre, aussi par défaut).
 * Un lieu absent laisse le champ vide.
 *
 * @example
 * ceremonyProgramTemplate('believer', { servicePlace: 'Cathédrale' }, (m) => t(`templates.ceremony.${m}`));
 */
export function ceremonyProgramTemplate(
  tone: string | null | undefined,
  places: CeremonyPlaces,
  translate: (moment: CeremonyMoment) => string,
): ListItem[] {
  const known: Tone = (TONES as readonly string[]).includes(tone ?? '')
    ? (tone as Tone)
    : 'neutral';
  return ROWS.map((row) => ({
    time: row.time,
    moment: translate(row.moment(known)),
    place: (row.place && places[row.place]?.trim()) || '',
    lead: '',
  }));
}

/**
 * Programme type construit à partir des réponses du dossier : registre de la cérémonie, sinon
 * celui des annonces, et les trois lieux de l'étape 3.4.
 *
 * @example
 * ceremonyProgramFromAnswers(answers, (m) => t(`templates.ceremony.${m}`));
 */
export function ceremonyProgramFromAnswers(
  answers: Answers,
  translate: (moment: CeremonyMoment) => string,
): ListItem[] {
  const tone =
    choiceAnswer(answers, 'ceremony.tone', TONES) ?? choiceAnswer(answers, 'announce.tone', TONES);
  return ceremonyProgramTemplate(
    tone,
    {
      liftPlace: textAnswer(answers, 'ceremony.liftPlace'),
      servicePlace: textAnswer(answers, 'ceremony.servicePlace'),
      burialPlace: textAnswer(answers, 'ceremony.burialPlace'),
    },
    translate,
  );
}
