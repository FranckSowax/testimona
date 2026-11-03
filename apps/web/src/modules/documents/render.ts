import 'server-only';

import { type DocumentProps, renderToBuffer } from '@react-pdf/renderer';
import { ImageResponse } from 'next/og';
import { createElement, type ReactElement } from 'react';
import { FONT_FAMILY, readFontData, registerPdfFonts } from './fonts';
import type { BookletData, PosterData } from './model';
import { Booklet } from './pdf/Booklet';
import { PosterPdf } from './pdf/PosterPdf';
import { POSTER_IMAGE_SIZE, PosterImage } from './png/PosterImage';

async function _renderPdf(element: ReactElement): Promise<Uint8Array> {
  registerPdfFonts();
  // WHY: les gabarits renvoient un <Document> ; le type de `renderToBuffer` exige un élément
  // dont les props sont celles de Document, ce que TypeScript ne déduit pas d'un composant.
  const buffer = await renderToBuffer(element as ReactElement<DocumentProps>);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Livret A5 en PDF.
 *
 * @example
 * const pdf = await renderBooklet(bookletData(inputs, labels, photo));
 */
export function renderBooklet(data: BookletData): Promise<Uint8Array> {
  return _renderPdf(createElement(Booklet, { data }));
}

/**
 * Affiche A4 en PDF.
 *
 * @example
 * const pdf = await renderPosterPdf(posterData('poster.pdf', inputs, labels, photo));
 */
export function renderPosterPdf(data: PosterData): Promise<Uint8Array> {
  return _renderPdf(createElement(PosterPdf, { data }));
}

/**
 * Affiche carrée 1080 × 1080 en PNG, pour WhatsApp.
 *
 * @example
 * const png = await renderPosterPng(posterData('poster.png', inputs, labels, photo));
 */
export async function renderPosterPng(data: PosterData): Promise<Uint8Array> {
  const { regular, bold } = await readFontData();
  const response = new ImageResponse(createElement(PosterImage, { data }), {
    width: POSTER_IMAGE_SIZE,
    height: POSTER_IMAGE_SIZE,
    fonts: [
      { name: FONT_FAMILY, data: regular, weight: 400, style: 'normal' },
      { name: FONT_FAMILY, data: bold, weight: 700, style: 'normal' },
    ],
  });
  return new Uint8Array(await response.arrayBuffer());
}
