import { resolveQuestionIndex } from './progress';
import { CEREMONY_TEMPLATE_KEYS } from './templates/ceremony-program';
import type { ListStarter, Question, Step } from './types';

/** Réponses lues par chaque modèle de liste. */
const STARTER_KEYS: Record<ListStarter, readonly string[]> = {
  ceremonyProgram: CEREMONY_TEMPLATE_KEYS,
};

/**
 * Clés des réponses qui préremplissent des questions de l'étape (`prefillFrom`) ou nourrissent
 * leur programme type (`starter`), sans doublon.
 *
 * @example
 * listAnswers(dossierId, [...keys, ...prefillKeys(step)]);
 */
export function prefillKeys(step: Step): string[] {
  const keys = step.questions.flatMap((question) => {
    if (question.kind === 'choice' && question.prefillFrom) return [question.prefillFrom];
    if (question.kind === 'list' && question.starter) return STARTER_KEYS[question.starter];
    return [];
  });
  return [...new Set(keys)];
}

/**
 * Valeur de départ d'une question : sa réponse enregistrée (même « passée ») ; à défaut, la
 * réponse de `prefillFrom` si c'est une option valide de la question ; sinon `undefined`.
 *
 * @example
 * initialStored(toneQuestion, { 'announce.tone': 'believer' }); // 'believer'
 */
export function initialStored(
  question: Question,
  answers: Readonly<Record<string, unknown>>,
): unknown {
  const own = answers[question.key];
  // WHY: une réponse « passée » est un choix de la famille ; on ne la remplace pas en silence.
  // null vaut « non répondu », comme pour la progression (`isTreated`).
  if (own !== undefined && own !== null) return own;
  if (question.kind !== 'choice' || !question.prefillFrom) return undefined;
  const source = answers[question.prefillFrom];
  return typeof source === 'string' && question.options.includes(source) ? source : undefined;
}

/** Question affichée par la page d'une étape et valeur de départ de sa saisie. */
export interface ScreenState {
  index: number;
  stored: unknown;
}

/**
 * Question à afficher (`?q=` ou prochaine question de l'étape) et valeur de départ de sa saisie.
 * `answers` peut contenir les clés sources de `prefillFrom` (voir `prefillKeys`).
 *
 * @example
 * const { index, stored } = screenState(step, answers, searchParams.q, canWrite(role));
 */
export function screenState(
  step: Step,
  answers: Readonly<Record<string, unknown>>,
  q: string | string[] | undefined,
  canWrite: boolean,
): ScreenState {
  // WHY: une valeur préremplie ne compte pas comme répondue tant qu'elle n'est pas enregistrée ;
  // la question courante se calcule sur les seules réponses de l'étape.
  const keys = new Set(step.questions.map((question) => question.key));
  const stepAnswers = Object.fromEntries(Object.entries(answers).filter(([key]) => keys.has(key)));
  const index = resolveQuestionIndex(step, stepAnswers, q);
  const question = step.questions[index];
  if (!question) return { index, stored: undefined };
  // WHY: un lecteur ne répond pas ; une valeur préremplie lui ferait croire à une réponse.
  const stored = canWrite ? initialStored(question, answers) : answers[question.key];
  return { index, stored };
}
