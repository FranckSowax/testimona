// @vitest-environment node
import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { BookletData, DocumentLabels, PosterData } from './model';
import { Booklet } from './pdf/Booklet';
import { programTablePresence } from './pdf/ProgramTable';
import { PosterPdf } from './pdf/PosterPdf';
import { PosterImage } from './png/PosterImage';
import { renderBooklet, renderPosterPdf, renderPosterPng } from './render';

/**
 * JPEG valide, gris uni, de `size` × `size` pixels, construit octet par octet.
 * WHY: pas de fichier binaire inventé dans le dépôt ni d'encodeur en dépendance ; une image unie
 * n'a qu'un coefficient DC nul par bloc, codé avec des tables de Huffman à un seul symbole.
 */
function grayJpeg(size: number): Uint8Array {
  const segment = (marker: number, payload: number[]) => {
    const length = payload.length + 2;
    return [0xff, marker, length >> 8, length & 0xff, ...payload];
  };
  const oneSymbolTable = (tableClass: number) =>
    segment(0xc4, [tableClass, 1, ...new Array(15).fill(0), 0]);
  const header = [
    0xff,
    0xd8,
    ...segment(0xdb, [0, ...new Array(64).fill(1)]),
    ...segment(0xc0, [8, size >> 8, size & 0xff, size >> 8, size & 0xff, 1, 1, 0x11, 0]),
    ...oneSymbolTable(0x00),
    ...oneSymbolTable(0x10),
    ...segment(0xda, [1, 1, 0, 0, 63, 0]),
  ];
  // Deux bits par bloc 8 × 8 (DC « 0 » puis fin de bloc « 0 »), complétés par des 1.
  const bits = Math.ceil(size / 8) ** 2 * 2;
  const scan = new Uint8Array(Math.ceil(bits / 8));
  if (bits % 8 !== 0) scan[scan.length - 1] = (1 << (8 - (bits % 8))) - 1;
  return new Uint8Array([...header, ...scan, 0xff, 0xd9]);
}

const labels: DocumentLabels = {
  tribute: 'Hommage',
  program: 'Programme',
  thanks: 'Remerciements',
  time: 'Heure',
  moment: 'Moment',
  place: 'Lieu',
  lead: 'Responsable',
  dateToBeConfirmed: 'Date à préciser',
  places: { liftPlace: 'Levée du corps', servicePlace: 'Cérémonie', burialPlace: 'Inhumation' },
};

const program = [
  { time: '08:00', moment: 'Levée du corps', place: 'Morgue de Libreville', lead: 'Famille Ndong' },
  { time: '10:00', moment: 'Messe', place: 'Église Saint-Michel de Nkembo' },
  { time: '14:00', moment: 'Inhumation', place: 'Cimetière de Lalala' },
];

const booklet: BookletData = {
  locale: 'fr',
  style: 'sober',
  photo: null,
  fullName: 'Marie-Thérèse Ndong Mba',
  nickname: 'Maman Marie',
  lifeDates: '3 mars 1950 – 12 octobre 2026',
  cover: 'Ta lumière demeure dans nos cœurs.',
  tribute: 'Une vie de partage, de foi et de générosité. '.repeat(20),
  thanks: 'La famille remercie chaleureusement tous ceux qui l’ont accompagnée.',
  ceremonyDate: 'samedi 14 novembre 2026',
  places: [
    { label: 'Levée du corps', text: 'Morgue de Libreville' },
    { label: 'Inhumation', text: 'Cimetière de Lalala' },
  ],
  program,
  labels,
};

const poster: PosterData = {
  locale: 'fr',
  style: 'sober',
  photo: null,
  fullName: booklet.fullName,
  lifeDates: booklet.lifeDates,
  cover: booklet.cover,
  ceremonyDate: booklet.ceremonyDate,
  moments: program,
  labels,
};

/** Texte accentué de `length` caractères, avec des espaces pour pouvoir passer à la ligne. */
const accented = (length: number) => 'Élégie à Noël, ça et œuvre ; '.repeat(10).slice(0, length);

