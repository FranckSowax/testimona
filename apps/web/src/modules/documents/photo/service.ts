import 'server-only';
import { z } from 'zod';
import { isStepOpen } from '@/journey/registry';
import { DOCUMENTS_STEP_ID } from '@/journey/steps/3-5-funeral-documents';
import { getDossier, getMyRole } from '@/modules/dossier/repo';
import { hasRole } from '@/modules/dossier/roles';
import * as repo from './repo';
import { isJpeg, PhotoRefSchema, PreparePhotoSchema } from './schema';
import { stripJpegMetadata } from './stripJpegMetadata';

export type PhotoError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'photo_type'
  | 'photo_size'
  | 'photo_missing'
  | 'photo_already_used'
  | 'unknown';

export type PhotoResult<T> = { ok: true; data: T } | { ok: false; error: PhotoError };

/** Envoi préparé : le navigateur envoie la photo au stockage avec ce chemin et ce jeton. */
export interface PreparedPhotoUpload {
  photoId: string;
  path: string;
  token: string;
}

const CODES: Record<string, PhotoError> = {
  // WHY: rôle insuffisant ET identifiant de photo inconnu (la RPC ne révèle rien).
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  // WHY: JWT expiré signalé par PostgREST.
  PGRST301: 'unauthenticated',
  '23514': 'validation',
  '22P02': 'validation',
  // WHY: fichier pas encore au stockage ; retentable (comme les reçus).
  TL006: 'photo_missing',
  // WHY: photo déjà activée ou archivée ; définitif.
  TL012: 'photo_already_used',
  // WHY: photo courante dont le fichier manque au stockage (lecture du lien signé).
  object_missing: 'not_found',
};

const DossierIdSchema = z.string().uuid();

function fromRepo(error: { code: string }, scope: string): { ok: false; error: PhotoError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[documents/photo] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

/**
 * Porte des écritures : dossier visible, étape 3.5 ouverte pour son point d'entrée (même règle
 * que `saveDocumentText`), puis coordinateur et plus.
 * WHY: refuser tôt évite une ligne ou un appel inutile et donne un message clair ; la RLS et la
 * RPC restent la règle de référence. La lecture (documents, vignette) n'est pas filtrée ici.
 */
async function writeGate(dossierId: string): Promise<PhotoError | null> {
  const dossier = await getDossier(dossierId);
  if (!dossier) return 'not_found';
  if (!isStepOpen(dossier.entryPoint, DOCUMENTS_STEP_ID)) return 'validation';
  return hasRole(await getMyRole(dossierId), 'coordinator') ? null : 'forbidden';
}

/**
 * Prépare l'envoi de la photo du défunt : ligne `dossier_photo` et lien d'envoi signé.
 *
 * @example
 * await preparePhotoUpload({ dossierId, mimeType: 'image/jpeg', sizeBytes: 412_000 });
 */
export async function preparePhotoUpload(raw: unknown): Promise<PhotoResult<PreparedPhotoUpload>> {
  const input = PreparePhotoSchema.safeParse(raw);
  if (!input.success) {
    const field = input.error.issues[0]?.path[0];
    const error =
      field === 'mimeType' ? 'photo_type' : field === 'sizeBytes' ? 'photo_size' : 'validation';
    return { ok: false, error };
  }
  const { dossierId } = input.data;
  const blocked = await writeGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const photo = await repo.insertPhoto(dossierId);
  if (photo.error) return fromRepo(photo.error, 'insertPhoto');
  const upload = await repo.createPhotoUploadUrl(photo.data.path);
  if (upload.error) return fromRepo(upload.error, 'createPhotoUploadUrl');
  return {
    ok: true,
    data: { photoId: photo.data.id, path: upload.data.path, token: upload.data.token },
  };
}

/**
 * Désigne une photo envoyée comme photo courante du dossier ; la précédente est archivée.
 * `photo_missing` : le fichier n'est pas encore au stockage (retentable).
 *
 * @example
 * await setDossierPhoto({ dossierId, photoId });
 */
export async function setDossierPhoto(raw: unknown): Promise<PhotoResult<true>> {
  const input = PhotoRefSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, photoId } = input.data;
  const blocked = await writeGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  // WHY: la RPC agit sur le dossier de la photo, pas sur celui annoncé par le navigateur. Sans ce
  // contrôle, un coordinateur de deux dossiers contournerait la porte de l'étape 3.5 de l'un en
  // annonçant l'autre (et la mauvaise page serait rafraîchie). Une photo invisible ou d'un autre
  // dossier reçoit `forbidden`, comme un identifiant inconnu pour la RPC.
  const owner = await repo.getPhotoDossierId(photoId);
  if (owner.error) return fromRepo(owner.error, 'getPhotoDossierId');
  if (owner.data !== dossierId) return { ok: false, error: 'forbidden' };
  const res = await repo.setCurrentPhoto(photoId);
  if (res.error) return fromRepo(res.error, 'setCurrentPhoto');
  return { ok: true, data: true };
}

