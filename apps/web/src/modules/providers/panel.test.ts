import { describe, expect, it } from 'vitest';
import { panelCity, panelGroups } from './panel';
import type { PanelProvider } from './schema';

let n = 0;
function provider(fields: Partial<PanelProvider>): PanelProvider {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    categoryKey: 'tentsChairs',
    name: `Prestataire ${n}`,
    city: 'Libreville',
    district: null,
    priceNote: null,
    isExample: true,
    verifiedAt: null,
    active: true,
    ...fields,
  };
}
const verified = (fields: Partial<PanelProvider>) =>
  provider({
    isExample: false,
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

  it('départage deux noms identiques par identifiant', () => {
    const b = provider({ id: '00000000-0000-4000-8000-00000000000b', name: 'Même nom' });
    const a = provider({ id: '00000000-0000-4000-8000-00000000000a', name: 'Même nom' });
    const groups = panelGroups([b, a], ['tentsChairs'], 'Libreville');
    expect(groups[0]?.providers.map((p) => p.id)).toEqual([a.id, b.id]);
  });

  it('traite tiret, espaces multiples et espaces de bord comme équivalents', () => {
    expect(
      panelGroups([provider({ city: 'port gentil' })], ['tentsChairs'], 'Port-Gentil'),
    ).toHaveLength(1);
    expect(
      panelGroups([provider({ city: ' Libreville ' })], ['tentsChairs'], 'Libreville'),
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
