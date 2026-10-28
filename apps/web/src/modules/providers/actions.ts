'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { ProvidersError } from './service';

export interface ProviderFormState {
  ok?: boolean;
  error?: ProvidersError;
  fieldErrors?: Record<string, string>;
}

const LIST = '/admin/providers';

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');
const checked = (formData: FormData, name: string) => formData.get(name) === 'on';

const providerFields = (formData: FormData) => ({
  categoryKey: field(formData, 'categoryKey'),
  name: field(formData, 'name'),
  city: field(formData, 'city'),
  district: field(formData, 'district'),
  whatsapp: field(formData, 'whatsapp'),
  priceNote: field(formData, 'priceNote'),
  isExample: checked(formData, 'isExample'),
  verified: checked(formData, 'verified'),
  active: checked(formData, 'active'),
});

/**
 * Crée un prestataire puis revient à la liste.
 * WHY: le service vérifie le rôle administrateur ; la RLS le vérifie encore en base.
 */
export async function createProviderAction(
  _prev: ProviderFormState | null,
  formData: FormData,
): Promise<ProviderFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const res = await service.createProvider(providerFields(formData));
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  const list = localizedPath(LIST, await getLocale());
  revalidatePath(list);
  redirect(list);
}

/** Modifie un prestataire et reste sur l'écran. */
export async function updateProviderAction(
  _prev: ProviderFormState | null,
  formData: FormData,
): Promise<ProviderFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const providerId = field(formData, 'providerId');
  const res = await service.updateProvider({ ...providerFields(formData), providerId });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  const locale = await getLocale();
  revalidatePath(localizedPath(LIST, locale));
  revalidatePath(localizedPath(`${LIST}/${providerId}`, locale));
  return { ok: true };
}
