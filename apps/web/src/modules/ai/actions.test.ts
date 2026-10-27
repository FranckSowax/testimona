import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  improveDraft: vi.fn(),
  getCurrentUser: vi.fn(),
  getLocale: vi.fn(),
}));

vi.mock('./service', () => ({ improveDraft: mocks.improveDraft }));
vi.mock('@/lib/supabase/server', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }));

const { improveDraftAction } = await import('./actions');

const INPUT = { dossierId: 'd', stepId: 's', text: 't' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: 'u' });
  mocks.getLocale.mockResolvedValue('fr');
  mocks.improveDraft.mockResolvedValue({ ok: true, text: 'x' });
});

describe('improveDraftAction', () => {
  it("refuse sans appeler le service quand personne n'est connecté", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(improveDraftAction(INPUT)).resolves.toEqual({
      ok: false,
      error: 'unauthenticated',
    });
    expect(mocks.improveDraft).not.toHaveBeenCalled();
  });

  it("transmet l'entrée avec la langue, sans second argument", async () => {
    await improveDraftAction(INPUT);
    expect(mocks.improveDraft).toHaveBeenCalledTimes(1);
    expect(mocks.improveDraft).toHaveBeenCalledWith({ ...INPUT, locale: 'fr' });
    expect(mocks.improveDraft.mock.calls[0]).toHaveLength(1);
  });

  it("n'envoie que la langue quand l'entrée n'est pas un objet", async () => {
    await improveDraftAction('nimporte quoi' as never);
    await improveDraftAction(null as never);
    expect(mocks.improveDraft).toHaveBeenNthCalledWith(1, { locale: 'fr' });
    expect(mocks.improveDraft).toHaveBeenNthCalledWith(2, { locale: 'fr' });
  });

  it('garde « en » et ramène toute autre langue à « fr »', async () => {
    mocks.getLocale.mockResolvedValue('en');
    await improveDraftAction(INPUT);
    mocks.getLocale.mockResolvedValue('de');
    await improveDraftAction(INPUT);
    expect(mocks.improveDraft).toHaveBeenNthCalledWith(1, { ...INPUT, locale: 'en' });
    expect(mocks.improveDraft).toHaveBeenNthCalledWith(2, { ...INPUT, locale: 'fr' });
  });
});
