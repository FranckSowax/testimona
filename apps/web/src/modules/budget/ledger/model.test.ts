import { describe, expect, it } from 'vitest';
import {
  balance,
  canReverse,
  entryViews,
  openPledges,
  pledgeRemaining,
  remaining,
  type LedgerEntry,
} from './model';

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'x',
  kind: 'receipt',
  amount: 10_000,
  method: 'cash',
  partyName: 'Oncle Paul',
  memberId: null,
  pledgeId: null,
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  reversesKind: null,
  createdAt: '2026-10-20T10:00:00Z',
  ...over,
});

describe('entryViews', () => {
  it('marque les lignes annulées et les promesses honorées, et trie par date', () => {
    const views = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null, occurredOn: '2026-10-18' }),
      entry({ id: 'r1', pledgeId: 'p1', occurredOn: '2026-10-19' }),
      entry({ id: 'e1', kind: 'expense', occurredOn: '2026-10-21' }),
      entry({
        id: 'x1',
        kind: 'reversal',
        method: null,
        reversesId: 'e1',
        reversesKind: 'expense',
        occurredOn: '2026-10-21',
        createdAt: '2026-10-21T12:00:00Z',
      }),
    ]);
    expect(views.map((v) => v.id)).toEqual(['x1', 'e1', 'r1', 'p1']);
    expect(views.find((v) => v.id === 'e1')).toMatchObject({ reversed: true });
    expect(views.find((v) => v.id === 'p1')).toMatchObject({ fulfilled: true, reversed: false });
  });

  it('rouvre une promesse dont la cotisation a été annulée', () => {
    const views = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null }),
      entry({ id: 'r1', pledgeId: 'p1' }),
      entry({
        id: 'x1',
        kind: 'reversal',
        method: null,
        reversesId: 'r1',
        reversesKind: 'receipt',
      }),
    ]);
    expect(views.find((v) => v.id === 'p1')?.fulfilled).toBe(false);
    expect(openPledges(views).map((v) => v.id)).toEqual(['p1']);
  });

  it('cumule les versements partiels d’une promesse', () => {
    const views = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null, amount: 10_000 }),
      entry({ id: 'r1', pledgeId: 'p1', amount: 4_000 }),
    ]);
    const pledge = views.find((v) => v.id === 'p1')!;
    expect(pledge).toMatchObject({ paid: 4_000, fulfilled: false });
    expect(pledgeRemaining(pledge)).toBe(6_000);
    const paidOff = entryViews([
      entry({ id: 'p1', kind: 'pledge', method: null, amount: 10_000 }),
      entry({ id: 'r1', pledgeId: 'p1', amount: 4_000 }),
      entry({ id: 'r2', pledgeId: 'p1', amount: 6_000 }),
    ]).find((v) => v.id === 'p1')!;
    expect(paidOff).toMatchObject({ paid: 10_000, fulfilled: true });
    expect(pledgeRemaining(paidOff)).toBe(0);
  });
});

describe('canReverse', () => {
  it('n’autorise l’annulation que d’une ligne active qui n’est pas une annulation', () => {
    const views = entryViews([
      entry({ id: 'r1' }),
      entry({
        id: 'x1',
        kind: 'reversal',
        method: null,
        reversesId: 'r1',
        reversesKind: 'receipt',
        createdAt: '2026-10-21T00:00:00Z',
      }),
    ]);
    expect(canReverse(views.find((v) => v.id === 'x1')!)).toBe(false);
    expect(canReverse(views.find((v) => v.id === 'r1')!)).toBe(false);
    expect(canReverse(entryViews([entry({ id: 'e1', kind: 'expense' })])[0]!)).toBe(true);
  });
});

describe('balance et remaining', () => {
  const totals = { received: 120_000, pledgedOpen: 30_000, spent: 40_000 };
  it('calcule le solde et le reste à réunir, jamais négatif', () => {
    expect(balance(totals)).toBe(80_000);
    expect(remaining(500_000, totals)).toBe(380_000);
    expect(remaining(100_000, totals)).toBe(0);
    expect(remaining(null, totals)).toBeNull();
  });
});
