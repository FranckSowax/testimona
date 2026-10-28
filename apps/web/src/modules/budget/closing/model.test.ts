import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';
import { entryViews, type LedgerEntry } from '../ledger/model';
import {
  formatClosedOn,
  receivedContributions,
  seesAllAmounts,
  summaryText,
  type Translate,
} from './model';

const translate = (messages: typeof fr | typeof en, locale: 'fr' | 'en'): Translate => {
  const t = createTranslator({ locale, messages });
  return (key, values) => t(`closing.share.${key}` as never, values as never);
};
const money = (amount: number) => `${amount} F`;
const totals = { received: 250_000, pledgedOpen: 50_000, spent: 100_000 };

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'x',
  kind: 'receipt',
  amount: 10_000,
  method: 'cash',
  partyName: 'Oncle Paul',
  memberId: null,
  pledgeId: null,
  budgetLineId: null,
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  reversesKind: null,
  createdAt: '2026-10-20T10:00:00Z',
  ...over,
});

describe('summaryText', () => {
  it('donne les totaux d’un bilan clôturé, sans aucun nom de contributeur', () => {
    const text = summaryText(
      {
        name: 'Jean Ndong',
        budget: { amount: 3_100_000, source: 'retained' },
        totals,
        closedOn: '28 octobre 2026',
      },
      translate(fr, 'fr'),
      money,
    );
    expect(text).toBe(
      [
        'Cotisations pour Jean Ndong',
        '',
        'Budget retenu : 3100000 F',
        'Reçu : 250000 F',
        'Promis, non versé : 50000 F',
        'Dépensé : 100000 F',
        'Disponible : 150000 F',
        'Reste à réunir : 2850000 F',
        '',
        'Cotisations clôturées le 28 octobre 2026.',
      ].join('\n'),
    );
  });

  it('omet le budget et le reste sans budget, et dit un bilan provisoire', () => {
    const text = summaryText(
      { name: null, budget: null, totals, closedOn: null },
      translate(en, 'en'),
      money,
    );
    expect(text).toBe(
      [
        'Contributions summary',
        '',
        'Received: 250000 F',
        'Pledged, not paid: 50000 F',
        'Spent: 100000 F',
        'Available: 150000 F',
        '',
        'Provisional summary: contributions are still open.',
      ].join('\n'),
    );
  });

  it('nomme un budget envisagé', () => {
    const text = summaryText(
      { name: null, budget: { amount: 1_000, source: 'envisaged' }, totals, closedOn: null },
      translate(fr, 'fr'),
      money,
    );
    expect(text).toContain('Budget envisagé : 1000 F');
    expect(text).toContain('Reste à réunir : 0 F');
  });
});

describe('summaryText (cas limites)', () => {
  it('écrit un solde négatif tel quel', () => {
    const text = summaryText(
      {
        name: null,
        budget: null,
        totals: { received: 10, pledgedOpen: 0, spent: 40 },
        closedOn: null,
      },
      translate(en, 'en'),
      money,
    );
    expect(text).toContain('Available: -30 F');
  });

  it('dit la clôture sans budget', () => {
    const text = summaryText(
      { name: 'Jean Ndong', budget: null, totals, closedOn: '28 octobre 2026' },
      translate(fr, 'fr'),
      money,
    );
    expect(text).not.toContain('Budget');
    expect(text).not.toContain('Reste à réunir');
    expect(text).toContain('Cotisations clôturées le 28 octobre 2026.');
  });
});

describe('receivedContributions', () => {
  it('garde les cotisations reçues actives, sans promesses, dépenses ni annulations', () => {
    const views = entryViews([
      entry({ id: 'r1', partyName: 'Tante Marie' }),
      entry({ id: 'r2', partyName: 'Oncle Paul', occurredOn: '2026-10-21' }),
      entry({ id: 'v1', kind: 'reversal', reversesId: 'r2', reversesKind: 'receipt' }),
      entry({ id: 'p1', kind: 'pledge', method: null }),
      entry({ id: 'x1', kind: 'expense' }),
    ]);
    expect(receivedContributions(views).map((v) => v.id)).toEqual(['r1']);
  });
});

describe('receivedContributions (cas limites)', () => {
  it('garde un versement lié à une promesse', () => {
    const views = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null, amount: 20_000 }),
      entry({ id: 'r1', pledgeId: 'p1', amount: 5_000 }),
    ]);
    expect(receivedContributions(views).map((v) => v.id)).toEqual(['r1']);
  });
});

describe('seesAllAmounts', () => {
  it('ouvre le détail au trésorier et plus, ou à tous en mode members', () => {
    expect(seesAllAmounts('treasurer', 'restricted')).toBe(true);
    expect(seesAllAmounts('owner', 'restricted')).toBe(true);
    expect(seesAllAmounts('contributor', 'restricted')).toBe(false);
    expect(seesAllAmounts('viewer', 'members')).toBe(true);
    expect(seesAllAmounts(null, 'members')).toBe(false);
  });
});

describe('formatClosedOn', () => {
  it('date la clôture dans le fuseau du registre (Africa/Libreville)', () => {
    // WHY: 23 h 30 UTC est déjà le lendemain à Libreville (UTC+1).
    // Le libellé du mois dépend de la version d'ICU de Node : on fige le jour et l'année seulement.
    expect(formatClosedOn('2026-10-27T23:30:00Z', 'fr')).toMatch(/^28\s.+\s2026$/);
    expect(formatClosedOn('2026-10-27T23:30:00Z', 'en')).toMatch(/^28\s.+\s2026$/);
    expect(formatClosedOn('2026-10-27T22:30:00Z', 'fr')).toMatch(/^27\s.+\s2026$/);
  });

  it('renvoie une chaîne vide pour une date invalide', () => {
    expect(formatClosedOn('pas une date', 'fr')).toBe('');
    expect(formatClosedOn('', 'en')).toBe('');
  });
});
