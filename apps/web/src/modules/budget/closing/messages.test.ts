import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import { CSV_COLUMNS } from './csv';
import type { ClosingError } from './service';
import { closingErrorText } from './ui/closingError';

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

const PATHS = [
  ...[
    'title',
    'intro',
    'provisional',
    'spentTitle',
    'receivedTitleAll',
    'receivedTitleOwn',
    'receivedEmpty',
    'exportTitle',
    'exportHint',
    'export',
  ].map((k) => `closing.page.${k}`),
  ...['line', 'spent', 'unassigned', 'total', 'empty'].map((k) => `closing.spent.${k}`),
  ...[
    'title',
    'hint',
    'label',
    'copy',
    'copied',
    'copyManual',
    'share',
    'whatsapp',
    'whatsappLabel',
    'heading',
    'headingNoName',
    'budget',
    'budgetRetained',
    'received',
    'pledgedOpen',
    'spent',
    'balance',
    'remaining',
    'closed',
    'provisional',
  ].map((k) => `closing.share.${k}`),
  ...[
    'title',
    'close',
    'closeWarning',
    'confirmClose',
    'keepOpen',
    'closing',
    'closed',
    'reopen',
    'reopenHint',
    'reopening',
    'reopened',
    'reopenOwnerOnly',
  ].map((k) => `closing.control.${k}`),
  ...['closed', 'seeSummary'].map((k) => `closing.notice.${k}`),
  ...['closed', 'seeSummary'].map((k) => `closing.card.${k}`),
  'closing.export.fileName',
  ...CSV_COLUMNS.map((c) => `closing.export.columns.${c}`),
  'closing.errors.too_large',
];

// WHY : le `Record` fait échouer le typecheck si un code est ajouté à `ClosingError` sans texte.
const ERROR_PATHS: Record<ClosingError, string> = {
  validation: 'dossier.errors.validation',
  forbidden: 'dossier.errors.forbidden',
  not_found: 'dossier.errors.not_found',
  unauthenticated: 'dossier.errors.unauthenticated',
  unknown: 'dossier.errors.unknown',
  too_large: 'closing.errors.too_large',
};

describe.each([
  ['fr', fr],
  ['en', en],
] as const)('textes de la clôture (%s)', (locale, messages) => {
  it('couvrent chaque texte des écrans', () => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });

  it.each(Object.entries(ERROR_PATHS))('le code %s a son texte', (code, path) => {
    const t = createTranslator({ locale, messages });
    expect(closingErrorText(code as ClosingError, (key) => t(key as never))).toBe(
      get(messages, path),
    );
  });
});

describe('parité FR/EN de la clôture', () => {
  it("l'espace closing a les mêmes clés dans les deux langues", () => {
    const keys = (messages: unknown) => leafPaths(get(messages, 'closing')).sort();
    expect(keys(en)).toEqual(keys(fr));
  });

  it('chaque texte de la clôture est vérifié par la liste PATHS', () => {
    const unchecked = leafPaths(get(fr, 'closing'))
      .map((leaf) => `closing.${leaf}`)
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

  it.each([
    ['closing.share.heading', ['name']],
    ['closing.share.received', ['amount']],
    ['closing.share.closed', ['date']],
    ['closing.notice.closed', ['date']],
    ['closing.card.closed', ['date']],
  ])('%s expose ses variables', (path, vars) => {
    expect(placeholders(get(fr, path))).toEqual(vars);
  });

  it.each([
    [fr, '(nouvel onglet)'],
    [en, '(new tab)'],
  ])(
    'le libellé du lien WhatsApp reprend le texte visible et annonce le nouvel onglet',
    (m, tab) => {
      const label = get(m, 'closing.share.whatsappLabel') as string;
      expect(label.startsWith(get(m, 'closing.share.whatsapp') as string)).toBe(true);
      expect(label.endsWith(tab)).toBe(true);
    },
  );

  it('le nom du fichier exporté reste en ASCII', () => {
    for (const m of [fr, en]) expect(get(m, 'closing.export.fileName')).toMatch(/^[a-z-]+$/);
  });
});
