import { describe, expect, it } from 'vitest';
import type { PanelGroup } from './panel';
import { quoteMessages, quotePlace } from './quote-panel';

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
