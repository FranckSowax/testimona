/** Résultat du nettoyage : `ok` faux quand le JPEG n'a pas pu être lu (octets rendus intacts). */
export type StripResult = { ok: true; bytes: Uint8Array } | { ok: false; bytes: Uint8Array };

// WHY: APP1 porte EXIF (dont la position GPS) et XMP ; APP13 porte IPTC (auteur, lieu, légende) ;
// COM porte du texte libre.
const METADATA_MARKERS = new Set([0xe1, 0xed, 0xfe]);
const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;

/** Marqueurs sans champ de longueur (TEM et RST0 à RST7). */
const isStandalone = (marker: number) => marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);

/**
 * Retire d'un JPEG les segments de métadonnées (APP1 : EXIF et XMP ; APP13 : IPTC) placés avant
 * le premier segment SOS ; les autres segments et les données d'image restent identiques octet
 * pour octet.
 * WHY: la photo est intégrée telle quelle dans le livret, l'affiche et le PNG que les familles
 * partagent ; un JPEG envoyé hors de l'interface (sans réencodage) ne doit pas y porter sa
 * position GPS. Un JPEG illisible est rendu intact avec `ok: false` : à l'appelant de l'écarter.
 *
 * @example
 * const { ok, bytes } = stripJpegMetadata(jpeg);
 */
export function stripJpegMetadata(input: Uint8Array): StripResult {
  const failed: StripResult = { ok: false, bytes: input };
  if (input.length < 4 || input[0] !== 0xff || input[1] !== SOI) return failed;
  const kept: Uint8Array[] = [input.subarray(0, 2)];
  let pos = 2;
  while (pos < input.length) {
    if (input[pos] !== 0xff) return failed;
    // WHY: des octets 0xFF de remplissage peuvent précéder un marqueur.
    let markerPos = pos + 1;
    while (markerPos < input.length && input[markerPos] === 0xff) markerPos += 1;
    if (markerPos >= input.length) return failed;
    const marker = input[markerPos] as number;
    if (marker === SOS) {
      const end = imageEnd(input, markerPos);
      if (end === null) return failed;
      // WHY: les données d'image sont gardées telles quelles jusqu'à EOI compris ; tout ce qui
      // suit est retiré (images secondaires MPF ou Ultra HDR, qui portent leur propre EXIF).
      kept.push(input.subarray(pos, end));
      return { ok: true, bytes: concat(kept) };
    }
    // WHY: 0x00 n'est pas un marqueur (seulement un octet d'échappement dans les données d'image).
    if (marker === 0x00 || marker === EOI || marker === SOI) return failed;
    if (isStandalone(marker)) {
      kept.push(input.subarray(pos, markerPos + 1));
      pos = markerPos + 1;
      continue;
    }
    if (markerPos + 2 >= input.length) return failed;
    const length = ((input[markerPos + 1] as number) << 8) | (input[markerPos + 2] as number);
    const end = markerPos + 1 + length;
    if (length < 2 || end > input.length) return failed;
    if (!METADATA_MARKERS.has(marker)) kept.push(input.subarray(pos, end));
    pos = end;
  }
  // WHY: aucun SOS : pas d'image lisible.
  return failed;
}

/**
 * Position juste après le premier EOI (FF D9) suivant l'en-tête du SOS placé en `sosPos`, ou null.
 * WHY: dans les données d'image, un 0xFF est toujours suivi de 0x00 (échappement), d'un RST
 * (D0 à D7) ou d'un marqueur ; le premier FF D9 est donc la vraie fin de l'image principale.
 * L'en-tête du SOS est sauté par sa longueur pour ne pas y lire un faux EOI. Sans EOI, le JPEG
 * est traité comme illisible.
 */
function imageEnd(input: Uint8Array, sosPos: number): number | null {
  if (sosPos + 2 >= input.length) return null;
  const length = ((input[sosPos + 1] as number) << 8) | (input[sosPos + 2] as number);
  const dataStart = sosPos + 1 + length;
  if (length < 2 || dataStart > input.length) return null;
  for (let i = dataStart; i + 1 < input.length; i += 1) {
    if (input[i] === 0xff && input[i + 1] === EOI) return i + 2;
  }
  return null;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
