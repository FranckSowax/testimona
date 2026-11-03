import { Document, Page, Text, View } from '@react-pdf/renderer';
import { FONT_FAMILY } from '../fonts';
import type { PosterData } from '../model';
import { DOCUMENT_THEMES } from '../theme';
import { PdfPhoto } from './PdfPhoto';

interface PosterPdfProps {
  data: PosterData;
}

const PHOTO = { width: 190, height: 238 } as const;

/**
 * Coupe un texte après `lines` lignes, avec des points de suspension.
 * WHY: bornés ainsi, photo, nom, phrase et cinq moments tiennent toujours sur une page A4.
 */
function _clamp(lines: number) {
  return { maxLines: lines, textOverflow: 'ellipsis' } as const;
}

/**
 * Affiche des obsèques, A4 portrait, une seule page : photo, nom, dates de vie, phrase de
 * couverture éventuelle, date des obsèques et cinq moments au plus.
 * Appeler `registerPdfFonts()` avant le rendu (fait par `renderPosterPdf`).
 * WHY: pas de `wrap={false}` sur la page : react-pdf la redimensionnerait à son contenu au lieu
 * de garder le format A4. Chaque texte est borné en lignes (`_clamp`) pour tenir sur une page.
 *
 * @example
 * await renderToBuffer(<PosterPdf data={posterData('poster.pdf', inputs, labels, photo)} />);
 */
export function PosterPdf({ data }: PosterPdfProps) {
  const theme = DOCUMENT_THEMES[data.style];
  return (
    <Document title={data.fullName} language={data.locale}>
      <Page
        size="A4"
        style={{
          paddingVertical: 52,
          paddingHorizontal: 60,
          fontFamily: FONT_FAMILY,
          fontSize: 11,
          lineHeight: 1.4,
          color: theme.ink,
          backgroundColor: theme.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {data.photo && <PdfPhoto photo={data.photo} {...PHOTO} borderColor={theme.frame} />}
        <Text
          style={{
            ..._clamp(2),
            marginTop: data.photo ? 24 : 0,
            fontSize: 28,
            fontWeight: 'bold',
            lineHeight: 1.2,
            textAlign: 'center',
          }}
        >
          {data.fullName}
        </Text>
        {data.lifeDates && (
          <Text style={{ ..._clamp(1), marginTop: 6, fontSize: 14, color: theme.muted }}>
            {data.lifeDates}
          </Text>
        )}
        {data.cover && (
          <Text
            style={{
              ..._clamp(4),
              marginTop: 14,
              maxWidth: 400,
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {data.cover}
          </Text>
        )}
        <View style={{ width: 56, height: 1, backgroundColor: theme.rule, marginVertical: 20 }} />
        <Text style={{ ..._clamp(1), fontSize: 16, fontWeight: 'bold', color: theme.accent }}>
          {data.ceremonyDate ?? data.labels.dateToBeConfirmed}
        </Text>
        <View style={{ marginTop: 14, width: '100%' }}>
          {data.moments.map((item, index) => (
            <View
              // WHY: deux moments peuvent partager heure et intitulé ; la position les distingue.
              key={`${index}-${item.time}`}
              style={{ flexDirection: 'row', gap: 12, paddingVertical: 4 }}
            >
              <Text style={{ width: 44, fontWeight: 'bold' }}>{item.time}</Text>
              <Text style={{ ..._clamp(2), flex: 1 }}>{item.moment}</Text>
              <Text style={{ ..._clamp(2), flex: 1, color: theme.muted }}>{item.place ?? ''}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
