import type { Question, Step } from './types';

/**
 * Clés des réponses qui préremplissent des questions de l'étape (`prefillFrom`), sans doublon.
 *
 * @example
 * listAnswers(dossierId, [...keys, ...prefillKeys(step)]);
 */
export function prefillKeys(step: Step): string[] {
  const keys = step.questions.flatMap((question) =>
    question.kind === 'choice' && question.prefillFrom ? [question.prefillFrom] : [],
  );
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
  if (own !== undefined) return own;
  if (question.kind !== 'choice' || !question.prefillFrom) return undefined;
  const source = answers[question.prefillFrom];
  return typeof source === 'string' && question.options.includes(source) ? source : undefined;
}
