import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestQuote: vi.fn(),
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock('./quote-service', () => ({ requestQuote: mocks.requestQuote }));
vi.mock('@/lib/supabase/server', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next-intl/server', () => ({ getLocale: async () => 'fr' }));

const { localizedPath } = await import('@/lib/auth/redirect-target');
const { requestQuoteAction } = await import('./quote-actions');

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const fields = { dossierId: DOSSIER, providerId: 'p', stepId: 'vigil-setup', message: 'Bonjour' };

beforeEach(() => vi.resetAllMocks());

describe('requestQuoteAction', () => {
  it('refuse un visiteur non connecté', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect(await requestQuoteAction(null, form(fields))).toEqual({ error: 'unauthenticated' });
    expect(mocks.requestQuote).not.toHaveBeenCalled();
  });

  it('renvoie le lien et revalide la synthèse de l’étape', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'u1' });
    mocks.requestQuote.mockResolvedValue({ ok: true, data: { href: 'https://wa.me/1?text=x' } });
    expect(await requestQuoteAction(null, form(fields))).toEqual({
      ok: true,
      href: 'https://wa.me/1?text=x',
    });
    expect(mocks.requestQuote).toHaveBeenCalledWith(fields);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      localizedPath(`/dossier/${DOSSIER}/etape/vigil-setup/synthese`, 'fr'),
    );
  });

  it('renvoie l’erreur du service', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'u1' });
    mocks.requestQuote.mockResolvedValue({ ok: false, error: 'unreachable' });
    expect(await requestQuoteAction(null, form(fields))).toEqual({ error: 'unreachable' });
  });
});
