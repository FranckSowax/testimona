import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: séparé de service.test.ts (limite de 300 lignes) ; mêmes doublures.
const { ledgerRepo, dossierRepo, receiptsRepo } = vi.hoisted(() => ({
  ledgerRepo: { insertEntry: vi.fn(), setVisibility: vi.fn() },
  dossierRepo: { getDossier: vi.fn() },
  receiptsRepo: { attachReceipt: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => ledgerRepo);
vi.mock('../receipts/repo', () => receiptsRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { recordExpense, recordPledge, recordReceipt, reverseEntry } = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const USER = '66666666-6666-4666-8666-666666666666';
const KEY = '55555555-5555-4555-8555-555555555555';
const RECEIPT = '77777777-7777-4777-8777-777777777777';
const base = {
  dossierId: DOSSIER,
  idempotencyKey: KEY,
  partyName: 'Oncle Paul',
  amount: '50000',
  note: '',
  occurredOn: '2026-10-20',
};
const CLOSED = { data: null, error: { code: 'TL009', message: 'ledger closed' } };

beforeEach(() => {
  vi.clearAllMocks();
  dossierRepo.getDossier.mockResolvedValue({
    id: DOSSIER,
    title: 'Jean Ndong',
    city: 'Libreville',
    countryCode: 'GA',
    entryPoint: 'death',
    createdAt: '2026-10-27T00:00:00Z',
  });
  ledgerRepo.insertEntry.mockResolvedValue({ data: { id: 'e1', duplicate: false }, error: null });
  receiptsRepo.attachReceipt.mockResolvedValue({ data: true, error: null });
});

describe('dossier clôturé', () => {
  it('nomme le refus de la base (TL009) pour chaque écriture du registre', async () => {
    ledgerRepo.insertEntry.mockResolvedValue(CLOSED);
    const closed = { ok: false, error: 'closed' };
    expect(await recordPledge(base, USER)).toEqual(closed);
    expect(await recordReceipt({ ...base, method: 'cash', memberId: '', pledgeId: '' })).toEqual(
      closed,
    );
    expect(
      await recordExpense({ ...base, method: 'cash', budgetLineId: '', receiptId: '' }),
    ).toEqual(closed);
    expect(
      await reverseEntry({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: RECEIPT }),
    ).toEqual(closed);
  });

  it('garde la dépense et abandonne le reçu si le dossier est clôturé entre les deux', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    receiptsRepo.attachReceipt.mockResolvedValueOnce(CLOSED);
    expect(
      await recordExpense({ ...base, method: 'cash', budgetLineId: '', receiptId: RECEIPT }),
    ).toEqual({ ok: false, error: 'receipt_unavailable' });
    spy.mockRestore();
  });
});
