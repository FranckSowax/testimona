import { describe, expect, it } from 'vitest';
import { DOCUMENT_THEMES, TEXT_COLOR_KEYS } from './theme';

/** Luminance relative WCAG 2.x d'une couleur `#rrggbb`. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe('DOCUMENT_THEMES', () => {
  it('calcule le contraste comme la WCAG', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrast('#50aac3', '#ffffff')).toBeCloseTo(2.67, 2);
  });

  it('donne à chaque couleur de texte un contraste d’au moins 4,5:1 sur le fond', () => {
    for (const theme of Object.values(DOCUMENT_THEMES)) {
      for (const key of TEXT_COLOR_KEYS) {
        expect(contrast(theme[key], theme.background), key).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('garde les couleurs de la marque pour le décor du style couleur', () => {
    expect(DOCUMENT_THEMES.color.frame).toBe('#50aac3');
    expect(DOCUMENT_THEMES.color.rule).toBe('#db8186');
  });
});
