import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, admin } = vi.hoisted(() => ({
  repo: {
    listProviders: vi.fn(),
    getProvider: vi.fn(),
    insertProvider: vi.fn(),
    updateProvider: vi.fn(),
  },
  admin: { isPlatformAdmin: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('@/lib/auth/platform-admin', () => admin);

const { createProvider, getProvider, listProviders, updateProvider } = await import('./service');

const PROVIDER = '66666666-6666-4666-8666-666666666666';
const NOW = '2026-10-28T12:00:00.000Z';
const OLD = '2026-10-01T09:00:00.000Z';
const input = {
  categoryKey: 'tentsChairs',
  name: 'Tentes Akanda',
  city: 'Libreville',
  district: '',
  whatsapp: '+241 77 12 34 56',
  priceNote: '',
  isExample: false,
  verified: true,
  active: true,
};
const stored = { id: PROVIDER, verifiedAt: OLD };
const fail = (code: string) => ({ data: null, error: { code, message: code } });

beforeEach(() => {
  for (const fn of Object.values(repo)) fn.mockReset();
  admin.isPlatformAdmin.mockResolvedValue(true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('contrôle administrateur', () => {
  it('refuse un non-administrateur sans toucher la base', async () => {
    admin.isPlatformAdmin.mockResolvedValue(false);
    expect(await listProviders({})).toEqual({ ok: false, error: 'forbidden' });
    expect(await createProvider(input)).toEqual({ ok: false, error: 'forbidden' });
    expect(await updateProvider({ ...input, providerId: PROVIDER })).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(await getProvider(PROVIDER)).toEqual({ ok: false, error: 'forbidden' });
    for (const fn of Object.values(repo)) expect(fn).not.toHaveBeenCalled();
  });
});

describe('createProvider', () => {
  it('crée un prestataire vérifié à la date du jour', async () => {
    repo.insertProvider.mockResolvedValue({ data: { id: PROVIDER }, error: null });
    expect(await createProvider(input)).toEqual({ ok: true, data: { id: PROVIDER } });
    expect(repo.insertProvider).toHaveBeenCalledWith(
      expect.objectContaining({ whatsapp: '+24177123456', verifiedAt: NOW, district: null }),
    );
  });

  it('renvoie les erreurs de champ sans écrire', async () => {
    expect(await createProvider({ ...input, whatsapp: 'abc' })).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { whatsapp: 'invalid phone' },
    });
    expect(repo.insertProvider).not.toHaveBeenCalled();
  });

  it('traduit un refus de la base', async () => {
    repo.insertProvider.mockResolvedValue(fail('42501'));
    expect(await createProvider(input)).toEqual({ ok: false, error: 'forbidden' });
  });

  it('journalise seulement le code d’une erreur inconnue', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.insertProvider.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'detail sensible' },
    });
    expect(await createProvider(input)).toEqual({ ok: false, error: 'unknown' });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('[providers] createProvider failed', { code: 'XX000' });
    log.mockRestore();
  });

  it('traite une catégorie absente en base (23503) comme une erreur inconnue journalisée', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.insertProvider.mockResolvedValue(fail('23503'));
    expect(await createProvider(input)).toEqual({ ok: false, error: 'unknown' });
    expect(log).toHaveBeenCalledWith('[providers] createProvider failed', { code: '23503' });
    log.mockRestore();
  });

  it.each([
    ['23514', 'validation'],
    ['22P02', 'validation'],
    ['28000', 'unauthenticated'],
    ['no_rows', 'not_found'],
  ])('traduit le code %s en %s', async (code, error) => {
    repo.insertProvider.mockResolvedValue(fail(code));
    expect(await createProvider(input)).toEqual({ ok: false, error });
  });
});

describe('updateProvider', () => {
  it('garde la date de vérification existante', async () => {
    repo.getProvider.mockResolvedValue({ data: stored, error: null });
    repo.updateProvider.mockResolvedValue({ data: true, error: null });
    expect(await updateProvider({ ...input, providerId: PROVIDER })).toEqual({
      ok: true,
      data: true,
    });
    expect(repo.updateProvider).toHaveBeenCalledWith(
      PROVIDER,
      expect.objectContaining({ verifiedAt: OLD }),
    );
  });

  it('date la vérification quand la case vient d’être cochée', async () => {
    repo.getProvider.mockResolvedValue({ data: { ...stored, verifiedAt: null }, error: null });
    repo.updateProvider.mockResolvedValue({ data: true, error: null });
    await updateProvider({ ...input, providerId: PROVIDER });
    expect(repo.updateProvider).toHaveBeenCalledWith(
      PROVIDER,
      expect.objectContaining({ verifiedAt: NOW }),
    );
  });

  it('efface la vérification quand la case est décochée', async () => {
    repo.getProvider.mockResolvedValue({ data: stored, error: null });
    repo.updateProvider.mockResolvedValue({ data: true, error: null });
    await updateProvider({ ...input, verified: false, providerId: PROVIDER });
    expect(repo.updateProvider).toHaveBeenCalledWith(
      PROVIDER,
      expect.objectContaining({ verifiedAt: null }),
    );
  });

  it('signale un prestataire introuvable', async () => {
    repo.getProvider.mockResolvedValue(fail('no_rows'));
    expect(await updateProvider({ ...input, providerId: PROVIDER })).toEqual({
      ok: false,
      error: 'not_found',
    });
    expect(repo.updateProvider).not.toHaveBeenCalled();
  });

  it('signale introuvable une ligne que la mise à jour ne touche pas', async () => {
    repo.getProvider.mockResolvedValue({ data: stored, error: null });
    repo.updateProvider.mockResolvedValue(fail('no_rows'));
    expect(await updateProvider({ ...input, providerId: PROVIDER })).toEqual({
      ok: false,
      error: 'not_found',
    });
  });

  it('refuse sans écrire quand la lecture est interdite', async () => {
    repo.getProvider.mockResolvedValue(fail('42501'));
    expect(await updateProvider({ ...input, providerId: PROVIDER })).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(repo.updateProvider).not.toHaveBeenCalled();
  });

  it('rejette un identifiant invalide sans toucher la base', async () => {
    expect(await updateProvider({ ...input, providerId: 'pas-un-uuid' })).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { providerId: 'Invalid uuid' },
    });
    expect(repo.getProvider).not.toHaveBeenCalled();
    expect(repo.updateProvider).not.toHaveBeenCalled();
  });
});

describe('lecture', () => {
  it('rend le prestataire lu', async () => {
    repo.getProvider.mockResolvedValue({ data: stored, error: null });
    expect(await getProvider(PROVIDER)).toEqual({ ok: true, data: stored });
    expect(repo.getProvider).toHaveBeenCalledWith(PROVIDER);
  });

  it('passe les filtres validés au dépôt', async () => {
    repo.listProviders.mockResolvedValue({ data: [], error: null });
    expect(await listProviders({ city: ' Libreville ', category: 'flowers' })).toEqual({
      ok: true,
      data: [],
    });
    expect(repo.listProviders).toHaveBeenCalledWith({ city: 'Libreville', category: undefined });
  });

  it('traite un identifiant invalide comme introuvable', async () => {
    expect(await getProvider('pas-un-uuid')).toEqual({ ok: false, error: 'not_found' });
    expect(repo.getProvider).not.toHaveBeenCalled();
  });
});
