import { hasRole } from '@/modules/dossier/roles';
import type { DossierRole } from '@/modules/dossier/schema';
import { balance, remaining, type EntryView, type LedgerTotals } from '../ledger/model';
import type { Visibility } from '../ledger/schema';
import type { ReferenceBudget } from '../lines/model';

/** Traducteur de l'espace `closing.share`. */
export type Translate = (key: string, values?: Record<string, string>) => string;

/** Ce que le texte de synthèse peut dire : des totaux, jamais une ligne individuelle. */
export interface SummaryInput {
  /** Prénom et nom de la personne décédée, ou null. */
  name: string | null;
  budget: ReferenceBudget | null;
  totals: LedgerTotals;
  /** Date de clôture déjà formatée, ou null si les cotisations sont ouvertes. */
  closedOn: string | null;
}

const LEDGER_TIME_ZONE = 'Africa/Libreville';

/**
 * Texte de bilan à partager (WhatsApp, SMS, e-mail).
 * WHY: construit à partir des totaux, visibles de tout membre (`ledger_totals`) : aucun nom de
 * contributeur, aucun montant individuel, aucune dépense par poste.
 *
 * @example
 * summaryText({ name: 'Jean Ndong', budget, totals, closedOn: '28 octobre 2026' }, t, money);
 */
export function summaryText(
  input: SummaryInput,
  t: Translate,
  money: (amount: number) => string,
): string {
  const { budget, totals } = input;
  const rest = remaining(budget?.amount ?? null, totals);
  const lines = [
    input.name ? t('heading', { name: input.name }) : t('headingNoName'),
    '',
    ...(budget
      ? [
          t(budget.source === 'retained' ? 'budgetRetained' : 'budget', {
            amount: money(budget.amount),
          }),
        ]
      : []),
    t('received', { amount: money(totals.received) }),
    t('pledgedOpen', { amount: money(totals.pledgedOpen) }),
    t('spent', { amount: money(totals.spent) }),
    t('balance', { amount: money(balance(totals)) }),
    ...(rest === null ? [] : [t('remaining', { amount: money(rest) })]),
    '',
    input.closedOn ? t('closed', { date: input.closedOn }) : t('provisional'),
  ];
  return lines.join('\n');
}

/**
 * Cotisations reçues actives parmi les lignes visibles (la RLS a déjà appliqué la visibilité).
 *
 * @example
 * receivedContributions(entryViews(entries)); // [{ kind: 'receipt', reversed: false, … }]
 */
export function receivedContributions(views: readonly EntryView[]): EntryView[] {
  return views.filter((v) => v.kind === 'receipt' && !v.reversed);
}

/**
 * La personne voit-elle les montants de tous les cotisants ?
 * WHY: même règle que la RLS du registre (politique `ledger_entry_select`, migration
 * `20261027000600_ledger.sql`) ; sert seulement au titre de la liste.
 */
export function seesAllAmounts(role: DossierRole | null, visibility: Visibility): boolean {
  if (role === null) return false;
  return hasRole(role, 'treasurer') || visibility === 'members';
}

/**
 * Date de clôture lisible, dans le fuseau du registre.
 *
 * @example
 * formatClosedOn('2026-10-28T09:00:00Z', 'fr'); // « 28 octobre 2026 »
 * formatClosedOn('pas une date', 'fr'); // « »
 */
export function formatClosedOn(iso: string, locale: string): string {
  const date = new Date(iso);
  // WHY: `Intl.DateTimeFormat#format` lève sur une date invalide ; un texte vide vaut mieux
  // qu'un écran de bilan en erreur.
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'long',
    timeZone: LEDGER_TIME_ZONE,
  }).format(date);
}
