import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, dossierRepo } = vi.hoisted(() => ({
  repo: {
    insertPhoto: vi.fn(),
    createPhotoUploadUrl: vi.fn(),
    setCurrentPhoto: vi.fn(),
    getCurrentPhoto: vi.fn(),
    downloadPhoto: vi.fn(),
    createPhotoReadUrl: vi.fn(),
  },
  dossierRepo: { getMyRole: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);

const { currentPhotoBytes, openCurrentPhoto, preparePhotoUpload, setDossierPhoto } =
  await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const PHOTO = '99999999-9999-4999-8999-999999999999';
const PATH = `${DOSSIER}/${PHOTO}.jpg`;
const photo = { id: PHOTO, dossierId: DOSSIER, path: PATH };
const prepare = { dossierId: DOSSIER, mimeType: 'image/jpeg', sizeBytes: 120_000 };
const ref = { dossierId: DOSSIER, photoId: PHOTO };
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const repoError = (code: string) => ({ data: null, error: { code, message: code } });

beforeEach(() => {
  vi.clearAllMocks();
  dossierRepo.getMyRole.mockResolvedValue('coordinator');
  repo.insertPhoto.mockResolvedValue({ data: photo, error: null });
  repo.createPhotoUploadUrl.mockResolvedValue({ data: { path: PATH, token: 'tok' }, error: null });
  repo.setCurrentPhoto.mockResolvedValue({ data: true, error: null });
  repo.getCurrentPhoto.mockResolvedValue({ data: photo, error: null });
  repo.downloadPhoto.mockResolvedValue({ data: JPEG, error: null });
  repo.createPhotoReadUrl.mockResolvedValue({ data: 'https://signed', error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('preparePhotoUpload', () => {
  it('prépare la photo et son envoi signé', async () => {
    expect(await preparePhotoUpload(prepare)).toEqual({
      ok: true,
      data: { photoId: PHOTO, path: PATH, token: 'tok' },
    });
    expect(dossierRepo.getMyRole).toHaveBeenCalledWith(DOSSIER);
    expect(repo.insertPhoto).toHaveBeenCalledWith(DOSSIER);
    expect(repo.createPhotoUploadUrl).toHaveBeenCalledWith(PATH);
  });

  it.each(['owner', 'coordinator'])('accepte le rôle %s', async (role) => {
    dossierRepo.getMyRole.mockResolvedValueOnce(role);
    expect((await preparePhotoUpload(prepare)).ok).toBe(true);
  });

  it.each(['treasurer', 'contributor', 'viewer', null])(
    'refuse le rôle %s sans écrire',
    async (role) => {
      dossierRepo.getMyRole.mockResolvedValueOnce(role);
      expect(await preparePhotoUpload(prepare)).toEqual({ ok: false, error: 'forbidden' });
      expect(repo.insertPhoto).not.toHaveBeenCalled();
    },
  );

  it('nomme un mauvais type ou une taille hors bornes, sans écrire', async () => {
    expect(await preparePhotoUpload({ ...prepare, mimeType: 'image/png' })).toEqual({
      ok: false,
      error: 'photo_type',
    });
    expect(await preparePhotoUpload({ ...prepare, sizeBytes: 6 * 1024 * 1024 })).toEqual({
      ok: false,
      error: 'photo_size',
    });
    expect(await preparePhotoUpload({ ...prepare, dossierId: 'x' })).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(await preparePhotoUpload(null)).toEqual({ ok: false, error: 'validation' });
    expect(repo.insertPhoto).not.toHaveBeenCalled();
  });

  it('traduit les codes de la base et du stockage', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.insertPhoto.mockResolvedValueOnce(repoError('42501'));
    expect(await preparePhotoUpload(prepare)).toEqual({ ok: false, error: 'forbidden' });
    repo.insertPhoto.mockResolvedValueOnce(repoError('PGRST301'));
    expect(await preparePhotoUpload(prepare)).toEqual({ ok: false, error: 'unauthenticated' });
    repo.createPhotoUploadUrl.mockResolvedValueOnce(repoError('storage'));
    expect(await preparePhotoUpload(prepare)).toEqual({ ok: false, error: 'unknown' });
    expect(spy).toHaveBeenCalledWith('[documents/photo] createPhotoUploadUrl failed', {
      code: 'storage',
    });
  });
});

describe('setDossierPhoto', () => {
  it('désigne la photo pour un coordinateur', async () => {
    expect(await setDossierPhoto(ref)).toEqual({ ok: true, data: true });
    expect(repo.setCurrentPhoto).toHaveBeenCalledWith(PHOTO);
  });

  it.each(['treasurer', 'contributor', 'viewer', null])(
    'refuse le rôle %s avant la RPC',
    async (role) => {
      dossierRepo.getMyRole.mockResolvedValueOnce(role);
      expect(await setDossierPhoto(ref)).toEqual({ ok: false, error: 'forbidden' });
      expect(repo.setCurrentPhoto).not.toHaveBeenCalled();
    },
  );

  it('refuse une entrée invalide', async () => {
    expect(await setDossierPhoto({ dossierId: DOSSIER, photoId: 'x' })).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(dossierRepo.getMyRole).not.toHaveBeenCalled();
  });

  it.each([
    ['42501', 'forbidden'],
    ['28000', 'unauthenticated'],
    ['PGRST301', 'unauthenticated'],
    ['TL006', 'photo_missing'],
    ['TL012', 'photo_already_used'],
  ])('traduit le code %s en %s', async (code, error) => {
    repo.setCurrentPhoto.mockResolvedValueOnce(repoError(code));
    expect(await setDossierPhoto(ref)).toEqual({ ok: false, error });
  });

  it('journalise un code inconnu', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.setCurrentPhoto.mockResolvedValueOnce(repoError('XX000'));
    expect(await setDossierPhoto(ref)).toEqual({ ok: false, error: 'unknown' });
    expect(spy).toHaveBeenCalledWith('[documents/photo] setCurrentPhoto failed', {
      code: 'XX000',
    });
  });
});

describe('openCurrentPhoto', () => {
  it('renvoie un lien signé de la photo courante', async () => {
    expect(await openCurrentPhoto(DOSSIER)).toEqual({ ok: true, data: 'https://signed' });
    expect(repo.createPhotoReadUrl).toHaveBeenCalledWith(PATH);
  });

  it('répond not_found sans photo, sans fichier ou pour un identifiant invalide', async () => {
    repo.getCurrentPhoto.mockResolvedValueOnce({ data: null, error: null });
    expect(await openCurrentPhoto(DOSSIER)).toEqual({ ok: false, error: 'not_found' });
    repo.createPhotoReadUrl.mockResolvedValueOnce(repoError('object_missing'));
    expect(await openCurrentPhoto(DOSSIER)).toEqual({ ok: false, error: 'not_found' });
    expect(await openCurrentPhoto('x')).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('currentPhotoBytes', () => {
  it('renvoie les octets JPEG de la photo courante', async () => {
    expect(await currentPhotoBytes(DOSSIER)).toEqual({ ok: true, data: JPEG });
    expect(repo.downloadPhoto).toHaveBeenCalledWith(PATH);
  });

  it('renvoie null sans photo', async () => {
    repo.getCurrentPhoto.mockResolvedValueOnce({ data: null, error: null });
    expect(await currentPhotoBytes(DOSSIER)).toEqual({ ok: true, data: null });
    expect(repo.downloadPhoto).not.toHaveBeenCalled();
    expect(await currentPhotoBytes('x')).toEqual({ ok: true, data: null });
  });

  it('ignore une signature autre que JPEG, avec une trace sans contenu', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    repo.downloadPhoto.mockResolvedValueOnce({ data: PNG, error: null });
    expect(await currentPhotoBytes(DOSSIER)).toEqual({ ok: true, data: null });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toEqual({ photoId: PHOTO, sizeBytes: PNG.length });
  });

  it('compte une lecture en échec comme « pas de photo » et la journalise', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.getCurrentPhoto.mockResolvedValueOnce(repoError('PGRST301'));
    expect(await currentPhotoBytes(DOSSIER)).toEqual({ ok: true, data: null });
    repo.downloadPhoto.mockResolvedValueOnce(repoError('storage'));
    expect(await currentPhotoBytes(DOSSIER)).toEqual({ ok: true, data: null });
    expect(spy.mock.calls.map((c) => c[1])).toEqual([{ code: 'PGRST301' }, { code: 'storage' }]);
  });
});
