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

/** Marge au-dessus du tableau dans le livret, en points (comptée par `programTablePresence`). */
export const PROGRAM_TABLE_MARGIN = 18;
/** En-tête : 8 pt × 1,5 de texte, 4 pt de marge intérieure, 1 pt de filet (17 pt), arrondi. */
const HEADER_HEIGHT = 20;
/** Ligne de texte du tableau : 10,5 pt × 1,5. */
const LINE_HEIGHT = 15.75;
/** Marges intérieures (2 × 5 pt) et filet (0,5 pt) d'une ligne du tableau. */
const ROW_CHROME = 10.5;
/** Caractères par ligne de chaque colonne, en moyenne pour PT Sans 10,5 pt. */
const CHARS_PER_LINE = { moment: 20, place: 16, lead: 13 } as const;
/**
 * Marge appliquée au nombre de lignes estimé.
 * WHY: les valeurs de `CHARS_PER_LINE` sont des moyennes ; un texte aux mots longs passe à la
 * ligne plus tôt. Surestimer ne coûte qu'un saut de page anticipé ; sous-estimer laisserait
 * l'en-tête seul en bas de page.
 */
const LINES_SAFETY = 1.3;

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
  // WHY: le nœud de présence précède l'enveloppe du tableau ; sa marge haute compte donc aussi.
  const table = PROGRAM_TABLE_MARGIN + HEADER_HEIGHT;
  const first = program[0];
  if (!first) return table;
  const lines = Math.max(
    1,
    ...(['moment', 'place', 'lead'] as const).map((column) =>
      Math.ceil((first[column]?.length ?? 0) / CHARS_PER_LINE[column]),
    ),
  );
  return table + Math.ceil(lines * LINES_SAFETY) * LINE_HEIGHT + ROW_CHROME;
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
