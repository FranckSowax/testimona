import { describe, expect, it, vi } from 'vitest';
import { shrinkImage, shrinkTarget, type DecodedImage, type ShrinkEnv } from './shrinkImage';

describe('shrinkTarget', () => {
  it('garde les dimensions d’une photo petite, sans jamais agrandir', () => {
    expect(shrinkTarget(1200, 900)).toEqual({ width: 1200, height: 900 });
    expect(shrinkTarget(1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('ramène le plus grand côté à 1600 px en gardant les proportions', () => {
    expect(shrinkTarget(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(shrinkTarget(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('ne réduit pas une image aux dimensions illisibles', () => {
    expect(shrinkTarget(0, 0)).toBeNull();
  });
});

const fileOf = (bytes: number, name = 'photo.png', type = 'image/png') =>
  new File([new Uint8Array(bytes)], name, { type });

function env(width: number, height: number, blob: Blob | null): ShrinkEnv & { close: () => void } {
  const close = vi.fn();
  const image: DecodedImage = { width, height, source: {} as CanvasImageSource, close };
  return { close, decode: vi.fn(async () => image), encode: vi.fn(async () => blob) };
}

describe('shrinkImage', () => {
  it('réencode en JPEG une photo déjà petite et légère, pour en retirer les métadonnées', async () => {
    const file = fileOf(1000, 'photo.jpg', 'image/jpeg');
    const fake = env(1200, 900, new Blob([new Uint8Array(900)], { type: 'image/jpeg' }));
    const out = await shrinkImage(file, fake);
    expect(fake.encode).toHaveBeenCalledWith(expect.anything(), { width: 1200, height: 900 });
    expect(out).not.toBe(file);
    expect(out.type).toBe('image/jpeg');
    expect(out.size).toBe(900);
    expect(fake.close).toHaveBeenCalled();
  });

  it('préfère le JPEG réencodé même un peu plus lourd que l’original', async () => {
    const file = fileOf(1000);
    const heavier = new Blob([new Uint8Array(1500)], { type: 'image/jpeg' });
    const out = await shrinkImage(file, env(800, 600, heavier));
    expect(out).not.toBe(file);
    expect(out.size).toBe(1500);
    expect(out.name).toBe('photo.jpg');
  });

  it('remplace une grande photo par un JPEG réduit', async () => {
    const file = fileOf(4000);
    const fake = env(4000, 3000, new Blob([new Uint8Array(500)], { type: 'image/jpeg' }));
    const out = await shrinkImage(file, fake);
    expect(fake.encode).toHaveBeenCalledWith(expect.anything(), { width: 1600, height: 1200 });
    expect(out).not.toBe(file);
    expect(out.type).toBe('image/jpeg');
    expect(out.size).toBe(500);
    expect(out.name).toBe('photo.jpg');
    expect(fake.close).toHaveBeenCalled();
  });

  it('garde l’original seulement quand le réencodage échoue', async () => {
    const file = fileOf(4000);
    expect(await shrinkImage(file, env(4000, 3000, null))).toBe(file);
    const empty = new Blob([], { type: 'image/jpeg' });
    expect(await shrinkImage(file, env(4000, 3000, empty))).toBe(file);
    const png = new Blob([new Uint8Array(10)], { type: 'image/png' });
    expect(await shrinkImage(file, env(4000, 3000, png))).toBe(file);
    const throwing: ShrinkEnv = {
      ...env(4000, 3000, null),
      encode: vi.fn(async () => {
        throw new Error('encode');
      }),
    };
    expect(await shrinkImage(file, throwing)).toBe(file);
  });

  it('garde l’original d’une image aux dimensions illisibles', async () => {
    const file = fileOf(1000);
    const fake = env(0, 0, null);
    expect(await shrinkImage(file, fake)).toBe(file);
    expect(fake.encode).not.toHaveBeenCalled();
    expect(fake.close).toHaveBeenCalled();
  });

  it('garde l’original quand le navigateur ne sait pas décoder la photo', async () => {
    const file = fileOf(4000, 'r.jpg', 'image/jpeg');
    const failing: ShrinkEnv = {
      decode: vi.fn(async () => {
        throw new Error('decode');
      }),
      encode: vi.fn(),
    };
    expect(await shrinkImage(file, failing)).toBe(file);
    expect(failing.encode).not.toHaveBeenCalled();
  });
});
