import { Text, View } from '@react-pdf/renderer';
import type { ProgramItem } from '@/journey/ceremony';
import type { DocumentLabels } from '../model';
import type { DocumentTheme } from '../theme';

interface ProgramTableProps {
  program: ProgramItem[];
  labels: DocumentLabels;
  theme: DocumentTheme;
}

/** Largeurs des colonnes : l'heure est fixe, le reste se partage la ligne. */
const COLUMNS = {
  time: { width: 40 },
  moment: { flex: 3 },
  place: { flex: 2.4 },
  lead: { flex: 2 },
} as const;

const CELL_GAP = 8;

/** Hauteur de l'en-tête et d'une ligne de texte (10,5 pt × 1,5), en points. */
const HEADER_HEIGHT = 24;
const LINE_HEIGHT = 15.75;
const ROW_PADDING = 10;
/**
 * Caractères par ligne de chaque colonne, comptés bas pour que l'estimation reste prudente.
 * WHY: une estimation trop haute ne coûte qu'un saut de page anticipé ; trop basse, elle
 * laisserait l'en-tête seul en bas de page.
 */
const CHARS_PER_LINE = { moment: 20, place: 16, lead: 13 } as const;

/**
 * Place à garder sous le début du tableau pour y loger l'en-tête et la première ligne :
 * sinon le tableau commence à la page suivante.
 * WHY: l'en-tête est `fixed`, et react-pdf ne déplace jamais un élément `fixed` ; la première
 * ligne, insécable, partirait seule à la page suivante en laissant l'en-tête orphelin.
 *
 * @example
 * <View minPresenceAhead={programTablePresence(data.program)} />
 */
export function programTablePresence(program: readonly ProgramItem[]): number {
  const first = program[0];
  if (!first) return HEADER_HEIGHT;
  const lines = Math.max(
    1,
    ...(['moment', 'place', 'lead'] as const).map((column) =>
      Math.ceil((first[column]?.length ?? 0) / CHARS_PER_LINE[column]),
    ),
  );
  return HEADER_HEIGHT + lines * LINE_HEIGHT + ROW_PADDING;
}

/**
 * Tableau du programme du livret : heure, moment, lieu, responsable.
 * WHY: l'en-tête est `fixed` pour être répété en haut de chaque page quand un long programme
 * (jusqu'à 40 moments) déborde, et chaque ligne est insécable (`wrap={false}`) pour ne jamais
 * séparer un moment de son heure.
 *
 * @example
 * <ProgramTable program={data.program} labels={data.labels} theme={theme} />
 */
export function ProgramTable({ program, labels, theme }: ProgramTableProps) {
  const header = {
    fontSize: 8,
    fontWeight: 'bold',
    color: theme.muted,
    letterSpacing: 0.6,
  } as const;
  return (
    <View>
      <View
        fixed
        style={{
          flexDirection: 'row',
          gap: CELL_GAP,
          paddingBottom: 4,
          borderBottomWidth: 1,
          borderBottomColor: theme.rule,
        }}
      >
        <Text style={[COLUMNS.time, header]}>{labels.time.toUpperCase()}</Text>
        <Text style={[COLUMNS.moment, header]}>{labels.moment.toUpperCase()}</Text>
        <Text style={[COLUMNS.place, header]}>{labels.place.toUpperCase()}</Text>
        <Text style={[COLUMNS.lead, header]}>{labels.lead.toUpperCase()}</Text>
      </View>
      {program.map((item, index) => (
        <View
          // WHY: deux moments peuvent partager heure et intitulé ; la position les distingue.
          key={`${index}-${item.time}`}
          wrap={false}
          style={{
            flexDirection: 'row',
            gap: CELL_GAP,
            paddingVertical: 5,
            borderBottomWidth: 0.5,
            borderBottomColor: theme.frame,
          }}
        >
          <Text style={[COLUMNS.time, { fontWeight: 'bold' }]}>{item.time}</Text>
          <Text style={COLUMNS.moment}>{item.moment}</Text>
          <Text style={[COLUMNS.place, { color: theme.muted }]}>{item.place ?? ''}</Text>
          <Text style={[COLUMNS.lead, { color: theme.muted }]}>{item.lead ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}
