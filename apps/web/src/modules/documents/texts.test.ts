import { describe, expect, it } from 'vitest';
import { DOCUMENT_TEXT_MAX, DOCUMENT_TEXTS, documentTextSchema, readDocumentTexts } from './texts';

describe('textes du livret et de l’affiche', () => {
  it('range chaque texte sous sa clé de réponse', () => {
    expect(DOCUMENT_TEXTS).toEqual({
      cover: 'documents.booklet.cover',
      tribute: 'documents.booklet.tribute',
      thanks: 'documents.booklet.thanks',
    });
    expect(DOCUMENT_TEXT_MAX).toEqual({ cover: 200, tribute: 1500, thanks: 600 });
  });

  it('nettoie le texte comme un brouillon', () => {
    expect(documentTextSchema('tribute').parse('  Une vie\r\nde partage  ')).toBe(
      'Une vie\nde partage',
    );
  });

  it('refuse un texte vide, avec NUL ou trop long pour sa mise en page', () => {
    expect(documentTextSchema('cover').safeParse('   ').success).toBe(false);
    expect(documentTextSchema('cover').safeParse('a\u0000b').success).toBe(false);
    expect(documentTextSchema('cover').safeParse('a'.repeat(200)).success).toBe(true);
    expect(documentTextSchema('cover').safeParse('a'.repeat(201)).success).toBe(false);
    expect(documentTextSchema('tribute').safeParse('a'.repeat(1500)).success).toBe(true);
    expect(documentTextSchema('tribute').safeParse('a'.repeat(1501)).success).toBe(false);
    expect(documentTextSchema('thanks').safeParse('a'.repeat(600)).success).toBe(true);
    expect(documentTextSchema('thanks').safeParse('a'.repeat(601)).success).toBe(false);
  });

  it('compte un retour CRLF comme un seul caractère', () => {
    const text = `${'a'.repeat(99)}\r\n${'b'.repeat(100)}`;
    expect(documentTextSchema('cover').safeParse(text).success).toBe(true);
  });

  it('lit les textes enregistrés valides, sinon null', () => {
    expect(
      readDocumentTexts({
        'documents.booklet.cover': 'Merci pour tout',
        'documents.booklet.tribute': { skipped: true },
        'documents.booklet.thanks': 'x'.repeat(601),
        'ceremony.date': '2026-11-10',
      }),
    ).toEqual({ cover: 'Merci pour tout', tribute: null, thanks: null });
    expect(readDocumentTexts({})).toEqual({ cover: null, tribute: null, thanks: null });
  });
});
