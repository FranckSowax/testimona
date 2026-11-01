import { describe, expect, it } from 'vitest';
import { ceremonyDate, ceremonyPlaces, placeHref, sortedProgram } from './ceremony';
import { SKIPPED } from './types';

describe('sortedProgram', () => {
  it('trie les moments par heure, de façon stable', () => {
    const program = sortedProgram([
      { time: '10:00', moment: 'Office' },
      { time: '08:00', moment: 'Accueil', place: 'Domicile' },
      { time: '10:00', moment: 'Hommages', lead: 'Awa' },
      { time: '09:00', moment: 'Cortège' },
    ]);
    expect(program.map((item) => item.moment)).toEqual([
      'Accueil',
      'Cortège',
      'Office',
      'Hommages',
    ]);
    expect(program[0]).toEqual({ time: '08:00', moment: 'Accueil', place: 'Domicile' });
    expect(program[3]).toEqual({ time: '10:00', moment: 'Hommages', lead: 'Awa' });
  });

  it('ignore une valeur absente, passée ou mal formée', () => {
    expect(sortedProgram(undefined)).toEqual([]);
    expect(sortedProgram(null)).toEqual([]);
    expect(sortedProgram(SKIPPED)).toEqual([]);
    expect(sortedProgram('08:00 Accueil')).toEqual([]);
    expect(sortedProgram({ time: '08:00', moment: 'Accueil' })).toEqual([]);
  });

  it('écarte les moments sans heure ou sans moment valides', () => {
    const program = sortedProgram([
      { time: '8:00', moment: 'Heure mal formée' },
      { time: '24:00', moment: 'Heure impossible' },
      { time: '09:00', moment: '   ' },
      { time: '09:00' },
      null,
      'texte',
      { time: '11:00', moment: 'Gardé' },
    ]);
    expect(program).toEqual([{ time: '11:00', moment: 'Gardé' }]);
  });

  it('rogne les textes et omet les champs facultatifs vides', () => {
    expect(
      sortedProgram([{ time: ' 08:00 ', moment: ' Accueil ', place: '  ', lead: ' Awa ' }]),
    ).toEqual([{ time: '08:00', moment: 'Accueil', lead: 'Awa' }]);
  });
});

describe('ceremonyDate', () => {
  it('formate une date ISO en date longue, dans la langue demandée', () => {
    expect(ceremonyDate('2026-11-14', 'fr')).toBe('samedi 14 novembre 2026');
    expect(ceremonyDate('2026-11-14', 'en')).toBe('Saturday, November 14, 2026');
  });

  it('renvoie null sans date valide', () => {
    expect(ceremonyDate(undefined, 'fr')).toBeNull();
    expect(ceremonyDate(null, 'fr')).toBeNull();
    expect(ceremonyDate(SKIPPED, 'fr')).toBeNull();
    expect(ceremonyDate('', 'fr')).toBeNull();
    expect(ceremonyDate('14/11/2026', 'fr')).toBeNull();
    expect(ceremonyDate('2026-02-31', 'fr')).toBeNull();
    expect(ceremonyDate(20261114, 'fr')).toBeNull();
  });
});

describe('placeHref', () => {
  it('donne un itinéraire Google Maps pour une adresse ou un lien reconnu', () => {
    expect(placeHref('Cathédrale Sainte-Marie, Libreville')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Cath%C3%A9drale%20Sainte-Marie%2C%20Libreville',
    );
    expect(placeHref('https://maps.app.goo.gl/abc123')).toBe('https://maps.app.goo.gl/abc123');
  });

  it('renvoie null pour un texte inexploitable', () => {
    expect(placeHref('')).toBeNull();
    expect(placeHref('ici')).toBeNull();
    expect(placeHref('https://example.com/lieu')).toBeNull();
  });
});

describe('ceremonyPlaces', () => {
  it('liste les lieux répondus dans l’ordre de la journée', () => {
    expect(
      ceremonyPlaces({
        'ceremony.burialPlace': 'Cimetière de Lalala',
        'ceremony.liftPlace': ' Morgue de Libreville ',
        'ceremony.servicePlace': SKIPPED,
      }),
    ).toEqual([
      {
        key: 'liftPlace',
        text: 'Morgue de Libreville',
        href: 'https://www.google.com/maps/dir/?api=1&destination=Morgue%20de%20Libreville',
      },
      {
        key: 'burialPlace',
        text: 'Cimetière de Lalala',
        href: 'https://www.google.com/maps/dir/?api=1&destination=Cimeti%C3%A8re%20de%20Lalala',
      },
    ]);
  });

  it('garde un lieu sans lien quand le texte est inexploitable', () => {
    expect(ceremonyPlaces({ 'ceremony.servicePlace': 'ici' })).toEqual([
      { key: 'servicePlace', text: 'ici', href: null },
    ]);
    expect(ceremonyPlaces({})).toEqual([]);
  });
});
