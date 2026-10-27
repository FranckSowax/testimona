import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures sont créées avec vi.hoisted.
const { ledgerRepo, dossierRepo } = vi.hoisted(() => ({
  ledgerRepo: { insertEntry: vi.fn(), setVisibility: vi.fn() },
  dossierRepo: { getDossier: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => ledgerRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { recordExpense, recordPledge, recordReceipt, reverseEntry, setVisibility } =
  await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const USER = '66666666-6666-4666-8666-666666666666';
const KEY = '55555555-5555-4555-8555-555555555555';
const base = {
  dossierId: DOSSIER,
  idempotencyKey: KEY,
  partyName: 'Oncle Paul',
  amount: '50000',
  note: '',
  occurredOn: '2026-10-20',
};

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
  ledgerRepo.setVisibility.mockResolvedValue({ data: true, error: null });
});

describe('recordPledge', () => {
  it('enregistre une promesse au nom de l’utilisateur courant', async () => {
    expect(await recordPledge(base, USER)).toEqual({ ok: true, data: { id: 'e1' } });
    expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        dossierId: DOSSIER,
        kind: 'pledge',
        amount: 50_000,
        method: null,
        memberId: USER,
        idempotencyKey: KEY,
      }),
    );
  });

  it('refuse une saisie invalide avec ses erreurs de champ, sans écrire', async () => {
    const res = await recordPledge({ ...base, amount: '0' }, USER);
    expect(res).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { amount: 'out of range' },
    });
    expect(ledgerRepo.insertEntry).not.toHaveBeenCalled();
  });

  it('refuse un dossier illisible ou une porte sans budget', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(null);
    expect(await recordPledge(base, USER)).toMatchObject({ ok: false, error: 'not_found' });
    dossierRepo.getDossier.mockResolvedValueOnce({ id: DOSSIER, entryPoint: 'prepare' });
    expect(await recordPledge(base, USER)).toMatchObject({ ok: false, error: 'validation' });
  });
});

describe('recordReceipt et recordExpense', () => {
  it('passe le moyen, le membre et la promesse', async () => {
    await recordReceipt({ ...base, method: 'airtel_money', memberId: USER, pledgeId: KEY });
    expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'receipt',
        method: 'airtel_money',
        memberId: USER,
        pledgeId: KEY,
      }),
    );
    await recordExpense({ ...base, partyName: 'Traiteur', method: 'cash' });
    expect(ledgerRepo.insertEntry).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'expense', partyName: 'Traiteur', memberId: null }),
    );
  });

  it('traduit les codes de la base', async () => {
    const fail = (code: string) =>
      ledgerRepo.insertEntry.mockResolvedValueOnce({ data: null, error: { code, message: 'x' } });
    fail('42501');
    expect(await recordExpense({ ...base, method: 'cash' })).toMatchObject({ error: 'forbidden' });
    fail('TL002');
    expect(await recordReceipt({ ...base, method: 'cash', pledgeId: KEY })).toMatchObject({
      error: 'pledge_unavailable',
    });
    fail('TL003');
    expect(await recordReceipt({ ...base, method: 'cash', memberId: USER })).toMatchObject({
      error: 'validation',
    });
  });

  it('considère un double envoi comme réussi', async () => {
    ledgerRepo.insertEntry.mockResolvedValueOnce({
      data: { id: 'e9', duplicate: true },
      error: null,
    });
    expect(await recordExpense({ ...base, method: 'cash' })).toEqual({
      ok: true,
      data: { id: 'e9' },
    });
  });
});

describe('reverseEntry', () => {
  it('écrit une annulation qui vise la ligne', async () => {
    await reverseEntry({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: USER });
    expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'reversal', reversesId: USER, method: null }),
    );
  });

  it('signale une ligne déjà annulée ou invalide', async () => {
    ledgerRepo.insertEntry.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'x' },
    });
    expect(
      await reverseEntry({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: USER }),
    ).toMatchObject({ error: 'already_reversed' });
    ledgerRepo.insertEntry.mockResolvedValueOnce({
      data: null,
      error: { code: 'TL001', message: 'x' },
    });
    expect(
      await reverseEntry({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: USER }),
    ).toMatchObject({ error: 'validation' });
  });
});

describe('setVisibility', () => {
  it('enregistre le réglage et traduit un refus', async () => {
    expect(await setVisibility({ dossierId: DOSSIER, visibility: 'members' })).toEqual({
      ok: true,
      data: { visibility: 'members' },
    });
    ledgerRepo.setVisibility.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    expect(await setVisibility({ dossierId: DOSSIER, visibility: 'restricted' })).toMatchObject({
      error: 'forbidden',
    });
  });
});
