import { isSkipped, type Step } from './types';

/** Réponses du dossier, indexées par clé (valeur JSON telle qu'enregistrée). */
export type Answers = Readonly<Record<string, unknown>>;

export interface StepProgress {
  stepId: string;
  total: number;
  answered: number;
  skipped: number;
}

export interface QuestionRef {
  stepId: string;
  index: number;
}

// WHY: une clé présente avec null/undefined n'est pas une réponse ; la question reste à poser.
const isTreated = (answers: Answers, key: string) =>
  Object.prototype.hasOwnProperty.call(answers, key) &&
  answers[key] !== null &&
  answers[key] !== undefined;

/**
 * Compte, pour une étape, les questions répondues (valeur présente, non null et non passée,
 * sans validation du contenu) et les questions passées. Les clés des autres étapes sont ignorées.
 */
export function stepProgress(step: Step, answers: Answers): StepProgress {
  let answered = 0;
  let skipped = 0;
  for (const { key } of step.questions) {
    if (!isTreated(answers, key)) continue;
    if (isSkipped(answers[key])) skipped += 1;
    else answered += 1;
  }
  return { stepId: step.id, total: step.questions.length, answered, skipped };
}

/** Prochaine question à poser : la première qui n'est ni répondue ni passée. */
export function nextQuestion(steps: readonly Step[], answers: Answers): QuestionRef | null {
  for (const step of steps) {
    const index = step.questions.findIndex(({ key }) => !isTreated(answers, key));
    if (index >= 0) return { stepId: step.id, index };
  }
  return null;
}

/**
 * Question à afficher. `?q=` est suivi s'il désigne une question de l'étape, même déjà répondue
 * ou passée. Sinon : la première question non traitée, puis la première question passée (le
 * tableau de bord permet ainsi de compléter les passées), puis 0. Une étape vide renvoie 0 :
 * `defineStep` ne l'interdit pas.
 */
export function resolveQuestionIndex(
  step: Step,
  answers: Answers,
  q: string | string[] | undefined,
): number {
  const raw = Array.isArray(q) ? q[0] : q;
  if (raw !== undefined && /^\d+$/.test(raw) && Number(raw) < step.questions.length) {
    return Number(raw);
  }
  const open = step.questions.findIndex(({ key }) => !isTreated(answers, key));
  if (open >= 0) return open;
  const skipped = step.questions.findIndex(({ key }) => isSkipped(answers[key]));
  return skipped >= 0 ? skipped : 0;
}
