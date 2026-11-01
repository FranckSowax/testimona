import type { Answers } from '../progress';
import type { ListItem, ListStarter, Question } from '../types';
import {
  CEREMONY_TEMPLATE_KEYS,
  CEREMONY_TEMPLATE_SIZE,
  ceremonyProgramFromAnswers,
} from './ceremony-program';

/** Traduction d'un chemin relatif à l'espace `journey` (ex. `templates.ceremony.welcome`). */
export type StarterTranslate = (path: string) => string;

/** Modèle de liste : nombre d'éléments, réponses lues et construction des éléments traduits. */
export interface ListStarterDefinition {
  size: number;
  keys: readonly string[];
  build: (answers: Answers, translate: StarterTranslate) => ListItem[];
}

/**
 * Registre unique des programmes types : la taille sert au contrôle de `maxItems` (`define.ts`),
 * les clés à la lecture des réponses (`prefill.ts`), la construction à la page question.
 *
 * @example
 * LIST_STARTERS.ceremonyProgram.build(answers, (path) => t(path));
 */
export const LIST_STARTERS: Record<ListStarter, ListStarterDefinition> = {
  ceremonyProgram: {
    size: CEREMONY_TEMPLATE_SIZE,
    keys: CEREMONY_TEMPLATE_KEYS,
    build: (answers, translate) =>
      ceremonyProgramFromAnswers(answers, (moment) => translate(`templates.ceremony.${moment}`)),
  },
};

/**
 * Programme type proposé pour une question, ou `undefined` : rien pour un lecteur, pour une
 * question sans `starter`, ni si la liste enregistrée contient déjà un moment.
 *
 * @example
 * const starter = starterFor(question, answers, canWrite(role), (path) => t(path));
 */
export function starterFor(
  question: Question,
  answers: Answers,
  canWrite: boolean,
  translate: StarterTranslate,
): ListItem[] | undefined {
  if (!canWrite || question.kind !== 'list' || !question.starter) return undefined;
  // WHY: le modèle ne remplace jamais une saisie ; une liste « passée » reste vide et le reçoit.
  const stored = answers[question.key];
  if (Array.isArray(stored) && stored.length > 0) return undefined;
  return LIST_STARTERS[question.starter].build(answers, translate);
}
