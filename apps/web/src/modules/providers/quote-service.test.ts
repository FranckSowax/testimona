import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const quoteRepo = vi.hoisted(() => ({ requestQuoteRpc: vi.fn(), listQuoteRequests: vi.fn() }));
const dossierRepo = vi.hoisted(() => ({ listMembers: vi.fn() }));
vi.mock('./quotes/repo', async (orig) => ({ ...(await orig<object>()), ...quoteRepo }));
vi.mock('@/modules/dossier/repo', () => dossierRepo);

const { quotesForStep, requestQuote } = await import('./quote-service');

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const PROVIDER = '22222222-2222-4222-8222-222222222222';
const input = {
  dossierId: DOSSIER,
  providerId: PROVIDER,
  stepId: 'vigil-setup',
  message: 'Bonjour',
};

beforeEach(() => vi.resetAllMocks());

describe('requestQuote', () => {
  it('trace la demande par la RPC puis renvoie le lien wa.me', async () => {
    quoteRepo.requestQuoteRpc.mockResolvedValue({
      data: { whatsapp: '+24177123456' },
      error: null,
    });
    const withSpecials = { ...input, message: 'Bonjour & merci' };
    const res = await requestQuote(withSpecials);
    expect(res).toEqual({
      ok: true,
      data: { href: 'https://wa.me/24177123456?text=Bonjour%20%26%20merci' },
    });
    expect(quoteRepo.requestQuoteRpc).toHaveBeenCalledWith(withSpecials);
  });

  it.each([
    ['TL010', 'unreachable'],
    ['42501', 'forbidden'],
    ['28000', 'unauthenticated'],
    ['23514', 'validation'],
    ['XX000', 'unknown'],
  ])('traduit %s en %s', async (code, error) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    quoteRepo.requestQuoteRpc.mockResolvedValue({ data: null, error: { code, message: '' } });
    expect(await requestQuote(input)).toEqual({ ok: false, error });
    spy.mockRestore();
  });

  it('journalise un code inconnu, comme une réponse sans numéro', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    quoteRepo.requestQuoteRpc.mockResolvedValue({
      data: null,
      error: { code: 'no_number', message: '' },
    });
    expect(await requestQuote(input)).toEqual({ ok: false, error: 'unknown' });
    expect(spy).toHaveBeenCalledWith('[providers] requestQuote failed', { code: 'no_number' });
    spy.mockRestore();
  });

  it('refuse un message vide ou trop long, une étape inconnue ou un identifiant invalide', async () => {
    for (const bad of [
      { ...input, message: '   ' },
      { ...input, message: 'x'.repeat(2001) },
      { ...input, stepId: 'burial' },
      { ...input, providerId: 'nope' },
    ]) {
      expect(await requestQuote(bad)).toEqual({ ok: false, error: 'validation' });
    }
    expect(quoteRepo.requestQuoteRpc).not.toHaveBeenCalled();
  });
});

describe('quotesForStep', () => {
  it('ajoute le nom affiché de l’auteur', async () => {
    quoteRepo.listQuoteRequests.mockResolvedValue({
      data: [
        { id: 'q1', providerName: 'Tentes Owendo', createdBy: 'u1', createdAt: '2026-10-29' },
        { id: 'q2', providerName: 'Sono', createdBy: null, createdAt: '2026-10-28' },
      ],
      error: null,
    });
    dossierRepo.listMembers.mockResolvedValue([
      { userId: 'u1', role: 'coordinator', displayName: 'Awa' },
    ]);
    const res = await quotesForStep(DOSSIER, 'vigil-setup');
    expect(res).toEqual({
      ok: true,
      data: [
        { id: 'q1', providerName: 'Tentes Owendo', author: 'Awa', createdAt: '2026-10-29' },
        { id: 'q2', providerName: 'Sono', author: null, createdAt: '2026-10-28' },
      ],
    });
  });

  it('ne lit pas les membres sans demande', async () => {
    quoteRepo.listQuoteRequests.mockResolvedValue({ data: [], error: null });
    expect(await quotesForStep(DOSSIER, 'vigil-setup')).toEqual({ ok: true, data: [] });
    expect(dossierRepo.listMembers).not.toHaveBeenCalled();
  });
});
