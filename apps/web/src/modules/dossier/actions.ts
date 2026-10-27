'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import { getPerson } from './repo';
import * as service from './service';
import type { DossierError } from './service';

export interface FormState {
  error?: DossierError;
  fieldErrors?: Record<string, string>;
}

export interface InviteState extends FormState {
  url?: string;
  emailSent?: boolean;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

export async function createDossierAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const res = await service.createDossier({
    entryPoint: field(formData, 'entryPoint'),
    firstName: field(formData, 'firstName'),
    lastName: field(formData, 'lastName'),
    countryCode: field(formData, 'countryCode'),
    city: field(formData, 'city'),
    relationship: field(formData, 'relationship'),
  });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect(localizedPath(`/dossier/${res.data.id}`, await getLocale()));
}

export async function createInvitationAction(
  _prev: InviteState | null,
  formData: FormData,
): Promise<InviteState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const person = await getPerson(dossierId);
  const meta = (user.user_metadata ?? {}) as { nickname?: string; full_name?: string };
  const res = await service.createInvitation(
    { dossierId, role: field(formData, 'role'), email: field(formData, 'email') },
    {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
      locale: await getLocale(),
      inviterName: meta.nickname || meta.full_name || null,
      personName: person ? `${person.firstName} ${person.lastName}` : '',
    },
  );
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath('/[locale]/dossier/[id]/membres', 'page');
  return { url: res.data.url, emailSent: res.data.emailSent };
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  await service.revokeInvitation(field(formData, 'dossierId'), field(formData, 'invitationId'));
  revalidatePath('/[locale]/dossier/[id]/membres', 'page');
}

export async function acceptInvitationAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const res = await service.acceptInvitation(field(formData, 'token'));
  if (!res.ok) return { error: res.error };
  redirect(localizedPath(`/dossier/${res.data.dossierId}`, await getLocale()));
}
