import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Font } from '@react-pdf/renderer';

/** Nom de famille commun au livret (react-pdf) et à l'affiche (next/og). */
export const FONT_FAMILY = 'PT Sans';

export type FontWeight = 'regular' | 'bold';

const FONT_FILES: Record<FontWeight, string> = {
  regular: 'PTSans-Regular.ttf',
  bold: 'PTSans-Bold.ttf',
};

/**
 * Chemin absolu du fichier TTF d'une graisse.
 *
 * WHY: `process.cwd()` vaut `apps/web` en production (`pnpm --filter @testimona/web start`)
 * comme sous Vitest ; `import.meta.url` pointerait dans `.next/server` après le build.
 *
 * @example fontFile('bold') // …/apps/web/assets/fonts/PTSans-Bold.ttf
 */
export function fontFile(weight: FontWeight): string {
  return path.join(process.cwd(), 'assets', 'fonts', FONT_FILES[weight]);
}

export interface FontData {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}

let fontDataPromise: Promise<FontData> | null = null;

async function readArrayBuffer(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(file);
  // WHY: un Buffer Node peut partager un ArrayBuffer plus grand (pool) ; on copie la tranche exacte.
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/**
 * Lit les deux graisses une seule fois (mémoïsé) pour `next/og` (`ImageResponse({ fonts })`).
 *
 * @example
 * const { regular, bold } = await readFontData();
 * new ImageResponse(el, { fonts: [{ name: FONT_FAMILY, data: regular, weight: 400 }] });
 */
export function readFontData(): Promise<FontData> {
  if (!fontDataPromise) {
    const pending = Promise.all([
      readArrayBuffer(fontFile('regular')),
      readArrayBuffer(fontFile('bold')),
    ]).then(([regular, bold]) => ({ regular, bold }));
    // WHY: en cas d'échec de lecture, ne pas mémoïser le rejet pour permettre un nouvel essai.
    pending.catch(() => {
      if (fontDataPromise === pending) fontDataPromise = null;
    });
    fontDataPromise = pending;
  }
  return fontDataPromise;
}

let pdfFontsRegistered = false;

/**
 * Enregistre PT Sans auprès de react-pdf (idempotent : appelable à chaque requête).
 *
 * @example
 * registerPdfFonts();
 * const pdf = await renderToBuffer(<Booklet … />);
 */
export function registerPdfFonts(): void {
  if (pdfFontsRegistered) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: fontFile('regular'), fontWeight: 'normal' },
      { src: fontFile('bold'), fontWeight: 'bold' },
    ],
  });
  // WHY: la césure par défaut de react-pdf suit des règles anglaises et coupe mal le français ;
  // on renvoie le mot entier pour ne jamais le couper.
  Font.registerHyphenationCallback((word) => [word]);
  pdfFontsRegistered = true;
}
