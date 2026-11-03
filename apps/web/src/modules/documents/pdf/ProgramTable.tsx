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
            borderBottomColor: theme.muted,
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
