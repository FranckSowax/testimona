import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, gate, dossierRepo, linesRepo } = vi.hoisted(() => ({
  repo: { closeLedger: vi.fn(), reopenLedger: vi.fn(), listExportRows: vi.fn() },
  gate: { budgetGate: vi.fn() },
  dossierRepo: { getMyRole: vi.fn() },
  linesRepo: { listLines: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('../gate', () => gate);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('../lines/repo', () => linesRepo);

const { closeLedger, exportLedger, reopenLedger } = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const LINE = '55555555-5555-4555-8555-555555555555';
const row = {
  id: 'e1',
  kind: 'expense',
  amount: 25_000,
  method: 'cash',
  partyName: 'Pompes funèbres',
  budgetLineId: LINE,
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  createdAt: '2026-10-20T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  gate.budgetGate.mockResolvedValue(null);
  dossierRepo.getMyRole.mockResolvedValue('treasurer');
  repo.closeLedger.mockResolvedValue({ data: '2026-10-28T09:00:00Z', error: null });
  repo.reopenLedger.mockResolvedValue({ data: true, error: null });
  repo.listExportRows.mockResolvedValue({ data: [row], error: null });
  linesRepo.listLines.mockResolvedValue({
    data: [{ id: LINE, gridKey: null, label: 'Cercueil', amounts: {}, edited: true, position: 0 }],
    error: null,
  });
});

describe('closeLedger', () => {
  it('clôture pour un trésorier et renvoie la date', async () => {
    expect(await closeLedger({ dossierId: DOSSIER })).toEqual({
      ok: true,
      data: { closedAt: '2026-10-28T09:00:00Z' },
    });
    expect(repo.closeLedger).toHaveBeenCalledWith(DOSSIER);
  });

  it('refuse sans écrire un identifiant invalide, un dossier hors budget et un contributeur', async () => {
    expect(await closeLedger({ dossierId: 'x' })).toEqual({ ok: false, error: 'validation' });
    gate.budgetGate.mockResolvedValueOnce('not_found');
    expect(await closeLedger({ dossierId: DOSSIER })).toEqual({ ok: false, error: 'not_found' });
    dossierRepo.getMyRole.mockResolvedValueOnce('contributor');
    expect(await closeLedger({ dossierId: DOSSIER })).toEqual({ ok: false, error: 'forbidden' });
    expect(repo.closeLedger).not.toHaveBeenCalled();
  });

  it('traduit un refus de la base et journalise un code inconnu', async () => {
    repo.closeLedger.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'x' } });
    expect(await closeLedger({ dossierId: DOSSIER })).toEqual({ ok: false, error: 'forbidden' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.closeLedger.mockResolvedValueOnce({ data: null, error: { code: 'XX000', message: 'x' } });
    expect(await closeLedger({ dossierId: DOSSIER })).toEqual({ ok: false, error: 'unknown' });
    expect(spy).toHaveBeenCalledWith('[budget/closing] closeLedger failed', { code: 'XX000' });
    spy.mockRestore();
  });
});

describe('reopenLedger', () => {
  it('rouvre pour le propriétaire seul', async () => {
    dossierRepo.getMyRole.mockResolvedValueOnce('owner');
    expect(await reopenLedger({ dossierId: DOSSIER })).toEqual({ ok: true, data: true });
    for (const role of ['coordinator', 'treasurer']) {
      dossierRepo.getMyRole.mockResolvedValueOnce(role);
      expect(await reopenLedger({ dossierId: DOSSIER })).toEqual({
        ok: false,
        error: 'forbidden',
      });
    }
    expect(repo.reopenLedger).toHaveBeenCalledTimes(1);
  });
});

describe('exportLedger', () => {
  it('rend les lignes et les libellés des postes pour un trésorier', async () => {
    expect(await exportLedger({ dossierId: DOSSIER })).toEqual({
      ok: true,
      data: { rows: [row], lineLabels: new Map([[LINE, 'Cercueil']]) },
    });
  });

  it('refuse un contributeur, un identifiant invalide et un registre trop grand', async () => {
    dossierRepo.getMyRole.mockResolvedValueOnce('contributor');
    expect(await exportLedger({ dossierId: DOSSIER })).toEqual({ ok: false, error: 'forbidden' });
    expect(repo.listExportRows).not.toHaveBeenCalled();
    expect(await exportLedger({ dossierId: 'x' })).toEqual({ ok: false, error: 'not_found' });
    repo.listExportRows.mockResolvedValueOnce({
      data: null,
      error: { code: 'too_large', message: 'x' },
    });
    expect(await exportLedger({ dossierId: DOSSIER })).toEqual({ ok: false, error: 'too_large' });
  });

  it('rend l’erreur de lecture des postes', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    linesRepo.listLines.mockResolvedValueOnce({
      data: null,
      error: { code: 'XX000', message: 'x' },
    });
    expect(await exportLedger({ dossierId: DOSSIER })).toEqual({ ok: false, error: 'unknown' });
    spy.mockRestore();
  });
});
