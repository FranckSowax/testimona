import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { aiRepo } = vi.hoisted(() => ({ aiRepo: { consumeAiQuota: vi.fn() } }));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => aiRepo);

const { parseReceiptReading, readReceipt } = await import('./receipt');
const { AiProviderError } = await import('./provider');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const image = { bytes: new Uint8Array([0xff, 0xd8, 0xff]), mimeType: 'image/jpeg' as const };
const REPLY =
  '{"amount": 45000, "date": "2026-10-20", "vendor": "Pompes funèbres Mba", "gridKey": "coffin"}';
const READ = {
  amount: 45_000,
  date: '2026-10-20',
  vendor: 'Pompes funèbres Mba',
  gridKey: 'coffin',
};
const provider = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-28T10:00:00Z'));
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
  aiRepo.consumeAiQuota.mockResolvedValue({ data: true, error: null });
  provider.mockResolvedValue(REPLY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('parseReceiptReading', () => {
  it('lit le JSON, même entouré de texte ou d’une clôture de code', () => {
    expect(parseReceiptReading(REPLY)).toEqual(READ);
    expect(parseReceiptReading('Voici :\n```json\n' + REPLY + '\n```')).toEqual(READ);
  });

  it('met à null chaque champ invalide', () => {
    const read = (fields: Record<string, unknown>) =>
      parseReceiptReading(JSON.stringify({ ...READ, ...fields }));
    expect(read({ amount: -5 })?.amount).toBeNull();
    expect(read({ amount: 12.5 })?.amount).toBeNull();
    expect(read({ amount: '45000' })?.amount).toBeNull();
    expect(read({ amount: 100_000_001 })?.amount).toBeNull();
    expect(read({ date: '2026-02-30' })?.date).toBeNull();
    expect(read({ date: '1999-12-31' })?.date).toBeNull();
    expect(read({ date: '2026-11-30' })?.date).toBeNull();
    expect(read({ gridKey: 'flowers' })?.gridKey).toBeNull();
    expect(read({ vendor: '   ' })?.vendor).toBeNull();
    expect(read({ vendor: `A\u0000B  ${'x'.repeat(200)}` })?.vendor).toBe(`AB ${'x'.repeat(117)}`);
  });

  it('refuse un texte sans JSON, un tableau ou une lecture vide', () => {
    expect(parseReceiptReading('Total 45 000')).toBeNull();
    expect(parseReceiptReading('[1, 2]')).toBeNull();
    expect(parseReceiptReading('{"amount": null, "date": null}')).toBeNull();
  });
});

describe('readReceipt', () => {
  it('renvoie la lecture et ne transmet que l’image au fournisseur', async () => {
    expect(await readReceipt({ dossierId: DOSSIER, image }, provider)).toEqual({
      ok: true,
      data: READ,
    });
    expect(aiRepo.consumeAiQuota).toHaveBeenCalledWith(DOSSIER);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(provider).toHaveBeenCalledWith(image);
  });

  it('est indisponible sans clé, sans consommer le quota', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect(await readReceipt({ dossierId: DOSSIER, image }, provider)).toEqual({
      ok: false,
      error: 'unavailable',
    });
    expect(aiRepo.consumeAiQuota).not.toHaveBeenCalled();
  });

  it('s’arrête au quota atteint ou refusé, sans appeler le fournisseur', async () => {
    aiRepo.consumeAiQuota.mockResolvedValueOnce({ data: false, error: null });
    expect(await readReceipt({ dossierId: DOSSIER, image }, provider)).toEqual({
      ok: false,
      error: 'quota',
    });
    aiRepo.consumeAiQuota.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    expect(await readReceipt({ dossierId: DOSSIER, image }, provider)).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it('échoue sans journaliser la réponse quand le fournisseur échoue ou répond mal', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    provider.mockRejectedValueOnce(new AiProviderError('api'));
    expect(await readReceipt({ dossierId: DOSSIER, image }, provider)).toEqual({
      ok: false,
      error: 'failed',
    });
    provider.mockResolvedValueOnce('Total 45 000 chez Mba');
    expect(await readReceipt({ dossierId: DOSSIER, image }, provider)).toEqual({
      ok: false,
      error: 'failed',
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('Mba');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('45');
    spy.mockRestore();
  });
});
