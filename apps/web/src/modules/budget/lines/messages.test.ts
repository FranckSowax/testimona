import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import type { LinesError } from './service';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );
const isFilled = (value: unknown) => typeof value === 'string' && value.trim() !== '';

const PATHS = [
  ...[
    'title',
    'intro',
    'estimateNote',
    'empty',
    'emptyManager',
    'create',
    'created',
    'recompute',
    'recomputeHint',
    'recomputed',
  ].map((k) => `lines.page.${k}`),
  ...['label', 'entries', 'lines'].map((k) => `lines.tabs.${k}`),
  ...['title', 'hint', 'none', 'option', 'current', 'save', 'saved'].map(
    (k) => `lines.scenario.${k}`,
  ),
  ...['caption', 'line', 'spent', 'unassigned', 'total', 'edited', 'retained'].map(
    (k) => `lines.table.${k}`,
  ),
  ...[
    'editTitle',
    'addTitle',
    'label',
    'sober',
    'intermediate',
    'full',
    'save',
    'saved',
    'add',
    'added',
    'deleteShort',
    'delete',
    'deleteWarning',
    'confirmDelete',
    'deleting',
    'keep',
  ].map((k) => `lines.form.${k}`),
  ...[
    'line_in_use',
    'no_attendance',
    'too_many_lines',
    'invalidNumber',
    'outOfRange',
    'required',
    'tooLong',
    'invalidCharacter',
  ].map((k) => `lines.errors.${k}`),
];

function leafPaths(node: unknown, prefix = ''): string[] {
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

const placeholders = (value: unknown): string[] =>
  typeof value === 'string'
    ? [...value.matchAll(/\{(\w+)/g)].map((m) => m[1] as string).sort()
    : [];

// WHY : `satisfies` fait échouer le typecheck si un code propre aux postes quitte `LinesError`.
const LINE_ERRORS = [
  'line_in_use',
  'no_attendance',
  'too_many_lines',
] as const satisfies readonly LinesError[];

const SCHEMA_MESSAGES: Record<string, string> = {
  'invalid number': 'invalidNumber',
  'out of range': 'outOfRange',
  required: 'required',
  'too long': 'tooLong',
  'invalid character': 'invalidCharacter',
};

describe.each([
  ['fr', fr],
  ['en', en],
])('textes des postes (%s)', (_locale, messages) => {
  it('couvrent chaque texte des écrans', () => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });
});

describe('parité FR/EN des postes', () => {
  it("l'espace lines a les mêmes clés dans les deux langues", () => {
    const keys = (messages: unknown) => leafPaths(get(messages, 'lines')).sort();
    expect(keys(en)).toEqual(keys(fr));
  });

  it('chaque texte des postes est vérifié par la liste PATHS', () => {
    const unchecked = leafPaths(get(fr, 'lines'))
      .map((leaf) => `lines.${leaf}`)
      .filter((path) => !PATHS.includes(path));
    expect(unchecked).toEqual([]);
  });

  it('les variables ICU sont identiques en FR et EN', () => {
    for (const leaf of leafPaths(get(fr, 'lines'))) {
      const path = `lines.${leaf}`;
      expect({ path, vars: placeholders(get(en, path)) }).toEqual({
        path,
        vars: placeholders(get(fr, path)),
      });
    }
  });

  it.each([
    ['lines.form.editTitle', ['label']],
    ['lines.form.delete', ['label']],
    ['lines.scenario.current', ['level']],
    ['lines.scenario.option', ['level', 'total']],
  ])('%s expose ses variables', (path, vars) => {
    expect(placeholders(get(fr, path))).toEqual(vars);
    expect(placeholders(get(en, path))).toEqual(vars);
  });

  it("chaque message de validation du schéma a un texte d'erreur", () => {
    for (const key of Object.values(SCHEMA_MESSAGES)) {
      expect(isFilled(get(fr, `lines.errors.${key}`))).toBe(true);
      expect(isFilled(get(en, `lines.errors.${key}`))).toBe(true);
    }
  });

  it.each(LINE_ERRORS)('le code %s a son texte en FR et en EN', (code) => {
    expect(isFilled(get(fr, `lines.errors.${code}`))).toBe(true);
    expect(isFilled(get(en, `lines.errors.${code}`))).toBe(true);
  });
});
