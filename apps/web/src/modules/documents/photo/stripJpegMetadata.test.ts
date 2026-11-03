import { describe, expect, it } from 'vitest';
import { stripJpegMetadata } from './stripJpegMetadata';

/** Segment JPEG : marqueur, longueur (comptant ses 2 octets) puis contenu. */
const segment = (marker: number, payload: number[]) => {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
};
const SOI = [0xff, 0xd8];
const APP0 = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]); // « JFIF »
const EXIF = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x47, 0x50, 0x53]); // « Exif » + GPS
const XMP = segment(0xe1, [0x68, 0x74, 0x74, 0x70]);
const IPTC = segment(0xed, [0x50, 0x68, 0x6f]);
const DQT = segment(0xdb, [0x00, 1, 2, 3]);
const SOF = segment(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
// WHY: les données d'image peuvent contenir un octet qui ressemble à un APP1 : il doit rester.
// FF 00 (échappement) et FF D0 (RST0) dans les données doivent aussi rester.
const SCAN = [...segment(0xda, [1, 1, 0, 0, 0x3f, 0]), 0x12, 0xff, 0x00, 0xe1, 0xff, 0xd0, 0x34];
const COM = segment(0xfe, [0x47, 0x50, 0x53]);
const EOI = [0xff, 0xd9];
const bytes = (...parts: number[][]) => new Uint8Array(parts.flat());

describe('stripJpegMetadata', () => {
  it('retire EXIF, XMP et IPTC et garde le reste octet pour octet', () => {
    const input = bytes(SOI, APP0, EXIF, XMP, IPTC, DQT, SOF, SCAN, EOI);
    expect(stripJpegMetadata(input)).toEqual({
      ok: true,
      bytes: bytes(SOI, APP0, DQT, SOF, SCAN, EOI),
    });
  });

  it('retire les commentaires (COM)', () => {
    const input = bytes(SOI, APP0, COM, DQT, SCAN, EOI);
    expect(stripJpegMetadata(input)).toEqual({ ok: true, bytes: bytes(SOI, APP0, DQT, SCAN, EOI) });
  });

  it('retire une image secondaire avec EXIF placée après EOI', () => {
    const trailing = bytes(SOI, EXIF, DQT, SCAN, EOI);
    const input = bytes(SOI, APP0, DQT, SOF, SCAN, EOI, [...trailing]);
    expect(stripJpegMetadata(input)).toEqual({
      ok: true,
      bytes: bytes(SOI, APP0, DQT, SOF, SCAN, EOI),
    });
  });

  it('garde FF 00 et FF D0 des données d’image', () => {
    const res = stripJpegMetadata(bytes(SOI, DQT, SCAN, EOI));
    expect(res).toEqual({ ok: true, bytes: bytes(SOI, DQT, SCAN, EOI) });
    expect([...res.bytes]).toEqual(expect.arrayContaining([0xff, 0x00, 0xff, 0xd0]));
  });

  it('rend un JPEG sans métadonnées à l’identique', () => {
    const input = bytes(SOI, APP0, DQT, SOF, SCAN, EOI);
    expect(stripJpegMetadata(input)).toEqual({ ok: true, bytes: input });
  });

  it('accepte des octets de remplissage avant un marqueur', () => {
    const input = bytes(SOI, [0xff], EXIF, DQT, SCAN, EOI);
    expect(stripJpegMetadata(input)).toEqual({ ok: true, bytes: bytes(SOI, DQT, SCAN, EOI) });
  });

  it.each([
    ['pas un JPEG', bytes([0x89, 0x50, 0x4e, 0x47])],
    ['tronqué dans un segment', bytes(SOI, EXIF.slice(0, 6))],
    ['tronqué avant la longueur', bytes(SOI, [0xff, 0xe1, 0x00])],
    ['sans SOS', bytes(SOI, APP0, EXIF)],
    ['octet hors marqueur', bytes(SOI, [0x00, 0x01], SCAN)],
    ['longueur trop courte', bytes(SOI, [0xff, 0xe1, 0x00, 0x01], SCAN)],
    ['fin d’image avant SOS', bytes(SOI, EXIF, EOI)],
    ['marqueur 0x00 avant SOS', bytes(SOI, [0xff, 0x00], SCAN, EOI)],
    ['données sans EOI', bytes(SOI, DQT, SCAN)],
    ['en-tête SOS tronqué', bytes(SOI, DQT, [0xff, 0xda, 0x00, 0x20, 1])],
  ])('rend les octets intacts pour une entrée illisible (%s)', (_case, input) => {
    const res = stripJpegMetadata(input);
    expect(res.ok).toBe(false);
    expect(res.bytes).toBe(input);
  });
});
