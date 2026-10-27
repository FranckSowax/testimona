import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';
import { LEVELS } from '@/journey/options';
import { BUDGET_GRID } from './grid';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );

const isFilled = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';

/** Textes lus par la page Budget. */
const PATHS = [
  ...BUDGET_GRID.map((item) => `budget.grid.${item.key}`),
  ...LEVELS.map((level) => `budget.level.${level}`),
  ...[
    'title',
    'intro',
    'estimateNote',
    'attendanceTitle',
    'attendanceRange',
    'noAttendance',
    'answerAttendance',
    'editAttendance',
    'scenariosTitle',
    'total',
    'line',
    'chosen',
    'chooseLevel',
    'changeLevel',
    'backToDossier',
    'capped',
    'cappedNote',
    'nightsAssumed',
    'noGuests',
    'linesTitle',
    'seeContributions',
  ].map((key) => `budget.page.${key}`),
];

function leafPaths(node: unknown, prefix = ''): string[] {
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe.each([
  ['fr', fr],
  ['en', en],
])('textes du budget (%s)', (_locale, messages) => {
  it('couvrent chaque poste, chaque niveau et chaque texte de la page', () => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });
});

describe.each([
  ['fr', fr],
  ['en', en],
])('libellés des postes (%s)', (_locale, messages) => {
  it('tiennent dans la limite de 120 caractères des postes', () => {
    const tooLong = BUDGET_GRID.filter(
      (item) => [...String(get(messages, `budget.grid.${item.key}`))].length > 120,
    );
    expect(tooLong).toEqual([]);
  });
});

describe('parité FR/EN du budget', () => {
  it("l'espace budget a les mêmes clés dans les deux langues", () => {
    const keys = (messages: unknown) => leafPaths(get(messages, 'budget')).sort();
    expect(keys(en)).toEqual(keys(fr));
  });
});
