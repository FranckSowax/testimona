'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { ClosingError, ClosingFormState } from './service';

/** Écrans qui affichent l'état de clôture. */
const PAGES = ['', '/cotisations', '/cotisations/postes', '/cotisations/bilan'];

async function done(
  dossierId: string,
  res: { ok: true } | { ok: false; error: ClosingError },
): Promise<ClosingFormState> {
  if (!res.ok) return { error: res.error };
  const locale = await getLocale();
  for (const page of PAGES) revalidatePath(localizedPath(`/dossier/${dossierId}${page}`, locale));
  return { ok: true };
}

/** Clôture les cotisations du dossier. */
export async function closeLedgerAction(
  _prev: ClosingFormState | null,
  formData: FormData,
): Promise<ClosingFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = String(formData.get('dossierId') ?? '');
  return done(dossierId, await service.closeLedger({ dossierId }));
}

/** Rouvre les cotisations du dossier. */
export async function reopenLedgerAction(
  _prev: ClosingFormState | null,
  formData: FormData,
): Promise<ClosingFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = String(formData.get('dossierId') ?? '');
  return done(dossierId, await service.reopenLedger({ dossierId }));
}