const longProgram = Array.from({ length: 40 }, (_, i) => ({
  time: `${String(6 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
  moment: accented(200),
  place: accented(200),
  lead: accented(200),
}));

const ascii = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');
/**
 * Pages d'un PDF : objets `/Type /Page` (et non `/Pages`, l'arbre des pages).
 * WHY: react-pdf (pdfkit) écrit les dictionnaires d'objets en clair et ne compresse que les flux
 * de contenu ; un PDF à flux d'objets compressés (PDF 1.5+) demanderait un vrai analyseur.
 */
const pageCount = (pdf: Uint8Array) => ascii(pdf).match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
/** Boîtes de page, telles que react-pdf les écrit (points, six décimales). */
const mediaBoxes = (pdf: Uint8Array) =>
  [...ascii(pdf).matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map((m) => m[1]?.trim());
const A4 = '0 0 595.280029 841.890015';
const A5 = '0 0 419.529999 595.280029';
const language = (pdf: Uint8Array) => ascii(pdf).match(/\/Lang\s*\((\w+)\)/)?.[1];
const view = (png: Uint8Array) => new DataView(png.buffer, png.byteOffset, png.byteLength);

/**
 * Textes d'un arbre JSX, composants de fonction développés.
 * WHY: le contenu des PDF est compressé et ses glyphes réencodés ; vérifier l'arbre rendu par les
 * gabarits dit ce qui sera imprimé sans dépendre d'un extracteur de texte PDF.
 */
function texts(node: ReactNode): string[] {
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(texts);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  if (typeof node.type === 'function') {
    return texts((node.type as (props: unknown) => ReactNode)(node.props));
  }
  return texts(node.props.children);
}

describe('renderBooklet', () => {
  it('produit un livret A5 de quatre pages, avec ou sans photo, dans les deux styles', async () => {
    for (const style of ['sober', 'color'] as const) {
      for (const photo of [null, grayJpeg(64)]) {
        const pdf = await renderBooklet({ ...booklet, style, photo });
        expect(pdf).toBeInstanceOf(Uint8Array);
        expect(ascii(pdf.subarray(0, 5))).toBe('%PDF-');
        expect(pageCount(pdf)).toBe(4);
        expect(mediaBoxes(pdf)).toEqual([A5, A5, A5, A5]);
      }
    }
  });

  it('déclare la langue du document', async () => {
    expect(language(await renderBooklet(booklet))).toBe('fr');
    expect(language(await renderBooklet({ ...booklet, locale: 'en' }))).toBe('en');
  });

  it('poursuit sans erreur un hommage fait de nombreux retours à la ligne', async () => {
    const pdf = await renderBooklet({ ...booklet, tribute: 'Merci.\n'.repeat(200) });
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(4);
    expect(new Set(mediaBoxes(pdf))).toEqual(new Set([A5]));
  });

  it('renvoie le tableau à la page suivante s’il n’y tient pas avec sa première ligne', async () => {
    const short = programTablePresence([{ time: '08:00', moment: 'Messe' }]);
    expect(programTablePresence([])).toBeLessThan(short);
    expect(programTablePresence(longProgram)).toBeGreaterThan(short);
    // Lieux nombreux : l'en-tête du programme tombe en bas de la première page du programme.
    const places = Array.from({ length: 14 }, (_, i) => ({
      label: `Lieu ${i}`,
      text: accented(60),
    }));
    const pdf = await renderBooklet({ ...booklet, places, program: longProgram });
    expect(pageCount(pdf)).toBeGreaterThan(4);
  });

  it('tient les textes à leur longueur maximale sur quatre pages', async () => {
    const pdf = await renderBooklet({
      ...booklet,
      photo: grayJpeg(64),
      cover: accented(200),
      tribute: 'Une vie de partage, de foi et de générosité, ça et là. '.repeat(30).slice(0, 1500),
      thanks: accented(600),
    });
    expect(pageCount(pdf)).toBe(4);
  });

  it('poursuit un programme de 40 moments sur plusieurs pages', async () => {
    const pdf = await renderBooklet({ ...booklet, style: 'color', program: longProgram });
    expect(ascii(pdf.subarray(0, 5))).toBe('%PDF-');
    expect(pageCount(pdf)).toBeGreaterThan(4);
  });

  it('imprime « Date à préciser » sans date des obsèques', () => {
    expect(texts(<Booklet data={booklet} />)).toContain('samedi 14 novembre 2026');
    const printed = texts(<Booklet data={{ ...booklet, ceremonyDate: null }} />);
    expect(printed).toContain('Date à préciser');
    expect(printed).toEqual(expect.arrayContaining(['Morgue de Libreville', 'Famille Ndong']));
  });
});

describe('renderPosterPdf', () => {
  it('produit une affiche A4 d’une page, avec ou sans photo, dans les deux styles', async () => {
    for (const style of ['sober', 'color'] as const) {
      for (const photo of [null, grayJpeg(64)]) {
        const pdf = await renderPosterPdf({ ...poster, style, photo });
        expect(ascii(pdf.subarray(0, 5))).toBe('%PDF-');
        expect(pageCount(pdf)).toBe(1);
        expect(mediaBoxes(pdf)).toEqual([A4]);
      }
    }
  });

  it('reste une page A4 avec des textes accentués à leur longueur maximale', async () => {
    const pdf = await renderPosterPdf({
      ...poster,
      photo: grayJpeg(64),
      fullName: accented(200),
      lifeDates: accented(120),
      cover: accented(200),
      ceremonyDate: accented(120),
      moments: longProgram.slice(0, 5),
      locale: 'en',
    });
    expect(pageCount(pdf)).toBe(1);
    expect(mediaBoxes(pdf)).toEqual([A4]);
    expect(language(pdf)).toBe('en');
  });

  it('imprime « Date à préciser » sans date et omet la phrase absente', () => {
    const printed = texts(<PosterPdf data={{ ...poster, ceremonyDate: null, cover: null }} />);
    expect(printed).toContain('Date à préciser');
    expect(printed).not.toContain(booklet.cover);
  });
});

describe('renderPosterPng', () => {
  it('produit un PNG carré de 1080 px, avec ou sans photo, dans les deux styles', async () => {
    for (const style of ['sober', 'color'] as const) {
      for (const photo of [null, grayJpeg(64)]) {
        const png = await renderPosterPng({ ...poster, style, photo });
        expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
        // IHDR : largeur puis hauteur, entiers 32 bits gros-boutistes aux octets 16 et 20.
        expect(ascii(png.subarray(12, 16))).toBe('IHDR');
        expect(view(png).getUint32(16)).toBe(1080);
        expect(view(png).getUint32(20)).toBe(1080);
      }
    }
  });

  it('accepte cinq moments de 200 caractères accentués', async () => {
    const png = await renderPosterPng({
      ...poster,
      cover: accented(200),
      moments: longProgram.slice(0, 5),
    });
    expect(view(png).getUint32(16)).toBe(1080);
  });

  it('montre les mêmes faits que l’affiche PDF', () => {
    const data = { ...poster, ceremonyDate: null };
    const printed = texts(<PosterImage data={data} />);
    expect(printed).toContain('Date à préciser');
    for (const fact of [data.fullName, data.lifeDates, data.cover, '10:00', 'Messe']) {
      expect(printed).toContain(fact);
    }
  });
});
