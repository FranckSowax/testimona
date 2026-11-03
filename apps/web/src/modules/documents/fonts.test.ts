import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { FONT_FAMILY, fontFile, readFontData } from './fonts';

// Signature d'un fichier TrueType (sfnt version 1.0).
const TRUETYPE_SIGNATURE = [0x00, 0x01, 0x00, 0x00];

describe('polices embarquées PT Sans', () => {
  it('nomme la famille « PT Sans »', () => {
    expect(FONT_FAMILY).toBe('PT Sans');
  });

  it.each(['regular', 'bold'] as const)('le fichier %s existe et est un TrueType', (weight) => {
    const file = fontFile(weight);
    expect(existsSync(file)).toBe(true);
    const head = [...readFileSync(file).subarray(0, 4)];
    expect(head).toEqual(TRUETYPE_SIGNATURE);
  });

  it('livre la licence OFL avec les polices', () => {
    const ofl = path.join(path.dirname(fontFile('regular')), 'OFL.txt');
    expect(existsSync(ofl)).toBe(true);
  });

  it('lit les deux graisses une seule fois, en ArrayBuffer', async () => {
    const first = await readFontData();
    expect(first.regular).toBeInstanceOf(ArrayBuffer);
    expect(first.bold).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(first.regular, 0, 4)]).toEqual(TRUETYPE_SIGNATURE);
    expect(first.regular.byteLength).not.toBe(first.bold.byteLength);
    expect(await readFontData()).toBe(first);
  });
});
