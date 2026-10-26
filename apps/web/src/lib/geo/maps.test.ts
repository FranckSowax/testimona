import { describe, expect, it } from 'vitest';
import { mapsEmbedSrc, parseLocation } from './maps';

describe('parseLocation', () => {
  it('reconnaît une saisie vide', () => {
    expect(parseLocation('   ')).toEqual({ query: '', kind: 'empty', valid: false });
  });

  it('garde une adresse libre', () => {
    expect(parseLocation('Église Saint-Michel, Nkembo, Libreville')).toMatchObject({
      kind: 'place',
      valid: true,
    });
  });

  it('extrait des coordonnées saisies à la main', () => {
    expect(parseLocation('0.4162, 9.4673')).toMatchObject({
      query: '0.4162,9.4673',
      kind: 'coords',
    });
  });

  it.each([
    ['https://www.google.com/maps/@0.4162,9.4673,17z', '0.4162,9.4673'],
    ['https://www.google.com/maps/place/X/data=!3d0.4162!4d9.4673', '0.4162,9.4673'],
    ['https://maps.google.com/?q=0.4162,9.4673', '0.4162,9.4673'],
  ])('extrait les coordonnées de %s', (url, query) => {
    expect(parseLocation(url)).toMatchObject({ query, kind: 'coords', valid: true });
  });

  it("extrait le nom d'un lieu", () => {
    expect(parseLocation('https://www.google.com/maps/place/Stade+de+Nzeng-Ayong/')).toMatchObject({
      query: 'Stade de Nzeng-Ayong',
      kind: 'place',
    });
  });

  it('garde un lien court non décodable', () => {
    expect(parseLocation('https://maps.app.goo.gl/abc123')).toMatchObject({
      kind: 'unknown',
      valid: true,
    });
  });

  it("refuse un lien qui n'est pas Google Maps", () => {
    expect(parseLocation('https://example.com/lieu')).toMatchObject({ valid: false });
  });
});

describe('mapsEmbedSrc', () => {
  it('construit une URL intégrable', () => {
    expect(mapsEmbedSrc('0.4162, 9.4673')).toBe(
      'https://maps.google.com/maps?q=0.4162%2C9.4673&output=embed',
    );
  });

  it('renvoie une chaîne vide si le lieu est inutilisable', () => {
    expect(mapsEmbedSrc('')).toBe('');
    expect(mapsEmbedSrc('https://maps.app.goo.gl/abc123')).toBe('');
  });
});
