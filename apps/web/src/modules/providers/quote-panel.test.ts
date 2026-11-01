import { describe, expect, it } from 'vitest';
import type { PanelGroup } from './panel';
import { SKIPPED } from '@/journey/types';
import { quoteContext, quoteMessages, quotePlace } from './quote-panel';

const provider = (over: Partial<PanelGroup['providers'][number]>) => ({
  id: 'p',
  categoryKey: 'tentsChairs' as const,
  name: 'Tentes',
  city: 'Libreville',
  district: null,
  priceNote: null,
  isExample: false,
  verifiedAt: '2026-10-01T00:00:00Z',
  active: true,
  ...over,
});

const t = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

describe('quoteMessages', () => {
  it('prépare un message pour chaque prestataire contactable seulement', () => {
    const groups: PanelGroup[] = [
      {
        category: 'tentsChairs',
        providers: [
          provider({ id: 'ok' }),
          provider({ id: 'example', isExample: true, verifiedAt: null }),
          provider({ id: 'unverified', verifiedAt: null }),
        ],
      },
    ];
    const messages = quoteMessages(groups, { place: 'Libreville', date: null, quantities: [] }, t);
    expect(Object.keys(messages)).toEqual(['ok']);
    expect(messages.ok).toContain('providers.quote.message.greeting');
    expect(messages.ok).toContain('Libreville');
  });

  it('ne renvoie rien sans prestataire contactable', () => {
    expect(quoteMessages([], { place: 'Libreville', date: null, quantities: [] }, t)).toEqual({});
  });
});

describe('quoteContext', () => {
  const quantities = [{ key: 'chairs' as const, count: 120 }];

  it('prend la date des obsèques, formatée dans la langue de l’interface', () => {
    const answers = {
      'vigil.place': { city: 'Franceville', countryCode: 'GA' },
      'ceremony.date': '2026-11-14',
    };
    expect(quoteContext({ answers, city: 'Libreville', locale: 'fr', quantities })).toEqual({
      place: 'Franceville',
      date: 'samedi 14 novembre 2026',
      quantities,
    });
    expect(quoteContext({ answers, city: 'Libreville', locale: 'en', quantities }).date).toBe(
      'Saturday, November 14, 2026',
    );
  });

  it('laisse la date à préciser sans réponse, passée ou invalide', () => {
    const context = (date: unknown) =>
      quoteContext({
        answers: { 'ceremony.date': date },
        city: 'Libreville',
        locale: 'fr',
        quantities: [],
      });
    expect(quoteContext({ answers: {}, city: 'Libreville', locale: 'fr', quantities: [] })).toEqual(
      { place: 'Libreville', date: null, quantities: [] },
    );
    expect(context(SKIPPED).date).toBeNull();
    expect(context('2026-02-31').date).toBeNull();
    expect(context('14/11/2026').date).toBeNull();
  });
});

describe('quotePlace', () => {
  it('prend la ville de la veillée, sinon celle de l’encadré', () => {
    expect(quotePlace({ city: 'Franceville', countryCode: 'GA' }, 'Libreville')).toBe(
      'Franceville',
    );
    expect(quotePlace(null, 'Libreville')).toBe('Libreville');
    expect(quotePlace('Franceville', 'Libreville')).toBe('Libreville');
    expect(quotePlace({ city: '  ', countryCode: 'GA' }, 'Libreville')).toBe('Libreville');
  });
});
