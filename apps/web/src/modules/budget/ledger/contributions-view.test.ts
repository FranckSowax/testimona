import { describe, expect, it } from 'vitest';
import type { DossierRole } from '@/modules/dossier/schema';
import { canManageLedger, contributionsView } from './contributions-view';
import { entryViews, type LedgerEntry } from './model';

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

// Promesse de 10 000 dont 4 000 versés (reste 6 000) et promesse soldée, jamais proposée.
const views = entryViews([
  entry({ id: 'p1', kind: 'pledge', method: null, amount: 10_000, partyName: 'Tante Marie' }),
  entry({ id: 'r1', amount: 4_000, pledgeId: 'p1' }),
  entry({ id: 'p2', kind: 'pledge', method: null, amount: 5_000, partyName: 'Oncle Paul' }),
  entry({ id: 'r2', amount: 5_000, pledgeId: 'p2' }),
]);
const members = [
  { userId: 'u1', displayName: 'Marie' },
  { userId: 'u2', displayName: null },
];

const lines = [
  { id: 'l1', label: 'Traiteur' },
  { id: 'l2', label: 'Transport' },
];

const view = (role: DossierRole | null) => contributionsView({ role, views, members, lines });

describe('contributionsView', () => {
  it.each<[DossierRole | null, boolean, boolean, boolean]>([
    [null, false, false, false],
    ['viewer', false, false, false],
    ['contributor', true, false, false],
    ['treasurer', true, true, false],
    ['coordinator', true, true, false],
    ['owner', true, true, true],
  ])('rôle %s : promettre %s, gérer %s, propriétaire %s', (role, canPledge, canManage, isOwner) => {
    expect(view(role)).toMatchObject({ canPledge, canManage, isOwner });
    expect(canManageLedger(role)).toBe(canManage);
  });

  it.each<DossierRole | null>([null, 'viewer', 'contributor'])(
    "n'envoie ni membres, ni promesses, ni postes au rôle %s",
    (role) => {
      expect(view(role)).toMatchObject({ memberOptions: [], pledgeOptions: [], lineOptions: [] });
    },
  );

  it.each<DossierRole>(['treasurer', 'coordinator', 'owner'])(
    'propose au rôle %s les membres, les promesses ouvertes avec leur reste et les postes',
    (role) => {
      const result = view(role);
      expect(result.memberOptions).toEqual([
        { id: 'u1', name: 'Marie' },
        { id: 'u2', name: null },
      ]);
      expect(result.pledgeOptions).toEqual([{ id: 'p1', label: 'Tante Marie', amount: 6_000 }]);
      expect(result.lineOptions).toEqual(lines);
    },
  );
});

describe('cotisations clôturées', () => {
  it('ne propose plus aucune saisie, même au propriétaire', () => {
    expect(contributionsView({ role: 'owner', views, members, lines, closed: true })).toEqual({
      canPledge: false,
      canManage: false,
      isOwner: true,
      memberOptions: [],
      pledgeOptions: [],
      lineOptions: [],
    });
  });
});
