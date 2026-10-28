import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import type { ReadError, ReceiptsError } from './service';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );
const isFilled = (value: unknown) => typeof value === 'string' && value.trim() !== '';

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

// WHY : les `Record` font échouer le typecheck si un code est ajouté à `ReceiptsError` ou à
// `ReadError` sans texte. Les codes génériques sont dans `dossier.errors`, les autres dans `receipts`.
const RECEIPTS_ERROR_PATHS: Record<ReceiptsError, string> = {
  validation: 'dossier.errors.validation',
  forbidden: 'dossier.errors.forbidden',
  not_found: 'dossier.errors.not_found',
  unauthenticated: 'dossier.errors.unauthenticated',
  unknown: 'dossier.errors.unknown',
  receipt_type: 'receipts.errors.receipt_type',
  receipt_size: 'receipts.errors.receipt_size',
  too_many_receipts: 'receipts.errors.too_many_receipts',
  closed: 'receipts.errors.closed',
};

// WHY : `upload_failed` est un code du navigateur (envoi au stockage en échec), pas du service ;
// il n'entre donc pas dans ces `Record`, et son texte est vérifié par la liste PATHS.
const READ_ERROR_PATHS: Record<ReadError, string> = {
  ...RECEIPTS_ERROR_PATHS,
  unavailable: 'receipts.manual.unavailable',
  quota: 'receipts.manual.quota',
  failed: 'receipts.manual.failed',
  too_large_to_read: 'receipts.manual.too_large_to_read',
};

const PATHS = [
  ...['label', 'hint', 'uploading', 'reading', 'read'].map((k) => `receipts.capture.${k}`),
  ...['unavailable', 'quota', 'failed', 'too_large_to_read'].map((k) => `receipts.manual.${k}`),
  ...['receipt_type', 'receipt_size', 'too_many_receipts', 'upload_failed', 'closed'].map(
    (k) => `receipts.errors.${k}`,
  ),
  ...['retry', 'continue', 'next', 'frozen'].map((k) => `receipts.unlinked.${k}`),
];

describe.each([
  ['fr', fr],
  ['en', en],
])('textes des reçus (%s)', (_locale, messages) => {
  it('couvrent chaque état et chaque erreur', () => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });

  it.each(Object.entries(READ_ERROR_PATHS))('le code %s a son texte', (_code, path) => {
    expect(isFilled(get(messages, path))).toBe(true);
  });
});

describe('parité FR/EN des reçus', () => {
  it("l'espace receipts a les mêmes clés dans les deux langues", () => {
    const keys = (messages: unknown) => leafPaths(get(messages, 'receipts')).sort();
    expect(keys(en)).toEqual(keys(fr));
  });

  it('chaque texte des reçus est vérifié par la liste PATHS', () => {
    const unchecked = leafPaths(get(fr, 'receipts'))
      .map((leaf) => `receipts.${leaf}`)
      .filter((path) => !PATHS.includes(path));
    expect(unchecked).toEqual([]);
  });

  it('les variables ICU sont identiques en FR et EN', () => {
    for (const path of PATHS) {
      expect({ path, vars: placeholders(get(en, path)) }).toEqual({
        path,
        vars: placeholders(get(fr, path)),
      });
    }
  });
});
