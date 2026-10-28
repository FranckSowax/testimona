import { z } from 'zod';

/** Bucket privé des photos de reçus. */
export const RECEIPT_BUCKET = 'receipts';

/** Types d'image acceptés pour un reçu (mêmes que le bucket et la table). */
export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ReceiptType = (typeof RECEIPT_TYPES)[number];

/** Taille maximale d'une photo de reçu : 5 Mo (même borne que le bucket et la table). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

/** Champs proposés au trésorier après la lecture d'un reçu ; null quand rien n'a été lu. */
export interface ReceiptPrefill {
  amount: number | null;
  occurredOn: string | null;
  partyName: string | null;
  budgetLineId: string | null;
}

const uuid = z.string().uuid();

/** Vrai pour un type d'image accepté. */
export const isReceiptType = (type: string): type is ReceiptType =>
  (RECEIPT_TYPES as readonly string[]).includes(type);

/** Préparation de l'envoi d'une photo : dossier, type et taille déclarés par le navigateur. */
export const PrepareReceiptSchema = z.object({
  dossierId: uuid,
  mimeType: z.enum(RECEIPT_TYPES, { errorMap: () => ({ message: 'receipt type' }) }),
  sizeBytes: z
    .number({ invalid_type_error: 'receipt size', required_error: 'receipt size' })
    .int('receipt size')
    .min(1, 'receipt size')
    .max(RECEIPT_MAX_BYTES, 'receipt size'),
});

/** Désignation d'un reçu d'un dossier (lecture par l'IA). */
export const ReceiptRefSchema = z.object({ dossierId: uuid, receiptId: uuid });

/** Désignation d'un reçu seul (ouverture de la photo). */
export const ReceiptIdSchema = z.object({ receiptId: uuid });

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ascii = (bytes: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...bytes.subarray(from, to));

/**
 * Type réel d'une image d'après ses premiers octets, ou null.
 * WHY: le type déclaré par le navigateur (et repris par le stockage) ne prouve rien ; seule la
 * signature des octets décide de ce qui part au fournisseur d'IA.
 *
 * @example
 * sniffImageType(bytes); // 'image/jpeg'
 */
export function sniffImageType(bytes: Uint8Array): ReceiptType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 && PNG.every((b, i) => bytes[i] === b)) return 'image/png';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}
