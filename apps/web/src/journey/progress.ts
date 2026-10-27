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

const has = (answers: Answers, key: string) => Object.prototype.hasOwnProperty.call(answers, key);

export function stepProgress(step: Step, answers: Answers): StepProgress {
  let answered = 0;
  let skipped = 0;
  for (const { key } of step.questions) {
    if (!has(answers, key)) continue;
    if (isSkipped(answers[key])) skipped += 1;
    else answered += 1;
  }
  return { stepId: step.id, total: step.questions.length, answered, skipped };
}

/** Prochaine question à poser : la première qui n'est ni répondue ni passée. */
export function nextQuestion(steps: readonly Step[], answers: Answers): QuestionRef | null {
  for (const step of steps) {
    const index = step.questions.findIndex(({ key }) => !has(answers, key));
    if (index >= 0) return { stepId: step.id, index };
  }
  return null;
}

/** Question à afficher : `?q=` s'il est valide, sinon la première sans réponse, sinon la première. */
export function resolveQuestionIndex(
  step: Step,
  answers: Answers,
  q: string | string[] | undefined,
): number {
  const raw = Array.isArray(q) ? q[0] : q;
  if (raw !== undefined && /^\d+$/.test(raw) && Number(raw) < step.questions.length) {
    return Number(raw);
  }
  const open = step.questions.findIndex(({ key }) => !has(answers, key));
  return open >= 0 ? open : 0;
}
