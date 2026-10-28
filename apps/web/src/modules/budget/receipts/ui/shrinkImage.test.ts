import { describe, expect, it, vi } from 'vitest';
import {
  SHRINK_MAX_BYTES,
  shrinkImage,
  shrinkTarget,
  type DecodedImage,
  type ShrinkEnv,
} from './shrinkImage';

const MIB = 1024 * 1024;

describe('shrinkTarget', () => {
  it('laisse partir telle quelle une photo petite et légère', () => {
    expect(shrinkTarget(800_000, 1200, 900)).toBeNull();
    expect(shrinkTarget(SHRINK_MAX_BYTES, 1600, 1600)).toBeNull();
  });

  it('ramène le plus grand côté à 1600 px en gardant les proportions', () => {
    expect(shrinkTarget(1 * MIB, 4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(shrinkTarget(1 * MIB, 3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('réencode sans agrandir une photo petite mais trop lourde', () => {
    expect(shrinkTarget(SHRINK_MAX_BYTES + 1, 1200, 900)).toEqual({ width: 1200, height: 900 });
  });

  it('ne réduit pas une image aux dimensions illisibles', () => {
    expect(shrinkTarget(4 * MIB, 0, 0)).toBeNull();
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
  it('envoie l’original sans le redessiner quand rien ne dépasse', async () => {
    const file = fileOf(1000);
    const fake = env(1200, 900, null);
    expect(await shrinkImage(file, fake)).toBe(file);
    expect(fake.encode).not.toHaveBeenCalled();
    expect(fake.close).toHaveBeenCalled();
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

  it('garde l’original quand l’encodage échoue ou n’allège pas', async () => {
    const file = fileOf(4000);
    expect(await shrinkImage(file, env(4000, 3000, null))).toBe(file);
    const heavier = new Blob([new Uint8Array(5000)], { type: 'image/jpeg' });
    expect(await shrinkImage(file, env(4000, 3000, heavier))).toBe(file);
    const png = new Blob([new Uint8Array(10)], { type: 'image/png' });
    expect(await shrinkImage(file, env(4000, 3000, png))).toBe(file);
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
