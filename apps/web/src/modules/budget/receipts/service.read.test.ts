import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: séparé de service.test.ts (limite de 300 lignes) ; mêmes doublures.
const { repo, gate, dossierRepo, linesRepo, ai, aiConfig, closingRepo } = vi.hoisted(() => ({
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
  closingRepo: { getClosure: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('../gate', () => gate);
vi.mock('../closing/repo', () => closingRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('../lines/repo', () => linesRepo);
vi.mock('@/modules/ai/receipt', () => ai);
vi.mock('@/modules/ai/config', () => aiConfig);

const { readReceiptPrefill } = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const RECEIPT = '77777777-7777-4777-8777-777777777777';
const LINE = '55555555-5555-4555-8555-555555555555';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
const input = { dossierId: DOSSIER, receiptId: RECEIPT };
const receipt = {
  id: RECEIPT,
  dossierId: DOSSIER,
  entryId: null,
  storagePath: `${DOSSIER}/${RECEIPT}.png`,
  mimeType: 'image/png',
  sizeBytes: 6,
};
const coffin = {
  id: LINE,
  gridKey: 'coffin',
  label: 'Cercueil',
  amounts: { sober: 0, intermediate: 0, full: 0 },
  edited: false,
  position: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  gate.budgetGate.mockResolvedValue(null);
  dossierRepo.getMyRole.mockResolvedValue('treasurer');
  closingRepo.getClosure.mockResolvedValue({ data: { closedAt: null }, error: null });
  aiConfig.isAiEnabled.mockReturnValue(true);
  repo.getReceipt.mockResolvedValue({ data: receipt, error: null });
  repo.downloadReceipt.mockResolvedValue({ data: JPEG, error: null });
  linesRepo.listLines.mockResolvedValue({ data: [coffin], error: null });
  ai.readReceipt.mockResolvedValue({
    ok: true,
    data: { amount: 45_000, date: '2026-10-20', vendor: 'Mba', gridKey: 'coffin' },
  });
});

describe('readReceiptPrefill', () => {
  it('refuse un dossier clôturé sans lire la photo ni consommer le quota', async () => {
    closingRepo.getClosure.mockResolvedValueOnce({
      data: { closedAt: '2026-10-28T09:00:00Z' },
      error: null,
    });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'closed' });
    expect(repo.downloadReceipt).not.toHaveBeenCalled();
    expect(ai.readReceipt).not.toHaveBeenCalled();
  });

  it('refuse si l’état de clôture ne se lit pas, sans lire la photo', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    closingRepo.getClosure.mockResolvedValueOnce({
      data: null,
      error: { code: 'boom', message: 'x' },
    });
    expect(await readReceiptPrefill(input)).toMatchObject({ ok: false });
    expect(repo.downloadReceipt).not.toHaveBeenCalled();
    expect(ai.readReceipt).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it.each([
    ['un rôle insuffisant', () => dossierRepo.getMyRole.mockResolvedValueOnce('contributor')],
    ['un dossier hors budget', () => gate.budgetGate.mockResolvedValueOnce('not_found')],
  ])('ne lit pas la clôture pour %s', async (_case, arrange) => {
    arrange();
    expect(await readReceiptPrefill(input)).toMatchObject({ ok: false });
    expect(closingRepo.getClosure).not.toHaveBeenCalled();
  });

  it('préremplit la dépense et propose le poste de la clé lue', async () => {
    expect(await readReceiptPrefill(input)).toEqual({
      ok: true,
      data: { amount: 45_000, occurredOn: '2026-10-20', partyName: 'Mba', budgetLineId: LINE },
    });
    // WHY: le type vient des octets (JPEG), pas du type déclaré à l'envoi (PNG).
    expect(ai.readReceipt).toHaveBeenCalledWith(
      { dossierId: DOSSIER, image: { bytes: JPEG, mimeType: 'image/jpeg' } },
      undefined,
    );
  });

  it('ne propose aucun poste sans poste correspondant', async () => {
    linesRepo.listLines.mockResolvedValueOnce({ data: [], error: null });
    const res = await readReceiptPrefill(input);
    expect(res.ok && res.data.budgetLineId).toBeNull();
  });

  it('refuse un rôle inférieur au trésorier avant toute lecture', async () => {
    dossierRepo.getMyRole.mockResolvedValueOnce('viewer');
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'forbidden' });
    expect(repo.getReceipt).not.toHaveBeenCalled();
  });

  it('est indisponible sans IA, sans télécharger la photo', async () => {
    aiConfig.isAiEnabled.mockReturnValueOnce(false);
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'unavailable' });
    expect(repo.downloadReceipt).not.toHaveBeenCalled();
  });

  it('traduit une erreur de lecture du reçu', async () => {
    repo.getReceipt.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'x' } });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'forbidden' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.getReceipt.mockResolvedValueOnce({ data: null, error: { code: 'XX000', message: 'x' } });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'unknown' });
    expect(spy).toHaveBeenCalledWith('[budget/receipts] getReceipt failed', { code: 'XX000' });
    spy.mockRestore();
    expect(repo.downloadReceipt).not.toHaveBeenCalled();
  });

  it('refuse un reçu absent, d’un autre dossier ou déjà joint', async () => {
    repo.getReceipt.mockResolvedValueOnce({ data: null, error: null });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'not_found' });
    repo.getReceipt.mockResolvedValueOnce({
      data: { ...receipt, dossierId: '99999999-9999-4999-8999-999999999999' },
      error: null,
    });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'not_found' });
    repo.getReceipt.mockResolvedValueOnce({ data: { ...receipt, entryId: LINE }, error: null });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'validation' });
    expect(ai.readReceipt).not.toHaveBeenCalled();
  });

  it('ne consomme pas le quota si la photo est illisible, trop lourde ou n’est pas une image', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.downloadReceipt.mockResolvedValueOnce({
      data: null,
      error: { code: 'storage', message: 'x' },
    });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'failed' });
    repo.downloadReceipt.mockResolvedValueOnce({
      data: new Uint8Array(5 * 1024 * 1024 + 1),
      error: null,
    });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'receipt_size' });
    repo.downloadReceipt.mockResolvedValueOnce({
      data: new TextEncoder().encode('GIF89a'),
      error: null,
    });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'receipt_type' });
    repo.downloadReceipt.mockResolvedValueOnce({
      data: null,
      error: { code: 'receipt_too_large', message: 'x' },
    });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'receipt_size' });
    linesRepo.listLines.mockResolvedValueOnce({
      data: null,
      error: { code: 'XX000', message: 'x' },
    });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'failed' });
    expect(ai.readReceipt).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('transmet le quota atteint et l’échec de l’IA', async () => {
    ai.readReceipt.mockResolvedValueOnce({ ok: false, error: 'quota' });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'quota' });
    ai.readReceipt.mockResolvedValueOnce({ ok: false, error: 'failed' });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'failed' });
  });

  it('garde la photo jointe quand elle est trop lourde pour l’IA ou refusée par la lecture', async () => {
    ai.readReceipt.mockResolvedValueOnce({ ok: false, error: 'too_large' });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'too_large_to_read' });
    ai.readReceipt.mockResolvedValueOnce({ ok: false, error: 'unsupported' });
    expect(await readReceiptPrefill(input)).toEqual({ ok: false, error: 'failed' });
  });
});
