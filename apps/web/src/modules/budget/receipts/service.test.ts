import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, gate, dossierRepo, linesRepo, ai, aiConfig } = vi.hoisted(() => ({
  repo: {
    insertReceipt: vi.fn(),
    createUploadUrl: vi.fn(),
    getReceipt: vi.fn(),
    downloadReceipt: vi.fn(),
    signedReadUrl: vi.fn(),
  },
  gate: { budgetGate: vi.fn() },
  dossierRepo: { getMyRole: vi.fn() },
  linesRepo: { listLines: vi.fn() },
  ai: { readReceipt: vi.fn() },
  aiConfig: { isAiEnabled: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('../gate', () => gate);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('../lines/repo', () => linesRepo);
vi.mock('@/modules/ai/receipt', () => ai);
vi.mock('@/modules/ai/config', () => aiConfig);

const { openReceipt, prepareReceiptUpload } = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const RECEIPT = '77777777-7777-4777-8777-777777777777';
const PATH = `${DOSSIER}/${RECEIPT}.jpg`;
const input = { dossierId: DOSSIER, mimeType: 'image/jpeg', sizeBytes: 120_000 };
const receipt = {
  id: RECEIPT,
  dossierId: DOSSIER,
  entryId: null,
  storagePath: PATH,
  mimeType: 'image/jpeg',
  sizeBytes: 120_000,
};

beforeEach(() => {
  vi.clearAllMocks();
  gate.budgetGate.mockResolvedValue(null);
  dossierRepo.getMyRole.mockResolvedValue('treasurer');
  repo.insertReceipt.mockResolvedValue({ data: receipt, error: null });
  repo.createUploadUrl.mockResolvedValue({ data: { path: PATH, token: 'tok' }, error: null });
  repo.getReceipt.mockResolvedValue({ data: receipt, error: null });
  repo.signedReadUrl.mockResolvedValue({ data: 'https://signed', error: null });
});

describe('prepareReceiptUpload', () => {
  it('prépare le reçu et son envoi signé', async () => {
    expect(await prepareReceiptUpload(input)).toEqual({
      ok: true,
      data: { receiptId: RECEIPT, path: PATH, token: 'tok' },
    });
    expect(repo.insertReceipt).toHaveBeenCalledWith(DOSSIER, 'image/jpeg', 120_000);
    expect(repo.createUploadUrl).toHaveBeenCalledWith(PATH);
  });

  it('nomme un mauvais type ou une taille hors bornes, sans écrire', async () => {
    expect(await prepareReceiptUpload({ ...input, mimeType: 'image/gif' })).toEqual({
      ok: false,
      error: 'receipt_type',
    });
    expect(await prepareReceiptUpload({ ...input, sizeBytes: 6_000_000 })).toEqual({
      ok: false,
      error: 'receipt_size',
    });
    expect(await prepareReceiptUpload({ ...input, dossierId: 'x' })).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(repo.insertReceipt).not.toHaveBeenCalled();
  });

  it('refuse un rôle inférieur au trésorier et un dossier hors budget', async () => {
    dossierRepo.getMyRole.mockResolvedValueOnce('contributor');
    expect(await prepareReceiptUpload(input)).toEqual({ ok: false, error: 'forbidden' });
    gate.budgetGate.mockResolvedValueOnce('not_found');
    expect(await prepareReceiptUpload(input)).toEqual({ ok: false, error: 'not_found' });
    expect(repo.insertReceipt).not.toHaveBeenCalled();
  });

  it('traduit la limite de reçus et un stockage en échec', async () => {
    repo.insertReceipt.mockResolvedValueOnce({
      data: null,
      error: { code: 'TL007', message: 'x' },
    });
    expect(await prepareReceiptUpload(input)).toEqual({ ok: false, error: 'too_many_receipts' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.createUploadUrl.mockResolvedValueOnce({
      data: null,
      error: { code: 'storage', message: 'x' },
    });
    expect(await prepareReceiptUpload(input)).toEqual({ ok: false, error: 'unknown' });
    expect(spy).toHaveBeenCalledWith('[budget/receipts] createUploadUrl failed', {
      code: 'storage',
    });
    spy.mockRestore();
  });
});

describe('openReceipt', () => {
  it('renvoie un lien signé pour un reçu visible', async () => {
    expect(await openReceipt({ receiptId: RECEIPT })).toEqual({
      ok: true,
      data: 'https://signed',
    });
    expect(repo.signedReadUrl).toHaveBeenCalledWith(PATH);
  });

  it('traite un identifiant invalide ou un reçu invisible comme absent', async () => {
    expect(await openReceipt({ receiptId: 'x' })).toEqual({ ok: false, error: 'not_found' });
    repo.getReceipt.mockResolvedValueOnce({ data: null, error: null });
    expect(await openReceipt({ receiptId: RECEIPT })).toEqual({ ok: false, error: 'not_found' });
    expect(repo.signedReadUrl).not.toHaveBeenCalled();
  });
});
