import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  improveDraft: vi.fn(),
  generateDocumentTexts: vi.fn(),
  getCurrentUser: vi.fn(),
  getLocale: vi.fn(),
}));

vi.mock('./service', () => ({ improveDraft: mocks.improveDraft }));
vi.mock('./documents', () => ({ generateDocumentTexts: mocks.generateDocumentTexts }));
vi.mock('@/lib/supabase/server', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }));

const { improveDraftAction, generateDocumentTextsAction } = await import('./actions');

const INPUT = { dossierId: 'd', stepId: 's', text: 't' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: 'u' });
  mocks.getLocale.mockResolvedValue('fr');
  mocks.improveDraft.mockResolvedValue({ ok: true, text: 'x' });
  mocks.generateDocumentTexts.mockResolvedValue({
    ok: true,
    texts: { cover: 'c', tribute: 't', thanks: 'm' },
  });
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

describe('generateDocumentTextsAction', () => {
  it("refuse sans appeler le service quand personne n'est connecté", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(generateDocumentTextsAction({ dossierId: 'd' })).resolves.toEqual({
      ok: false,
      error: 'unauthenticated',
    });
    expect(mocks.generateDocumentTexts).not.toHaveBeenCalled();
  });

  it('transmet le dossier avec la langue lue côté serveur, sans second argument', async () => {
    await expect(generateDocumentTextsAction({ dossierId: 'd' })).resolves.toEqual({
      ok: true,
      texts: { cover: 'c', tribute: 't', thanks: 'm' },
    });
    expect(mocks.generateDocumentTexts).toHaveBeenCalledWith({ dossierId: 'd', locale: 'fr' });
    expect(mocks.generateDocumentTexts.mock.calls[0]).toHaveLength(1);
  });

  it('ignore une langue envoyée par le client et une entrée qui n’est pas un objet', async () => {
    mocks.getLocale.mockResolvedValue('en');
    await generateDocumentTextsAction({ dossierId: 'd', locale: 'fr' } as never);
    await generateDocumentTextsAction(null as never);
    expect(mocks.generateDocumentTexts).toHaveBeenNthCalledWith(1, {
      dossierId: 'd',
      locale: 'en',
    });
    expect(mocks.generateDocumentTexts).toHaveBeenNthCalledWith(2, { locale: 'en' });
  });
});
