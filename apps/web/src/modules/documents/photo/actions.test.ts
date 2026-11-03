import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, auth, cache } = vi.hoisted(() => ({
  service: { preparePhotoUpload: vi.fn(), setDossierPhoto: vi.fn() },
  auth: { getCurrentUser: vi.fn() },
  cache: { revalidatePath: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./service', () => service);
vi.mock('@/lib/supabase/server', () => auth);
vi.mock('next/cache', () => cache);

const { preparePhotoAction, setDossierPhotoAction } = await import('./actions');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const PHOTO = '99999999-9999-4999-8999-999999999999';
const prepare = { dossierId: DOSSIER, mimeType: 'image/jpeg', sizeBytes: 10 };

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: 'u1' });
  service.preparePhotoUpload.mockResolvedValue({ ok: true, data: { photoId: PHOTO } });
  service.setDossierPhoto.mockResolvedValue({ ok: true, data: true });
});

describe('actions de la photo', () => {
  it('refusent un visiteur non connecté sans appeler le service', async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    expect(await preparePhotoAction(prepare)).toEqual({ ok: false, error: 'unauthenticated' });
    expect(await setDossierPhotoAction({ dossierId: DOSSIER, photoId: PHOTO })).toEqual({
      ok: false,
      error: 'unauthenticated',
    });
    expect(service.preparePhotoUpload).not.toHaveBeenCalled();
    expect(service.setDossierPhoto).not.toHaveBeenCalled();
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it('transmettent un objet seul au service', async () => {
    await preparePhotoAction(prepare);
    expect(service.preparePhotoUpload).toHaveBeenCalledWith(prepare);
    await preparePhotoAction('x' as never);
    expect(service.preparePhotoUpload).toHaveBeenLastCalledWith({});
  });

  it('rafraîchissent la synthèse 3.5 dans chaque langue après la désignation', async () => {
    expect(await setDossierPhotoAction({ dossierId: DOSSIER, photoId: PHOTO })).toEqual({
      ok: true,
      data: true,
    });
    expect(service.setDossierPhoto).toHaveBeenCalledWith({ dossierId: DOSSIER, photoId: PHOTO });
    expect(cache.revalidatePath.mock.calls).toEqual([
      [`/fr/dossier/${DOSSIER}/etape/funeral-documents/synthese`],
      [`/en/dossier/${DOSSIER}/etape/funeral-documents/synthese`],
    ]);
  });

  it('ne rafraîchissent rien après un refus', async () => {
    service.setDossierPhoto.mockResolvedValueOnce({ ok: false, error: 'photo_missing' });
    expect(await setDossierPhotoAction({ dossierId: DOSSIER, photoId: PHOTO })).toEqual({
      ok: false,
      error: 'photo_missing',
    });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
});
