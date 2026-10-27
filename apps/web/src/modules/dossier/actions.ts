'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getSiteUrl } from '@/lib/site-url';
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
  /** Vrai quand une adresse a été saisie : on doit alors dire si l'e-mail est parti. */
  emailRequested?: boolean;
  emailSent?: boolean;
}

const UuidSchema = z.string().uuid();

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
  if (!UuidSchema.safeParse(dossierId).success) return { error: 'validation' };
  const person = await getPerson(dossierId);
  const locale = await getLocale();
  const meta = (user.user_metadata ?? {}) as { nickname?: string; full_name?: string };
  const res = await service.createInvitation(
    { dossierId, role: field(formData, 'role'), email: field(formData, 'email') },
    {
      siteUrl: getSiteUrl(),
      locale,
      inviterName: meta.nickname || meta.full_name || null,
      personName: person ? `${person.firstName} ${person.lastName}` : '',
    },
  );
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath(localizedPath(`/dossier/${dossierId}/membres`, locale));
  return {
    url: res.data.url,
    emailRequested: field(formData, 'email').trim() !== '',
    emailSent: res.data.emailSent,
  };
}

export async function revokeInvitationAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const res = await service.revokeInvitation(dossierId, field(formData, 'invitationId'));
  if (!res.ok) return { error: res.error };
  revalidatePath(localizedPath(`/dossier/${dossierId}/membres`, await getLocale()));
  return {};
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