/**
 * Lien de lecture signé (5 minutes) de la photo courante, pour la vignette de la synthèse.
 * WHY: identifiant invalide, dossier invisible, absence de photo et fichier manquant donnent
 * tous `not_found` : rien n'est révélé.
 *
 * @example
 * const res = await openCurrentPhoto(dossierId);
 */
export async function openCurrentPhoto(dossierId: string): Promise<PhotoResult<string>> {
  if (!DossierIdSchema.safeParse(dossierId).success) return { ok: false, error: 'not_found' };
  const photo = await repo.getCurrentPhoto(dossierId);
  if (photo.error) return fromRepo(photo.error, 'getCurrentPhoto');
  if (!photo.data) return { ok: false, error: 'not_found' };
  const url = await repo.createPhotoReadUrl(photo.data.path);
  if (url.error) return fromRepo(url.error, 'createPhotoReadUrl');
  return { ok: true, data: url.data };
}

/**
 * Octets JPEG de la photo courante, pour le livret et l'affiche ; null sans photo.
 * WHY: un document sans photo vaut mieux qu'un échec : une lecture en erreur ou une signature
 * autre que JPEG sont journalisées (sans contenu) et comptent comme « pas de photo ».
 *
 * @example
 * const { data: photo } = await currentPhotoBytes(dossierId);
 */
export async function currentPhotoBytes(
  dossierId: string,
): Promise<{ ok: true; data: Uint8Array | null }> {
  if (!DossierIdSchema.safeParse(dossierId).success) return { ok: true, data: null };
  const photo = await repo.getCurrentPhoto(dossierId);
  if (photo.error) {
    console.error('[documents/photo] currentPhotoBytes read failed', { code: photo.error.code });
    return { ok: true, data: null };
  }
  if (!photo.data) return { ok: true, data: null };
  const file = await repo.downloadPhoto(photo.data.path);
  if (file.error) {
    console.error('[documents/photo] currentPhotoBytes download failed', {
      code: file.error.code,
    });
    return { ok: true, data: null };
  }
  if (!isJpeg(file.data)) {
    console.warn('[documents/photo] currentPhotoBytes ignored a non-JPEG file', {
      photoId: photo.data.id,
      sizeBytes: file.data.length,
    });
    return { ok: true, data: null };
  }
  // WHY: un JPEG envoyé hors de l'interface n'a pas été réencodé ; on retire ses métadonnées
  // (EXIF, GPS, IPTC) avant qu'il n'entre dans des documents largement partagés. Un JPEG
  // illisible est écarté : un document sans photo vaut mieux qu'une fuite de métadonnées.
  const stripped = stripJpegMetadata(file.data);
  if (!stripped.ok) {
    console.warn('[documents/photo] currentPhotoBytes ignored an unreadable JPEG', {
      photoId: photo.data.id,
      sizeBytes: file.data.length,
    });
    return { ok: true, data: null };
  }
  return { ok: true, data: stripped.bytes };
}
