// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { PHOTO_MAX_BYTES } from '../schema';
import { PhotoCapture } from './PhotoCapture';

const { prepare, setPhoto, upload, from, shrink } = vi.hoisted(() => {
  const upload = vi.fn();
  return {
    prepare: vi.fn(),
    setPhoto: vi.fn(),
    upload,
    from: vi.fn(() => ({ uploadToSignedUrl: upload })),
    // WHY: par défaut, un réencodage réussi : un nouveau fichier JPEG, distinct de l'original.
    shrink: vi.fn(async (file: File) => new File([file], 'p.jpg', { type: 'image/jpeg' })),
  };
});
vi.mock('../actions', () => ({ preparePhotoAction: prepare, setDossierPhotoAction: setPhoto }));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseBrowser: () => ({ storage: { from } }) }));
// WHY: la réduction a ses propres tests ; jsdom n'a pas de vrai canvas.
vi.mock('@/modules/budget/receipts/ui/shrinkImage', () => ({ shrinkImage: shrink }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const PHOTO = '99999999-9999-4999-8999-999999999999';
const PATH = `${DOSSIER}/${PHOTO}.jpg`;
const text = messages.documents.photo;

function renderCapture(canEdit = true) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <PhotoCapture dossierId={DOSSIER} canEdit={canEdit} retryDelayMs={1} />
    </NextIntlClientProvider>,
  );
}

const input = () => screen.getByLabelText(text.label) as HTMLInputElement;
const choose = (file: File) => fireEvent.change(input(), { target: { files: [file] } });
const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], 'p.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  prepare.mockResolvedValue({ ok: true, data: { photoId: PHOTO, path: PATH, token: 'tok' } });
  upload.mockResolvedValue({ data: { path: PATH }, error: null });
  setPhoto.mockResolvedValue({ ok: true, data: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PhotoCapture', () => {
  it('réencode, envoie puis désigne la photo', async () => {
    renderCapture();
    expect(input().getAttribute('accept')).toBe('image/*');
    expect(screen.getByText(text.hint)).toBeTruthy();
    const heic = new File([new Uint8Array(20)], 'p.heic', { type: 'image/heic' });
    const reencoded = jpeg();
    shrink.mockResolvedValueOnce(reencoded);
    choose(heic);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(text.saved));
    expect(shrink).toHaveBeenCalledWith(heic);
    expect(prepare).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      mimeType: 'image/jpeg',
      sizeBytes: 3,
    });
    expect(from).toHaveBeenCalledWith('dossier-photos');
    expect(upload).toHaveBeenCalledWith(PATH, 'tok', reencoded, { contentType: 'image/jpeg' });
    expect(setPhoto).toHaveBeenCalledWith({ dossierId: DOSSIER, photoId: PHOTO });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refuse une photo qui n’a pas pu être réencodée en JPEG, sans rien envoyer', async () => {
    shrink.mockImplementationOnce(async (file: File) => file);
    renderCapture();
    choose(new File([new Uint8Array(20)], 'p.png', { type: 'image/png' }));
    expect((await screen.findByRole('alert')).textContent).toBe(text.errors.unreadable);
    expect(prepare).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuse un JPEG original non réencodé, qui garderait ses métadonnées', async () => {
    shrink.mockImplementationOnce(async (file: File) => file);
    renderCapture();
    choose(jpeg());
    expect((await screen.findByRole('alert')).textContent).toBe(text.errors.unreadable);
    expect(prepare).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuse une photo trop lourde sans rien envoyer', async () => {
    renderCapture();
    const big = jpeg();
    Object.defineProperty(big, 'size', { value: PHOTO_MAX_BYTES + 1 });
    shrink.mockResolvedValueOnce(big);
    choose(jpeg());
    expect((await screen.findByRole('alert')).textContent).toBe(text.errors.photo_size);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('retente une seule fois quand le fichier n’est pas encore arrivé', async () => {
    setPhoto.mockResolvedValueOnce({ ok: false, error: 'photo_missing' });
    renderCapture();
    choose(jpeg());
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(text.saved));
    expect(setPhoto).toHaveBeenCalledTimes(2);
  });

  it('affiche un message après une seconde absence du fichier', async () => {
    setPhoto.mockResolvedValue({ ok: false, error: 'photo_missing' });
    renderCapture();
    choose(jpeg());
    expect((await screen.findByRole('alert')).textContent).toBe(text.errors.photo_missing);
    expect(setPhoto).toHaveBeenCalledTimes(2);
  });

  it('ne retente pas une photo déjà utilisée', async () => {
    setPhoto.mockResolvedValueOnce({ ok: false, error: 'photo_already_used' });
    renderCapture();
    choose(jpeg());
    expect((await screen.findByRole('alert')).textContent).toBe(text.errors.photo_already_used);
    expect(setPhoto).toHaveBeenCalledTimes(1);
  });

  it('signale un envoi au stockage en échec, sans désigner la photo', async () => {
    upload.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    renderCapture();
    choose(jpeg());
    expect((await screen.findByRole('alert')).textContent).toBe(text.errors.upload_failed);
    expect(setPhoto).not.toHaveBeenCalled();
  });

  it('affiche le refus du serveur', async () => {
    prepare.mockResolvedValueOnce({ ok: false, error: 'forbidden' });
    renderCapture();
    choose(jpeg());
    expect((await screen.findByRole('alert')).textContent).toBe(messages.dossier.errors.forbidden);
    expect(upload).not.toHaveBeenCalled();
  });

  it('n’affiche aucun bouton à un membre sans droit de modifier', () => {
    renderCapture(false);
    expect(screen.queryByLabelText(text.label)).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});
