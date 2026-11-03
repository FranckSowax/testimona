import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveDocumentText: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('./texts-service', () => ({ saveDocumentText: mocks.saveDocumentText }));
vi.mock('@/lib/supabase/server', () => ({ getCurrentUser: mocks.getCurrentUser }));

const { saveDocumentTextAction } = await import('./actions');

const INPUT = { dossierId: 'd', kind: 'cover' as const, text: 't' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: 'u' });
  mocks.saveDocumentText.mockResolvedValue({ ok: true, data: { key: 'k' } });
});

describe('saveDocumentTextAction', () => {
  it("refuse sans appeler le service quand personne n'est connecté", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(saveDocumentTextAction(INPUT)).resolves.toEqual({
      ok: false,
      error: 'unauthenticated',
    });
    expect(mocks.saveDocumentText).not.toHaveBeenCalled();
  });

  it("transmet l'entrée au service, sans second argument", async () => {
    await expect(saveDocumentTextAction(INPUT)).resolves.toEqual({ ok: true, data: { key: 'k' } });
    expect(mocks.saveDocumentText).toHaveBeenCalledWith(INPUT);
    expect(mocks.saveDocumentText.mock.calls[0]).toHaveLength(1);
  });

  it("transmet un objet vide quand l'entrée n'est pas un objet", async () => {
    await saveDocumentTextAction(null as never);
    await saveDocumentTextAction('nimporte quoi' as never);
    expect(mocks.saveDocumentText).toHaveBeenNthCalledWith(1, {});
    expect(mocks.saveDocumentText).toHaveBeenNthCalledWith(2, {});
  });
});
