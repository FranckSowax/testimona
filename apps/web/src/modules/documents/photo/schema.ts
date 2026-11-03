import { z } from 'zod';
import { sniffImageType } from '@/modules/budget/receipts/schema';

/** Bucket privé des photos du dossier (livret et affiche). */
export const PHOTO_BUCKET = 'dossier-photos';

/** Seul type accepté : le navigateur recadre et réencode la photo en JPEG avant l'envoi. */
export const PHOTO_TYPE = 'image/jpeg';

/** Taille maximale d'une photo : 5 Mo (même borne que le bucket). */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const uuid = z.string().uuid();

/** Préparation de l'envoi d'une photo : dossier, type et taille déclarés par le navigateur. */
export const PreparePhotoSchema = z.object({
  dossierId: uuid,
  mimeType: z.literal(PHOTO_TYPE, { errorMap: () => ({ message: 'photo type' }) }),
  sizeBytes: z
    .number({ invalid_type_error: 'photo size', required_error: 'photo size' })
    .int('photo size')
    .min(1, 'photo size')
    .max(PHOTO_MAX_BYTES, 'photo size'),
});

/** Désignation d'une photo préparée d'un dossier. */
export const PhotoRefSchema = z.object({ dossierId: uuid, photoId: uuid });

/**
 * Vrai quand les premiers octets sont ceux d'un JPEG.
 * WHY: le type déclaré par le navigateur ne prouve rien ; on reprend la lecture de signature des
 * reçus (`sniffImageType`) en n'acceptant que le JPEG, seul type du bucket.
 *
 * @example
 * isJpeg(bytes); // true
 */
export const isJpeg = (bytes: Uint8Array): boolean => sniffImageType(bytes) === PHOTO_TYPE;
