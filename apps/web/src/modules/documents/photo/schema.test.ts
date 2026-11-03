import { describe, expect, it } from 'vitest';
import { isJpeg, PHOTO_MAX_BYTES, PhotoRefSchema, PreparePhotoSchema } from './schema';

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const PHOTO = '99999999-9999-4999-8999-999999999999';

describe('schémas de la photo', () => {
  it('accepte un JPEG de taille permise', () => {
    const input = { dossierId: DOSSIER, mimeType: 'image/jpeg', sizeBytes: PHOTO_MAX_BYTES };
    expect(PreparePhotoSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ['mimeType', { mimeType: 'image/png' }],
    ['sizeBytes', { sizeBytes: 0 }],
    ['sizeBytes', { sizeBytes: PHOTO_MAX_BYTES + 1 }],
    ['sizeBytes', { sizeBytes: 1.5 }],
    ['dossierId', { dossierId: 'x' }],
  ])('refuse un champ %s invalide', (field, patch) => {
    const res = PreparePhotoSchema.safeParse({
      dossierId: DOSSIER,
      mimeType: 'image/jpeg',
      sizeBytes: 10,
      ...patch,
    });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.path[0]).toBe(field);
  });

  it('exige deux identifiants pour désigner une photo', () => {
    expect(PhotoRefSchema.safeParse({ dossierId: DOSSIER, photoId: PHOTO }).success).toBe(true);
    expect(PhotoRefSchema.safeParse({ dossierId: DOSSIER, photoId: 'x' }).success).toBe(false);
  });

  it('ne reconnaît que la signature JPEG', () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(false);
    expect(isJpeg(new Uint8Array([]))).toBe(false);
  });
});
