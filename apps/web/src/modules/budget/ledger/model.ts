import type { EntryKind, EntryMethod } from './schema';

/** Ligne du registre telle que lue en base (ses colonnes utiles à l'écran). */
export interface LedgerEntry {
  id: string;
  kind: EntryKind;
  amount: number;
  method: EntryMethod | null;
  partyName: string;
  memberId: string | null;
  pledgeId: string | null;
  budgetLineId: string | null;
  note: string;
  occurredOn: string;
  reversesId: string | null;
  reversesKind: Exclude<EntryKind, 'reversal'> | null;
  createdAt: string;
}

/**
 * Ligne prête à afficher : annulée ou non ; pour une promesse, montant déjà versé (`paid`) et
 * soldée (`fulfilled`) quand les versements liés atteignent le montant promis.
 */
export interface EntryView extends LedgerEntry {
  reversed: boolean;
  paid: number;
  fulfilled: boolean;
}

/** Totaux du registre : reçu, promis encore attendu, dépensé (montants en XAF). */
export interface LedgerTotals {
  received: number;
  pledgedOpen: number;
  spent: number;
}

/**
 * Lignes visibles, du plus récent au plus ancien, avec leur état.
 * WHY: l'état se déduit des autres lignes (annulations, cotisations liées) ; en mode restreint,
 * un membre ne voit que ses lignes, ce qui suffit pour ses propres promesses.
 *
 * @example
 * entryViews(entries).filter((v) => !v.reversed);
 */
export function entryViews(entries: readonly LedgerEntry[]): EntryView[] {
  const reversedIds = new Set<string>(
    entries.flatMap((e) => (e.kind === 'reversal' && e.reversesId ? [e.reversesId] : [])),
  );
  // WHY: une promesse se paie parfois en plusieurs fois ; on cumule les versements actifs liés.
  const paidByPledge = new Map<string, number>();
  for (const e of entries) {
    if (e.kind === 'receipt' && e.pledgeId && !reversedIds.has(e.id)) {
      paidByPledge.set(e.pledgeId, (paidByPledge.get(e.pledgeId) ?? 0) + e.amount);
    }
  }
  return entries
    .map((e) => {
      const paid = e.kind === 'pledge' ? (paidByPledge.get(e.id) ?? 0) : 0;
      return {
        ...e,
        reversed: reversedIds.has(e.id),
        paid,
        fulfilled: e.kind === 'pledge' && paid >= e.amount,
      };
    })
    .sort(
      (a, b) =>
        b.occurredOn.localeCompare(a.occurredOn) ||
        b.createdAt.localeCompare(a.createdAt) ||
        b.id.localeCompare(a.id),
    );
}

/** Promesses encore attendues (ni annulées, ni soldées). */
export function openPledges(views: readonly EntryView[]): EntryView[] {
  return views.filter((v) => v.kind === 'pledge' && !v.reversed && !v.fulfilled);
}

/** Ce qu'il reste à verser sur une promesse, jamais négatif. */
export function pledgeRemaining(view: EntryView): number {
  return Math.max(0, view.amount - view.paid);
}

/**
 * Une ligne active qui n'est pas elle-même une annulation peut être annulée.
 * Annuler une promesse déjà en partie versée est permis : les cotisations reçues restent comptées
 * (l'argent a été encaissé), seule la part restante de la promesse est retirée.
 */
export function canReverse(view: EntryView): boolean {
  return view.kind !== 'reversal' && !view.reversed;
}

/** Argent disponible : reçu moins dépensé. */
export function balance(totals: LedgerTotals): number {
  return totals.received - totals.spent;
}

/** Ce qu'il reste à réunir pour atteindre le budget, ou null sans budget. */
export function remaining(budget: number | null, totals: LedgerTotals): number | null {
  return budget === null ? null : Math.max(0, budget - totals.received);
}

/**
 * Signe affiché d'un mouvement : entrée d'argent « + », sortie « − », promesse sans signe.
 * Une annulation prend le signe inverse de la ligne visée.
 *
 * @example
 * entrySign({ kind: 'reversal', reversesKind: 'expense' }); // « + »
 */
export function entrySign(entry: Pick<LedgerEntry, 'kind' | 'reversesKind'>): '+' | '−' | '' {
  const kind = entry.kind === 'reversal' ? entry.reversesKind : entry.kind;
  const flip = entry.kind === 'reversal';
  if (kind === 'receipt') return flip ? '−' : '+';
  if (kind === 'expense') return flip ? '+' : '−';
  return '';
}
