import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveDocumentText: vi.fn(),
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('./texts-service', () => ({ saveDocumentText: mocks.saveDocumentText }));
vi.mock('@/lib/supabase/server', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

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
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("transmet l'entrée au service, sans second argument", async () => {
    await expect(saveDocumentTextAction(INPUT)).resolves.toEqual({ ok: true, data: { key: 'k' } });
    expect(mocks.saveDocumentText).toHaveBeenCalledWith(INPUT);
    expect(mocks.saveDocumentText.mock.calls[0]).toHaveLength(1);
  });

  it('rafraîchit la synthèse de l’étape 3.5 dans chaque langue après un enregistrement', async () => {
    await saveDocumentTextAction(INPUT);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      '/fr/dossier/d/etape/funeral-documents/synthese',
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      '/en/dossier/d/etape/funeral-documents/synthese',
    );
  });

  it('ne rafraîchit rien quand le service refuse', async () => {
    mocks.saveDocumentText.mockResolvedValue({ ok: false, error: 'validation' });
    await saveDocumentTextAction(INPUT);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("transmet un objet vide quand l'entrée n'est pas un objet", async () => {
    await saveDocumentTextAction(null as never);
    await saveDocumentTextAction('nimporte quoi' as never);
    expect(mocks.saveDocumentText).toHaveBeenNthCalledWith(1, {});
    expect(mocks.saveDocumentText).toHaveBeenNthCalledWith(2, {});
  });
});
