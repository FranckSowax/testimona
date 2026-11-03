import { Document, Page, Text, View } from '@react-pdf/renderer';
import { FONT_FAMILY } from '../fonts';
import type { BookletData } from '../model';
import { DOCUMENT_THEMES, type DocumentTheme } from '../theme';
import { PdfPhoto } from './PdfPhoto';
import { ProgramTable } from './ProgramTable';

interface BookletProps {
  data: BookletData;
}

interface SectionProps {
  data: BookletData;
  theme: DocumentTheme;
}

/** Marges A5 (420 × 595 pt) : généreuses, pour l'impression et la reliure. */
const PAGE_PADDING = { paddingTop: 52, paddingBottom: 52, paddingHorizontal: 46 } as const;
const PHOTO = { width: 180, height: 225 } as const;

function _pageStyle(theme: DocumentTheme) {
  return {
    ...PAGE_PADDING,
    fontFamily: FONT_FAMILY,
    fontSize: 10.5,
    lineHeight: 1.5,
    color: theme.ink,
    backgroundColor: theme.background,
  } as const;
}

function Rule({ theme, width = 40 }: { theme: DocumentTheme; width?: number }) {
  return <View style={{ width, height: 1, backgroundColor: theme.rule, marginVertical: 14 }} />;
}

function Heading({ title, theme }: { title: string; theme: DocumentTheme }) {
  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.accent, letterSpacing: 0.5 }}>
        {title}
      </Text>
      <Rule theme={theme} width={32} />
    </View>
  );
}

function Cover({ data, theme }: SectionProps) {
  return (
    <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
      {data.photo && <PdfPhoto photo={data.photo} {...PHOTO} borderColor={theme.rule} />}
      <Text
        style={{
          marginTop: data.photo ? 26 : 0,
          fontSize: 22,
          fontWeight: 'bold',
          lineHeight: 1.2,
          textAlign: 'center',
        }}
      >
        {data.fullName}
      </Text>
      {data.nickname && (
        <Text style={{ marginTop: 4, fontSize: 12, color: theme.muted, textAlign: 'center' }}>
          {`« ${data.nickname} »`}
        </Text>
      )}
      {data.lifeDates && (
        <Text style={{ marginTop: 8, fontSize: 11, color: theme.muted, textAlign: 'center' }}>
          {data.lifeDates}
        </Text>
      )}
      <Rule theme={theme} />
      <Text style={{ maxWidth: 290, fontSize: 13, textAlign: 'center' }}>{data.cover}</Text>
    </View>
  );
}

function Program({ data, theme }: SectionProps) {
  const { labels } = data;
  return (
    <View>
      <Heading title={labels.program} theme={theme} />
      <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.accent }}>
        {data.ceremonyDate ?? labels.dateToBeConfirmed}
      </Text>
      {data.places.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {data.places.map((place) => (
            <View key={place.label} style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
              <Text style={{ width: 92, color: theme.muted }}>{place.label}</Text>
              <Text style={{ flex: 1 }}>{place.text}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ marginTop: 18 }}>
        <ProgramTable program={data.program} labels={labels} theme={theme} />
      </View>
    </View>
  );
}

function Thanks({ data, theme }: SectionProps) {
  return (
    <View style={{ flexGrow: 1 }}>
      <Heading title={data.labels.thanks} theme={theme} />
      <Text>{data.thanks}</Text>
      <View style={{ marginTop: 'auto', alignItems: 'center' }}>
        <Text style={{ fontWeight: 'bold' }}>{data.fullName}</Text>
        {data.lifeDates && (
          <Text style={{ fontSize: 9.5, color: theme.muted }}>{data.lifeDates}</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Livret des obsèques, A5 : couverture, hommage, programme, remerciements.
 * Appeler `registerPdfFonts()` avant le rendu (fait par `renderBooklet`).
 * WHY: les pages gardent le découpage automatique de react-pdf : les longueurs maximales des
 * textes (`DOCUMENT_TEXT_MAX`) tiennent sur une page, et un programme de 40 moments se poursuit
 * sur les pages suivantes au lieu d'être tronqué.
 *
 * @example
 * await renderToBuffer(<Booklet data={bookletData(inputs, labels, photo)} />);
 */
export function Booklet({ data }: BookletProps) {
  const theme = DOCUMENT_THEMES[data.style];
  const page = _pageStyle(theme);
  return (
    <Document title={data.fullName}>
      <Page size="A5" style={page}>
        <Cover data={data} theme={theme} />
      </Page>
      <Page size="A5" style={page}>
        <Heading title={data.labels.tribute} theme={theme} />
        <Text>{data.tribute}</Text>
      </Page>
      <Page size="A5" style={page}>
        <Program data={data} theme={theme} />
      </Page>
      <Page size="A5" style={page}>
        <Thanks data={data} theme={theme} />
      </Page>
    </Document>
  );
}
