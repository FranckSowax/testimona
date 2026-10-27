import { describe, expect, it } from 'vitest';
import { shareHref } from './share';

describe('shareHref', () => {
  it('encode & # + et les retours à la ligne', () => {
    const href = shareHref('whatsapp', 'a&b #c +d\ne', null);
    expect(href).toBe('https://wa.me/?text=a%26b%20%23c%20%2Bd%0Ae');
  });

  it('encode les emoji en UTF-8 et les espaces en %20 (jamais +)', () => {
    const href = shareHref('whatsapp', 'Paix 🙏', null) ?? '';
    expect(href).toContain('Paix%20%F0%9F%99%8F');
    expect(href).not.toContain('+');
  });

  it("construit un mailto avec l'objet encodé", () => {
    expect(shareHref('email', 'Corps', 'Décès de Jean & Co')).toBe(
      'mailto:?subject=D%C3%A9c%C3%A8s%20de%20Jean%20%26%20Co&body=Corps',
    );
  });

  it('refuse un mailto trop long mais accepte le même texte sur WhatsApp', () => {
    const text = 'a'.repeat(1900);
    expect(shareHref('email', text, 'Objet')).toBeNull();
    expect(shareHref('whatsapp', text, null)).not.toBeNull();
  });

  it('applique la limite au texte encodé, pas au texte brut', () => {
    expect(shareHref('email', 'a'.repeat(1700), 'x')).not.toBeNull();
    expect(shareHref('email', '&'.repeat(700), 'x')).toBeNull();
    expect(shareHref('whatsapp', 'a'.repeat(4000), null)).not.toBeNull();
    expect(shareHref('whatsapp', 'a'.repeat(4001), null)).toBeNull();
  });
});
