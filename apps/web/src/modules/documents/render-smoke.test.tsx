// @vitest-environment node
import { Document, Page, renderToBuffer, Text } from '@react-pdf/renderer';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { FONT_FAMILY, registerPdfFonts } from './fonts';

describe('rendu PDF (smoke)', () => {
  it('produit un PDF A5 qui embarque PT Sans et ses accents français', async () => {
    registerPdfFonts();
    // WHY: le second appel vérifie l'idempotence (les routes l'appellent à chaque requête).
    registerPdfFonts();

    const buffer = await renderToBuffer(
      <Document>
        <Page size="A5">
          <Text style={{ fontFamily: FONT_FAMILY }}>Évêché, Noël, ç, œ</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontWeight: 'bold' }}>Hommage</Text>
        </Page>
      </Document>,
    );

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // WHY: /FontFile2 n'apparaît que si une police TrueType est réellement embarquée ;
    // la police standard Helvetica (repli) n'en produit pas.
    expect(buffer.toString('latin1')).toContain('/FontFile2');
  });
});
