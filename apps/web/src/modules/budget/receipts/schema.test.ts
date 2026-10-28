import { describe, expect, it, vi } from 'vitest';
import { RECEIPT_MIME_TYPES } from '@/modules/ai/receipt-provider';
import {
  PrepareReceiptSchema,
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
  ReceiptRefSchema,
  isReceiptType,
  sniffImageType,
} from './schema';

vi.mock('server-only', () => ({}));

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const RECEIPT = '77777777-7777-4777-8777-777777777777';

describe('schémas des reçus', () => {
  it('accepte une photo JPEG, PNG ou WebP de 5 Mo au plus', () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(
        PrepareReceiptSchema.safeParse({ dossierId: DOSSIER, mimeType, sizeBytes: 1 }).success,
      ).toBe(true);
    }
    expect(
      PrepareReceiptSchema.safeParse({
        dossierId: DOSSIER,
        mimeType: 'image/jpeg',
        sizeBytes: RECEIPT_MAX_BYTES,
      }).success,
    ).toBe(true);
  });

  it('nomme l’erreur de type et de taille', () => {
    const issue = (fields: Record<string, unknown>) =>
      PrepareReceiptSchema.safeParse({
        dossierId: DOSSIER,
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        ...fields,
      }).error?.issues[0]?.message;
    expect(issue({ mimeType: 'image/gif' })).toBe('receipt type');
    expect(issue({ sizeBytes: 0 })).toBe('receipt size');
    expect(issue({ sizeBytes: RECEIPT_MAX_BYTES + 1 })).toBe('receipt size');
    expect(issue({ sizeBytes: 1.5 })).toBe('receipt size');
    expect(issue({ sizeBytes: '10' })).toBe('receipt size');
  });

  it('exige des identifiants valides', () => {
    expect(ReceiptRefSchema.safeParse({ dossierId: DOSSIER, receiptId: RECEIPT }).success).toBe(
      true,
    );
    expect(ReceiptRefSchema.safeParse({ dossierId: DOSSIER, receiptId: 'x' }).success).toBe(false);
  });

  it('reconnaît une image à sa signature, pas à son nom', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(
      sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])),
    ).toBe('image/png');
    expect(sniffImageType(new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '))).toBe(
      'image/webp',
    );
    expect(sniffImageType(new TextEncoder().encode('GIF89a'))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
    expect(isReceiptType('image/png')).toBe(true);
    expect(isReceiptType('image/heic')).toBe(false);
  });

  it('accepte à l’envoi exactement les types que l’IA peut lire', () => {
    // WHY: le schéma sert aussi au navigateur et ne peut importer le module serveur de l'IA.
    expect([...RECEIPT_TYPES]).toEqual([...RECEIPT_MIME_TYPES]);
  });
});
