import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const quoteRepo = vi.hoisted(() => ({ insertQuoteRequest: vi.fn(), listQuoteRequests: vi.fn() }));
const providerRepo = vi.hoisted(() => ({ getProvider: vi.fn() }));
const dossierRepo = vi.hoisted(() => ({ listMembers: vi.fn() }));
vi.mock('./quotes/repo', async (orig) => ({ ...(await orig<object>()), ...quoteRepo }));
vi.mock('./repo', () => providerRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);

const { quotesForStep, requestQuote } = await import('./quote-service');

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const PROVIDER = '22222222-2222-4222-8222-222222222222';
const input = { dossierId: DOSSIER, providerId: PROVIDER, stepId: 'vigil-setup', message: 'Bonjour' };

beforeEach(() => vi.resetAllMocks());

describe('requestQuote', () => {
  it('trace la demande puis renvoie le lien wa.me', async () => {
    quoteRepo.insertQuoteRequest.mockResolvedValue({ data: { id: 'q1' }, error: null });
    providerRepo.getProvider.mockResolvedValue({
      data: { id: PROVIDER, whatsapp: '+24177123456' },
      error: null,
    });
    const withSpecials = { ...input, message: 'Bonjour & merci' };
    const res = await requestQuote(withSpecials);
    expect(res).toEqual({
      ok: true,
      data: { href: 'https://wa.me/24177123456?text=Bonjour%20%26%20merci' },
    });
    expect(quoteRepo.insertQuoteRequest).toHaveBeenCalledWith(withSpecials);
  });

  it.each([
    ['TL010', 'unreachable'],
    ['42501', 'forbidden'],
    ['23514', 'validation'],
    ['XX000', 'unknown'],
  ])('traduit %s en %s', async (code, error) => {
    quoteRepo.insertQuoteRequest.mockResolvedValue({ data: null, error: { code, message: '' } });
    expect(await requestQuote(input)).toEqual({ ok: false, error });
    expect(providerRepo.getProvider).not.toHaveBeenCalled();
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
    expect(quoteRepo.insertQuoteRequest).not.toHaveBeenCalled();
  });

  it('signale un prestataire devenu illisible après la trace', async () => {
    quoteRepo.insertQuoteRequest.mockResolvedValue({ data: { id: 'q1' }, error: null });
    providerRepo.getProvider.mockResolvedValue({
      data: null,
      error: { code: 'no_rows', message: '' },
    });
    expect(await requestQuote(input)).toEqual({ ok: false, error: 'unreachable' });
  });

  it('signale un prestataire relu sans numéro WhatsApp', async () => {
    quoteRepo.insertQuoteRequest.mockResolvedValue({ data: { id: 'q1' }, error: null });
    providerRepo.getProvider.mockResolvedValue({
      data: { id: PROVIDER, whatsapp: null },
      error: null,
    });
    expect(await requestQuote(input)).toEqual({ ok: false, error: 'unreachable' });
  });

  it('journalise une relecture en échec autre que no_rows', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    quoteRepo.insertQuoteRequest.mockResolvedValue({ data: { id: 'q1' }, error: null });
    providerRepo.getProvider.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: '' },
    });
    expect(await requestQuote(input)).toEqual({ ok: false, error: 'unreachable' });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
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
