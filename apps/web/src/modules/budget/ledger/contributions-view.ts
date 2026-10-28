import type { MemberSummary } from '@/modules/dossier/repo';
import { canWrite, hasRole } from '@/modules/dossier/roles';
import type { DossierRole } from '@/modules/dossier/schema';
import type { BudgetLine } from '../lines/model';
import { openPledges, pledgeRemaining, type EntryView } from './model';
import type { LineOption, MemberOption, PledgeOption } from './ui/EntryForm';

/** Ce que la page des cotisations affiche et propose selon le rôle de la personne. */
export interface ContributionsView {
  canPledge: boolean;
  canManage: boolean;
  isOwner: boolean;
  memberOptions: MemberOption[];
  pledgeOptions: PledgeOption[];
  lineOptions: LineOption[];
}

interface Input {
  role: DossierRole | null;
  views: readonly EntryView[];
  members: readonly Pick<MemberSummary, 'userId' | 'displayName'>[];
  lines: readonly Pick<BudgetLine, 'id' | 'label'>[];
  /** Cotisations clôturées : plus aucune saisie (la base refuse aussi, TL009). */
  closed?: boolean;
}

/**
 * Le trésorier et au-delà saisissent les cotisations reçues, les dépenses et les annulations.
 * La page s'en sert aussi pour ne lire la liste des membres que lorsqu'elle sera utile.
 *
 * @example
 * if (canManageLedger(role)) members = await listMembers(id);
 */
export function canManageLedger(role: DossierRole | null): boolean {
  return hasRole(role, 'treasurer');
}

/**
 * Décisions de la page des cotisations qui dépendent du rôle.
 * WHY: seuls les trésoriers et au-delà saisissent une cotisation reçue ; on n'envoie pas au
 * navigateur des autres la liste des membres et des promesses.
 *
 * @example
 * const view = contributionsView({ role: 'treasurer', views, members, lines });
 * view.pledgeOptions; // [{ id, label: 'Oncle Paul', amount: 6_000 }]
 * contributionsView({ role: 'owner', views, members, lines, closed: true }).canManage; // false
 */
export function contributionsView({
  role,
  views,
  members,
  lines,
  closed = false,
}: Input): ContributionsView {
  // WHY: une fois les cotisations clôturées, ni promesse, ni cotisation, ni dépense, ni
  // annulation : les formulaires et les boutons disparaissent, et rien n'est envoyé au navigateur.
  const canManage = !closed && canManageLedger(role);
  return {
    canPledge: !closed && canWrite(role),
    canManage,
    isOwner: role === 'owner',
    memberOptions: canManage ? members.map((m) => ({ id: m.userId, name: m.displayName })) : [],
    // WHY: calculé sur les lignes visibles (500 au plus, limite de listEntries) ; la base
    // revérifie de toute façon le solde de la promesse visée (TL002 → pledge_unavailable).
    pledgeOptions: canManage
      ? openPledges(views).map((p) => ({
          id: p.id,
          label: p.partyName,
          amount: pledgeRemaining(p),
        }))
      : [],
    // WHY: seul qui saisit une dépense choisit son poste ; les autres n'en reçoivent pas la liste.
    lineOptions: canManage ? lines.map((l) => ({ id: l.id, label: l.label })) : [],
  };
}
