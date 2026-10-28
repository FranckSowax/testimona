import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aiRepo } = vi.hoisted(() => ({ aiRepo: { consumeAiQuota: vi.fn() } }));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => aiRepo);

const { takeAiQuota } = await import('./quota');

const DOSSIER = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('takeAiQuota', () => {
  it('laisse passer un appel permis', async () => {
    aiRepo.consumeAiQuota.mockResolvedValueOnce({ data: true, error: null });
    expect(await takeAiQuota(DOSSIER)).toBeNull();
    expect(aiRepo.consumeAiQuota).toHaveBeenCalledWith(DOSSIER);
  });

  it('signale le plafond du jour atteint', async () => {
    aiRepo.consumeAiQuota.mockResolvedValueOnce({ data: false, error: null });
    expect(await takeAiQuota(DOSSIER)).toBe('quota');
  });

  it('traduit les refus et journalise un code inconnu', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fail = (code: string) =>
      aiRepo.consumeAiQuota.mockResolvedValueOnce({ data: null, error: { code, message: 'x' } });
    fail('42501');
    expect(await takeAiQuota(DOSSIER)).toBe('forbidden');
    fail('28000');
    expect(await takeAiQuota(DOSSIER)).toBe('unauthenticated');
    fail('PGRST301');
    expect(await takeAiQuota(DOSSIER)).toBe('unauthenticated');
    expect(spy).not.toHaveBeenCalled();
    fail('XX000');
    expect(await takeAiQuota(DOSSIER)).toBe('failed');
    expect(spy).toHaveBeenCalledWith('[ai] consumeAiQuota failed', { code: 'XX000' });
    spy.mockRestore();
  });
});
