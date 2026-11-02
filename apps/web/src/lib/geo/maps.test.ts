import { describe, expect, it } from 'vitest';
import { mapsDirectionsHref, mapsEmbedSrc, parseLocation } from './maps';

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

  it.each([
    'https://goo.gl/maps/abc123',
    'https://maps.google.fr/maps/xyz',
    'https://www.google.co.uk/maps/xyz',
    'https://google.com/maps/xyz',
  ])('garde le lien court Google %s', (url) => {
    expect(parseLocation(url)).toMatchObject({ kind: 'unknown', valid: true });
  });

  it.each([
    'https://evil.example/goo.gl',
    'https://goo.gl.evil.example/x',
    'https://phish.example/google.com/maps',
    'https://user:pw@goo.gl/x',
    'http://maps.app.goo.gl/abc123',
    'https://www.google.com/search?hl=fr',
    'https://www.google.evil/maps/x',
  ])("refuse le lien %s, qui n'est pas un lien Google Maps sûr", (url) => {
    expect(parseLocation(url)).toMatchObject({ kind: 'unknown', valid: false });
  });
});

describe('mapsDirectionsHref', () => {
  it('construit un itinéraire vers une adresse', () => {
    expect(mapsDirectionsHref('Église Saint-Michel, Libreville')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=%C3%89glise%20Saint-Michel%2C%20Libreville',
    );
  });

  it('garde un lien court Google Maps', () => {
    expect(mapsDirectionsHref(' https://maps.app.goo.gl/abc123 ')).toBe(
      'https://maps.app.goo.gl/abc123',
    );
  });

  it.each([
    '',
    'https://example.com/lieu',
    'https://evil.example/goo.gl',
    'https://goo.gl.evil.example/x',
    'https://user:pw@goo.gl/x',
  ])('ne renvoie aucun lien pour « %s »', (raw) => {
    expect(mapsDirectionsHref(raw)).toBe('');
  });

  it.each(['javascript:alert(1)', 'data:text/html,x'])(
    "n'ouvre jamais le schéma de « %s »",
    (raw) => {
      expect(mapsDirectionsHref(raw)).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\//);
    },
  );
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
