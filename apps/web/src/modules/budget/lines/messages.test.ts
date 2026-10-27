import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import { AMOUNT_MAX } from '../scenarios';
import { LineSchema } from './schema';
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

// WHY : le `Record` fait échouer le typecheck si un code est ajouté à `LinesError` sans texte.
// Les codes propres aux postes sont dans `lines.errors`, les autres dans `dossier.errors`.
const ERROR_PATHS: Record<LinesError, string> = {
  validation: 'dossier.errors.validation',
  forbidden: 'dossier.errors.forbidden',
  not_found: 'dossier.errors.not_found',
  unauthenticated: 'dossier.errors.unauthenticated',
  unknown: 'dossier.errors.unknown',
  line_in_use: 'lines.errors.line_in_use',
  no_attendance: 'lines.errors.no_attendance',
  too_many_lines: 'lines.errors.too_many_lines',
};

// WHY : table message Zod -> clé de texte ; le test vérifie qu'elle couvre les messages réels.
const SCHEMA_MESSAGES: Record<string, string> = {
  'invalid number': 'invalidNumber',
  'out of range': 'outOfRange',
  required: 'required',
  'too long': 'tooLong',
  'invalid character': 'invalidCharacter',
};

/** Messages réels du schéma, obtenus en le faisant échouer. */
function schemaIssueMessages(): string[] {
  const base = {
    dossierId: '00000000-0000-4000-8000-000000000000',
    lineId: '00000000-0000-4000-8000-000000000001',
    label: 'Salle',
    sober: '1',
    intermediate: '1',
    full: '1',
  };
  const bad = [
    { ...base, sober: 'abc' },
    { ...base, sober: String(AMOUNT_MAX + 1) },
    { ...base, label: '   ' },
    { ...base, label: 'x'.repeat(121) },
    { ...base, label: 'a\u0000b' },
  ];
  return bad.flatMap((input) => {
    const result = LineSchema.safeParse(input);
    return result.success ? ['(aucune erreur)'] : result.error.issues.map((i) => i.message);
  });
}

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

  it('chaque message réel du schéma a une clé et un texte FR et EN', () => {
    const messages = schemaIssueMessages();
    expect(new Set(messages).size).toBe(Object.keys(SCHEMA_MESSAGES).length);
    for (const message of messages) {
      const key = SCHEMA_MESSAGES[message];
      expect({ message, key }).toEqual({ message, key: expect.any(String) });
      expect(isFilled(get(fr, `lines.errors.${key}`))).toBe(true);
      expect(isFilled(get(en, `lines.errors.${key}`))).toBe(true);
    }
  });

  it.each(Object.entries(ERROR_PATHS))('le code %s a son texte en FR et en EN', (_code, path) => {
    expect(isFilled(get(fr, path))).toBe(true);
    expect(isFilled(get(en, path))).toBe(true);
  });

  it('les bornes citées dans les textes suivent le code', () => {
    // WHY : 100 = MAX_LINES de service.ts (non exporté, le module est « server-only »).
    expect(String(get(fr, 'lines.errors.outOfRange'))).toContain('100 000 000');
    expect(String(get(en, 'lines.errors.outOfRange'))).toContain('100,000,000');
    expect(AMOUNT_MAX).toBe(100_000_000);
    expect(String(get(fr, 'lines.errors.too_many_lines'))).toContain('100');
    expect(String(get(en, 'lines.errors.too_many_lines'))).toContain('100');
  });
});
