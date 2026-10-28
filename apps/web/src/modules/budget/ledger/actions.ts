'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { LedgerError } from './service';

export interface LedgerFormState {
  ok?: boolean;
  error?: LedgerError;
  fieldErrors?: Record<string, string>;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

const entryFields = (formData: FormData) => ({
  dossierId: field(formData, 'dossierId'),
  idempotencyKey: field(formData, 'idempotencyKey'),
  partyName: field(formData, 'partyName'),
  amount: field(formData, 'amount'),
  note: field(formData, 'note'),
  occurredOn: field(formData, 'occurredOn'),
});

const EXPENSE_SAVED = new Set<LedgerError | undefined>(['receipt_unlinked', 'receipt_unavailable']);

async function done(
  dossierId: string,
  res: { ok: boolean; error?: LedgerError; fieldErrors?: Record<string, string> },
): Promise<LedgerFormState> {
  // WHY: « receipt_unlinked » et « receipt_unavailable » : la dépense est enregistrée, seul le
  // reçu manque ; les pages doivent l'afficher. L'écran garde la saisie pour retenter le
  // rattachement (un renvoi rejoue la clé et ne crée pas de seconde dépense).
  if (!res.ok && !EXPENSE_SAVED.has(res.error)) {
    return { error: res.error, fieldErrors: res.fieldErrors };
  }
  const locale = await getLocale();
  revalidatePath(localizedPath(`/dossier/${dossierId}/cotisations`, locale));
  revalidatePath(localizedPath(`/dossier/${dossierId}/cotisations/postes`, locale));
  revalidatePath(localizedPath(`/dossier/${dossierId}`, locale));
  return res.ok ? { ok: true } : { error: res.error };
}

/** Ajoute une ligne au registre selon `kind` (promesse, cotisation reçue ou dépense). */
export async function saveEntryAction(
  _prev: LedgerFormState | null,
  formData: FormData,
): Promise<LedgerFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const base = entryFields(formData);
  const kind = field(formData, 'kind');
  const method = field(formData, 'method');
  const res =
    kind === 'pledge'
      ? await service.recordPledge(base, user.id)
      : kind === 'receipt'
        ? await service.recordReceipt({
            ...base,
            method,
            memberId: field(formData, 'memberId'),
            pledgeId: field(formData, 'pledgeId'),
          })
        : kind === 'expense'
          ? await service.recordExpense({
              ...base,
              method,
              budgetLineId: field(formData, 'budgetLineId'),
              receiptId: field(formData, 'receiptId'),
            })
          : ({ ok: false, error: 'validation' } as const);
  return done(base.dossierId, res);
}

/** Annule une ligne du registre. */
export async function reverseEntryAction(
  _prev: LedgerFormState | null,
  formData: FormData,
): Promise<LedgerFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const res = await service.reverseEntry({
    dossierId,
    idempotencyKey: field(formData, 'idempotencyKey'),
    entryId: field(formData, 'entryId'),
  });
  return done(dossierId, res);
}

/** Change la visibilité des montants individuels. */
export async function setVisibilityAction(
  _prev: LedgerFormState | null,
  formData: FormData,
): Promise<LedgerFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const res = await service.setVisibility({ dossierId, visibility: field(formData, 'visibility') });
  return done(dossierId, res);
}
