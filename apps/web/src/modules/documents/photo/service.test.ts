import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, dossierRepo } = vi.hoisted(() => ({
  repo: {
    insertPhoto: vi.fn(),
    createPhotoUploadUrl: vi.fn(),
    setCurrentPhoto: vi.fn(),
    getCurrentPhoto: vi.fn(),
    getPhotoDossierId: vi.fn(),
    downloadPhoto: vi.fn(),
    createPhotoReadUrl: vi.fn(),
  },
  dossierRepo: { getMyRole: vi.fn(), getDossier: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { currentPhotoBytes, openCurrentPhoto, preparePhotoUpload, setDossierPhoto } =
  await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const PHOTO = '99999999-9999-4999-8999-999999999999';
const PATH = `${DOSSIER}/${PHOTO}.jpg`;
const photo = { id: PHOTO, dossierId: DOSSIER, path: PATH };
const prepare = { dossierId: DOSSIER, mimeType: 'image/jpeg', sizeBytes: 120_000 };
const ref = { dossierId: DOSSIER, photoId: PHOTO };
// WHY: JPEG minimal lisible : SOI, APP0 (4 octets), puis SOS et données d'image.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 1, 2, 0xff, 0xda, 0, 2, 9, 0xff, 0xd9]);
const EXIF_SEGMENT = [0xff, 0xe1, 0, 6, 0x45, 0x78, 0x69, 0x66];
const JPEG_WITH_EXIF = new Uint8Array([
  ...JPEG.subarray(0, 2),
  ...EXIF_SEGMENT,
  ...JPEG.subarray(2),
]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const dossier = (entryPoint: 'death' | 'prepare' | 'after') => ({
  id: DOSSIER,
  title: 'Jean Ndong',
  city: 'Libreville',
  countryCode: 'GA',
  entryPoint,
  createdAt: '2026-10-27T00:00:00Z',
});
const repoError = (code: string) => ({ data: null, error: { code, message: code } });

beforeEach(() => {
  vi.clearAllMocks();
  dossierRepo.getMyRole.mockResolvedValue('coordinator');
  dossierRepo.getDossier.mockResolvedValue(dossier('death'));
  repo.insertPhoto.mockResolvedValue({ data: photo, error: null });
  repo.createPhotoUploadUrl.mockResolvedValue({ data: { path: PATH, token: 'tok' }, error: null });
  repo.setCurrentPhoto.mockResolvedValue({ data: true, error: null });
  repo.getPhotoDossierId.mockResolvedValue({ data: DOSSIER, error: null });
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

describe('photo liée à son dossier', () => {
  const OTHER = '55555555-5555-4555-8555-555555555555';

  it('vérifie le dossier de la photo avant la RPC', async () => {
    expect(await setDossierPhoto(ref)).toEqual({ ok: true, data: true });
    expect(repo.getPhotoDossierId).toHaveBeenCalledWith(PHOTO);
  });

  it('refuse une photo d’un autre dossier sans appeler la RPC', async () => {
    repo.getPhotoDossierId.mockResolvedValueOnce({ data: OTHER, error: null });
    expect(await setDossierPhoto(ref)).toEqual({ ok: false, error: 'forbidden' });
    expect(repo.setCurrentPhoto).not.toHaveBeenCalled();
  });

  it('refuse une photo invisible comme un identifiant inconnu', async () => {
    repo.getPhotoDossierId.mockResolvedValueOnce({ data: null, error: null });
    expect(await setDossierPhoto(ref)).toEqual({ ok: false, error: 'forbidden' });
    expect(repo.setCurrentPhoto).not.toHaveBeenCalled();
  });

  it('traduit une lecture en échec', async () => {
    repo.getPhotoDossierId.mockResolvedValueOnce(repoError('PGRST301'));
    expect(await setDossierPhoto(ref)).toEqual({ ok: false, error: 'unauthenticated' });
    expect(repo.setCurrentPhoto).not.toHaveBeenCalled();
  });

  it('ne lit pas la photo quand la porte refuse', async () => {
    dossierRepo.getMyRole.mockResolvedValueOnce('viewer');
    expect(await setDossierPhoto(ref)).toEqual({ ok: false, error: 'forbidden' });
    expect(repo.getPhotoDossierId).not.toHaveBeenCalled();
  });
});

describe('porte de l’étape 3.5', () => {
  const writes = [
    ['preparePhotoUpload', () => preparePhotoUpload(prepare)],
    ['setDossierPhoto', () => setDossierPhoto(ref)],
  ] as const;

  it.each(writes)('%s renvoie « not_found » pour un dossier inaccessible', async (_name, run) => {
    dossierRepo.getDossier.mockResolvedValueOnce(null);
    expect(await run()).toEqual({ ok: false, error: 'not_found' });
    expect(dossierRepo.getMyRole).not.toHaveBeenCalled();
    expect(repo.insertPhoto).not.toHaveBeenCalled();
    expect(repo.setCurrentPhoto).not.toHaveBeenCalled();
  });

  it.each(writes)('%s refuse un dossier où l’étape 3.5 est fermée', async (_name, run) => {
    for (const entryPoint of ['prepare', 'after'] as const) {
      dossierRepo.getDossier.mockResolvedValueOnce(dossier(entryPoint));
      expect(await run()).toEqual({ ok: false, error: 'validation' });
    }
    expect(repo.insertPhoto).not.toHaveBeenCalled();
    expect(repo.setCurrentPhoto).not.toHaveBeenCalled();
  });

  it('ne filtre pas la lecture de la photo', async () => {
    dossierRepo.getDossier.mockResolvedValue(dossier('after'));
    expect(await openCurrentPhoto(DOSSIER)).toEqual({ ok: true, data: 'https://signed' });
    expect(await currentPhotoBytes(DOSSIER)).toEqual({ ok: true, data: JPEG });
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
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

  it('retire les métadonnées EXIF avant de rendre les octets', async () => {
    repo.downloadPhoto.mockResolvedValueOnce({ data: JPEG_WITH_EXIF, error: null });
    expect(await currentPhotoBytes(DOSSIER)).toEqual({ ok: true, data: JPEG });
  });

  it('écarte un JPEG illisible, avec une trace sans contenu', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const truncated = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 40, 1]);
    repo.downloadPhoto.mockResolvedValueOnce({ data: truncated, error: null });
    expect(await currentPhotoBytes(DOSSIER)).toEqual({ ok: true, data: null });
    expect(spy.mock.calls[0]?.[1]).toEqual({ photoId: PHOTO, sizeBytes: truncated.length });
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
