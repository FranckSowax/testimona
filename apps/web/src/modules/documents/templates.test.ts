import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';

vi.mock('server-only', () => ({}));
// WHY: traduction réelle des messages, comme le fait la page avec `getTranslations`.
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const root = locale === 'en' ? en : fr;
    return (key: string) => {
      const value = `${namespace}.${key}`
        .split('.')
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown> | undefined)?.[part],
          root,
        );
      if (typeof value !== 'string') throw new Error(`message absent : ${key}`);
      return value;
    };
  }),
}));

const { documentStarterTexts } = await import('./templates');
const { documentTextSchema } = await import('./texts');

describe('documentStarterTexts', () => {
  it('donne une couverture et des remerciements neutres ou croyants, en français', async () => {
    const neutral = await documentStarterTexts('neutral', 'fr');
    const believer = await documentStarterTexts('believer', 'fr');
    expect(neutral).toEqual({
      cover: fr.documents.starter.cover.neutral,
      thanks: fr.documents.starter.thanks.neutral,
    });
    expect(believer).toEqual({
      cover: fr.documents.starter.cover.believer,
      thanks: fr.documents.starter.thanks.believer,
    });
    expect(believer.cover).not.toBe(neutral.cover);
    expect(neutral.cover).not.toMatch(/Dieu|Seigneur/);
    expect(neutral.thanks).not.toMatch(/Dieu|Seigneur/);
  });

  it('suit la langue demandée', async () => {
    expect(await documentStarterTexts('believer', 'en')).toEqual({
      cover: en.documents.starter.cover.believer,
      thanks: en.documents.starter.thanks.believer,
    });
  });

  it('prend le ton neutre par défaut', async () => {
    for (const tone of [undefined, null, '', 'inconnu', { skipped: true }]) {
      expect(await documentStarterTexts(tone, 'fr')).toEqual(
        await documentStarterTexts('neutral', 'fr'),
      );
    }
  });

  it("ne propose pas d'hommage et respecte les limites du livret", async () => {
    for (const locale of ['fr', 'en'] as const) {
      for (const tone of ['neutral', 'believer']) {
        const texts = await documentStarterTexts(tone, locale);
        expect(Object.keys(texts).sort()).toEqual(['cover', 'thanks']);
        expect(documentTextSchema('cover').parse(texts.cover)).toBe(texts.cover);
        expect(documentTextSchema('thanks').parse(texts.thanks)).toBe(texts.thanks);
      }
    }
  });
});
