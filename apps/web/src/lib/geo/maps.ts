/**
 * Helpers to turn a free-form address OR a pasted Google Maps link into a
 * usable map query (PDF p40 — "mettre l'adresse complète ou copier-coller la
 * localisation, c.-à-d. le lien du point Google Map ... pouvoir valider la
 * donnée").
 */

export type LocationKind = 'empty' | 'coords' | 'place' | 'unknown';

export interface ParsedLocation {
  /** Normalised query usable in a maps embed / directions URL. */
  query: string;
  kind: LocationKind;
  /** True when we recognised a usable location (used as light validation). */
  valid: boolean;
}

const COORDS_RE = /(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/;

/**
 * Parse an address string or a Google Maps URL into a normalised query.
 *
 * Supported Google Maps shapes:
 *   - `.../@48.8584,2.2945,17z/...`        → coords
 *   - `...?q=48.8584,2.2945` / `?q=Place`  → coords or place
 *   - `...!3d48.8584!4d2.2945...`          → coords
 *   - `.../place/Tour+Eiffel/...`          → place name
 *   - short links (maps.app.goo.gl/…)      → kept as-is (kind: unknown)
 */
export function parseLocation(raw: string): ParsedLocation {
  const input = (raw ?? '').trim();
  if (!input) return { query: '', kind: 'empty', valid: false };

  const isUrl = /^https?:\/\//i.test(input);
  if (!isUrl) {
    const coords = input.match(COORDS_RE);
    if (coords) return { query: `${coords[1]},${coords[2]}`, kind: 'coords', valid: true };
    // Plain address — require a couple of words / a number to look real.
    const valid = input.length >= 4;
    return { query: input, kind: 'place', valid };
  }

  // It's a URL — try to pull coordinates first (most reliable for embeds).
  const at = input.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (at) return { query: `${at[1]},${at[2]}`, kind: 'coords', valid: true };

  const bang = input.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (bang) return { query: `${bang[1]},${bang[2]}`, kind: 'coords', valid: true };

  try {
    const u = new URL(input);
    const q = u.searchParams.get('q') ?? u.searchParams.get('query');
    if (q) {
      const c = q.match(COORDS_RE);
      if (c) return { query: `${c[1]},${c[2]}`, kind: 'coords', valid: true };
      return { query: q, kind: 'place', valid: q.length >= 2 };
    }
    const placeMatch = u.pathname.match(/\/place\/([^/@]+)/);
    if (placeMatch?.[1]) {
      return {
        query: decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')),
        kind: 'place',
        valid: true,
      };
    }
  } catch {
    /* fall through */
  }

  // A maps short-link we can't decode client-side — still usable as a link,
  // but not embeddable. Keep the raw URL so the directions button works.
  return { query: input, kind: 'unknown', valid: /goo\.gl|google\.[a-z.]+\/maps/i.test(input) };
}

/** Google Maps embed URL for a parsed/raw location (empty string when unusable). */
export function mapsEmbedSrc(raw: string): string {
  const { query, kind } = parseLocation(raw);
  if (!query || kind === 'empty' || kind === 'unknown') return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Google Maps directions URL (falls back to opening the pasted link). */
export function mapsDirectionsHref(raw: string): string {
  const { query, kind } = parseLocation(raw);
  if (kind === 'unknown') return raw.trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}
