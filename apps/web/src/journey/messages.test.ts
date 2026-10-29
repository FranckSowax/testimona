import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import type { QuantityKey } from './quantities';
import { allSteps } from './registry';
import type { Step } from './types';
import { SPECIFIC_MESSAGES } from './ui/specific-error';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );

/** Un libellé vide compte comme manquant. */
const isFilled = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';

// WHY: Record typé : ajouter une quantité sans texte fait échouer la compilation.
const QUANTITY_KEYS: Record<QuantityKey, true> = {
  tents: true,
  chairs: true,
  benchPlaces: true,
  lightSets: true,
  soundSystems: true,
  platesPerNight: true,
  funeralPlates: true,
  waterPacks: true,
  drinkBottles: true,
  iceKg: true,
};

/** Clés fixes lues par l'interface (`ui/`) : `journey.ui.*` et `journey.dashboard.*`. */
const UI_PATHS = [
  ...[
    'progress',
    'back',
    'backToDossier',
    'skip',
    'next',
    'finish',
    'required',
    'requiredFields',
    'readOnly',
    'addItem',
    'removeItem',
    'removeItemN',
    'noAnswer',
    'item',
    'chooseOption',
    'tooLarge',
    'invalidDate',
    'invalidCharacter',
    'invalidNumber',
    'outOfRange',
  ].map((key) => `journey.ui.${key}`),
  ...[
    'nextTitle',
    'answer',
    'view',
    'allDone',
    'completeSkipped',
    'stepProgress',
    'toComplete',
  ].map((key) => `journey.dashboard.${key}`),
  ...['viewDraft', 'summary.budget'].map((key) => `journey.dashboard.${key}`),
  ...[
    'title.whatsapp',
    'title.email',
    'intro.whatsapp',
    'intro.email',
    'subject',
    'body',
    'save',
    'saved',
    'unsaved',
    'copy',
    'copySubject',
    'copied',
    'copyManual',
    'shareWhatsapp',
    'openMail',
    'regenerate',
    'editAnswers',
    'backToDossier',
    'readOnly',
    'empty',
    'tooLongForLink',
    'newTab',
    'improve',
    'improving',
    'improved',
    'ai.unavailable',
    'ai.quota',
    'ai.failed',
  ].map((key) => `journey.draft.${key}`),
  ...Object.values(SPECIFIC_MESSAGES).map((path) => `journey.${path}`),
  ...[
    'intro',
    'nightsAssumed',
    'noAttendance',
    'answerAttendance',
    'quantitiesTitle',
    'noQuantities',
    'costTitle',
    'costNote',
    'line',
    'capped',
    'cappedNote',
    'adjustTitle',
    'adjust',
    'adjustHint',
    'adjusted',
    'upToDate',
    'editAnswers',
    'backToDossier',
    ...Object.keys(QUANTITY_KEYS).map((key) => `quantity.${key}`),
  ].map((key) => `journey.synthesis.${key}`),
];

/** Chemins de clés d'un objet de messages (feuilles uniquement). */
function leafPaths(node: unknown, prefix = ''): string[] {
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

/** Chemins de textes qu'une étape du registre exige. */
function requiredPaths(step: Step): string[] {
  const paths = [`journey.steps.${step.id}.title`, `journey.steps.${step.id}.description`];
  if (step.draft) paths.push(`journey.draft.title.${step.draft.kind}`);
  if (step.summary) paths.push(`journey.dashboard.summary.${step.summary}`);
  for (const question of step.questions) {
    const base = `journey.q.${question.key}`;
    paths.push(`${base}.title`, `${base}.hint`);
    if (question.kind === 'place') paths.push('journey.fields.city', 'journey.fields.country');
    if (question.kind === 'choice') {
      paths.push(...question.options.map((o) => `${base}.options.${o}`));
    }
    if (question.kind === 'list') {
      for (const field of question.fields) {
        paths.push(`${base}.fields.${field.name}.label`);
        if (field.kind === 'choice') {
          paths.push(...field.options.map((o) => `${base}.fields.${field.name}.options.${o}`));
        }
      }
    }
  }
  return paths;
}

describe.each([
  ['fr', fr],
  ['en', en],
])('textes du parcours (%s)', (_locale, messages) => {
  it('couvrent chaque étape, question, option et champ du registre', () => {
    const missing = allSteps()
      .flatMap(requiredPaths)
      .filter((path) => !isFilled(get(messages, path)));
    expect(missing).toEqual([]);
  });

  it("couvrent les clés fixes lues par l'interface", () => {
    expect(UI_PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });
});

describe('parité FR/EN', () => {
  it("l'espace journey a les mêmes clés dans les deux langues", () => {
    const keys = (messages: unknown) => leafPaths(get(messages, 'journey')).sort();
    expect(keys(en)).toEqual(keys(fr));
  });
});
