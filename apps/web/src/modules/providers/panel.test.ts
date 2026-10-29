import { describe, expect, it } from 'vitest';
import { panelCity, panelGroups } from './panel';
import type { Provider } from './schema';

let n = 0;
function provider(fields: Partial<Provider>): Provider {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    categoryKey: 'tentsChairs',
    name: `Prestataire ${n}`,
    city: 'Libreville',
    district: null,
    whatsapp: null,
    priceNote: null,
    isExample: true,
    verifiedAt: null,
    active: true,
    ...fields,
  };
}
const verified = (fields: Partial<Provider>) =>
  provider({
    isExample: false,
    whatsapp: '+24177123456',
    verifiedAt: '2026-10-01T00:00:00Z',
    ...fields,
  });

describe('panelCity', () => {
  it('prend la ville du décès, sinon Libreville', () => {
    expect(panelCity(' Port-Gentil ')).toBe('Port-Gentil');
    expect(panelCity('')).toBe('Libreville');
    expect(panelCity(null)).toBe('Libreville');
  });
});

describe('panelGroups', () => {
  it('met les vérifiés avant les exemples, puis trie par nom', () => {
    const groups = panelGroups(
      [
        provider({ name: 'Bâches Zed' }),
        verified({ name: 'Tentes Owendo' }),
        provider({ name: 'Akanda Location' }),
      ],
      ['tentsChairs'],
      'Libreville',
    );
    expect(groups.map((g) => [g.category, g.providers.map((p) => p.name)])).toEqual([
      ['tentsChairs', ['Tentes Owendo', 'Akanda Location', 'Bâches Zed']],
    ]);
  });

  it("suit l'ordre des catégories demandées et omet les catégories vides", () => {
    const groups = panelGroups(
      [provider({ categoryKey: 'sound' }), provider({ categoryKey: 'tentsChairs' })],
      ['tentsChairs', 'lighting', 'sound'],
      'Libreville',
    );
    expect(groups.map((g) => g.category)).toEqual(['tentsChairs', 'sound']);
  });

  it('garde cinq prestataires au plus par catégorie', () => {
    const many = Array.from({ length: 7 }, () => provider({}));
    expect(panelGroups(many, ['tentsChairs'], 'Libreville')[0]?.providers).toHaveLength(5);
  });

  it('compare la ville sans casse ni accents', () => {
    const groups = panelGroups(
      [
        provider({ city: 'LIBREVILLE' }),
        provider({ city: 'Lambaréné' }),
        provider({ city: 'Owendo' }),
      ],
      ['tentsChairs'],
      'libreville',
    );
    expect(groups[0]?.providers.map((p) => p.city)).toEqual(['LIBREVILLE']);
    expect(
      panelGroups([provider({ city: 'Lambarene' })], ['tentsChairs'], 'Lambaréné'),
    ).toHaveLength(1);
  });

  it('écarte les inactifs et les non vérifiés qui ne sont pas des exemples', () => {
    const groups = panelGroups(
      [provider({ active: false }), provider({ isExample: false }), verified({ active: false })],
      ['tentsChairs'],
      'Libreville',
    );
    expect(groups).toEqual([]);
  });
});
