import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, auth } = vi.hoisted(() => ({
  service: { openCurrentPhoto: vi.fn() },
  auth: { getCurrentUser: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./service', () => service);
vi.mock('@/lib/supabase/server', () => auth);

const { photoRedirect } = await import('./http');

const DOSSIER = '44444444-4444-4444-8444-444444444444';

function expectSafeHeaders(res: Response) {
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: 'u1' });
  service.openCurrentPhoto.mockResolvedValue({ ok: true, data: 'https://signed.example/p' });
});

describe('photoRedirect', () => {
  it('redirige vers le lien signé', async () => {
    const res = await photoRedirect(DOSSIER);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('https://signed.example/p');
    expectSafeHeaders(res);
    expect(service.openCurrentPhoto).toHaveBeenCalledWith(DOSSIER);
  });

  it('exige une session', async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);
    const res = await photoRedirect(DOSSIER);
    expect(res.status).toBe(401);
    expectSafeHeaders(res);
    expect(service.openCurrentPhoto).not.toHaveBeenCalled();
  });

  it.each([
    ['not_found', 404],
    ['forbidden', 404],
    ['unauthenticated', 401],
    ['unknown', 502],
  ])('répond à %s par %i, sans rien révéler', async (error, status) => {
    service.openCurrentPhoto.mockResolvedValueOnce({ ok: false, error });
    const res = await photoRedirect(DOSSIER);
    expect(res.status).toBe(status);
    expect(res.headers.get('Location')).toBeNull();
    expectSafeHeaders(res);
  });
});
