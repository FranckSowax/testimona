import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import { ENTRY_KINDS, ENTRY_METHODS, VISIBILITIES } from './schema';

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
  ...ENTRY_KINDS.map((k) => `ledger.kind.${k}`),
  ...ENTRY_METHODS.map((m) => `ledger.method.${m}`),
  ...VISIBILITIES.map((v) => `ledger.visibility.${v}`),
  ...['title', 'intro', 'restrictedNote', 'membersNote', 'empty', 'seeBudget', 'backToDossier'].map(
    (k) => `ledger.page.${k}`,
  ),
  ...['budget', 'budgetNone', 'received', 'pledgedOpen', 'spent', 'balance', 'remaining'].map(
    (k) => `ledger.summary.${k}`,
  ),
  ...[
    'listTitle',
    'reversed',
    'fulfilled',
    'partlyPaid',
    'reversalOf',
    'reverse',
    'confirmReverse',
    'keep',
    'reverseLabel',
    'reverseWarning',
    'reversing',
  ].map((k) => `ledger.entry.${k}`),
  ...[
    'pledgeTitle',
    'receiptTitle',
    'expenseTitle',
    'party',
    'supplier',
    'amount',
    'method',
    'member',
    'memberNone',
    'memberUnnamed',
    'memberFromPledge',
    'pledge',
    'pledgeNone',
    'date',
    'note',
    'submit',
    'saved',
  ].map((k) => `ledger.form.${k}`),
  ...['title', 'save', 'saved'].map((k) => `ledger.visibility.${k}`),
  ...[
    'already_reversed',
    'pledge_unavailable',
    'invalidNumber',
    'outOfRange',
    'invalidDate',
    'required',
    'tooLong',
    'invalidCharacter',
  ].map((k) => `ledger.errors.${k}`),
  ...['title', 'summary', 'summaryNoBudget', 'unavailable', 'open'].map((k) => `ledger.card.${k}`),
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
])('textes du registre (%s)', (_locale, messages) => {
  it('couvrent chaque type, moyen, réglage et texte des écrans', () => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });
});

const placeholders = (value: unknown): string[] =>
  typeof value === 'string'
    ? [...value.matchAll(/\{(\w+)/g)].map((m) => m[1] as string).sort()
    : [];

const SCHEMA_MESSAGES: Record<string, string> = {
  'invalid number': 'invalidNumber',
  'out of range': 'outOfRange',
  'invalid date': 'invalidDate',
  required: 'required',
  'too long': 'tooLong',
  'invalid character': 'invalidCharacter',
};

describe('parité FR/EN du registre', () => {
  it("l'espace ledger a les mêmes clés dans les deux langues", () => {
    const keys = (messages: unknown) => leafPaths(get(messages, 'ledger')).sort();
    expect(keys(en)).toEqual(keys(fr));
  });

  it('chaque texte du registre est vérifié par la liste PATHS', () => {
    const unchecked = leafPaths(get(fr, 'ledger'))
      .map((leaf) => `ledger.${leaf}`)
      .filter((path) => !PATHS.includes(path));
    expect(unchecked).toEqual([]);
  });

  it('les variables ICU sont identiques en FR et EN', () => {
    for (const leaf of leafPaths(get(fr, 'ledger'))) {
      const path = `ledger.${leaf}`;
      expect({ path, vars: placeholders(get(en, path)) }).toEqual({
        path,
        vars: placeholders(get(fr, path)),
      });
    }
  });

  it.each([
    ['ledger.entry.partlyPaid', ['paid']],
    ['ledger.entry.reversalOf', ['kind']],
    ['ledger.entry.reverseLabel', ['entry']],
    ['ledger.card.summary', ['budget', 'received']],
    ['ledger.card.summaryNoBudget', ['received']],
  ])('%s expose ses variables', (path, vars) => {
    expect(placeholders(get(fr, path))).toEqual(vars);
    expect(placeholders(get(en, path))).toEqual(vars);
  });

  it("chaque message de validation du schéma a un texte d'erreur", () => {
    for (const key of Object.values(SCHEMA_MESSAGES)) {
      expect(isFilled(get(fr, `ledger.errors.${key}`))).toBe(true);
      expect(isFilled(get(en, `ledger.errors.${key}`))).toBe(true);
    }
  });
});
