'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { canManageMemorial } from '@/lib/memorial/access';
import { coOwnerInviteEmail, sendEmail } from '@/lib/email/resend';
import { revalidateMemorialPages } from '@/lib/revalidate';

export interface MemberActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface MemberRow {
  id: string;
  memorialId: string;
  userId: string | null;
  invitedEmail: string | null;
  status: string;
}

/**
 * G3 — Owner invites a co-owner by email. Creates a pending MemorialMember
 * and emails the invitee. Matching to a user account happens when the invitee
 * accepts (by email or, if already linked, by userId).
 */
export async function inviteCoOwnerAction(
  _prev: MemberActionState | null,
  formData: FormData,
): Promise<MemberActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 200);

  if (!memorialId) return { error: 'memorialId requis.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'Validation', fieldErrors: { email: 'Email invalide.' } };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };
  if (!(await canManageMemorial(memorialId, userData.user.id))) {
    return { error: 'Action réservée aux administrateurs du mémorial.' };
  }

  const adminDb = getSupabaseAdminClient();

  // Don't re-invite an existing pending/accepted member with the same email.
  const { data: dupes } = await adminDb
    .from('MemorialMember')
    .select('id, status')
    .eq('memorialId', memorialId)
    .ilike('invitedEmail', email)
    .returns<{ id: string; status: string }[]>();
  if ((dupes ?? []).some((d) => d.status === 'pending' || d.status === 'accepted')) {
    return { error: 'Cette personne est déjà invitée ou administratrice.' };
  }

  const { data: memorial } = await adminDb
    .from('Memorial')
    .select('slug, firstname, lastname')
    .eq('id', memorialId)
    .maybeSingle<{ slug: string; firstname: string; lastname: string }>();
  if (!memorial) return { error: 'Mémorial introuvable.' };

  const inviterMeta = (userData.user.user_metadata ?? null) as
    | { nickname?: string; full_name?: string }
    | null;
  const inviterName =
    inviterMeta?.nickname || inviterMeta?.full_name || userData.user.email || null;

  const { error } = await adminDb.from('MemorialMember').insert({
    memorialId,
    invitedEmail: email,
    invitedById: userData.user.id,
    role: 'admin',
    status: 'pending',
  });
  if (error) return { error: error.message };

  // Fire-and-forget invite email (swallowed on failure).
  void sendEmail(
    coOwnerInviteEmail({
      to: email,
      inviterName,
      memorialName: `${memorial.firstname} ${memorial.lastname}`.trim(),
      memorialSlug: memorial.slug,
      locale: 'fr',
    }),
  );

  if (slug) revalidateMemorialPages(slug);
  revalidatePath('/dashboard/admin-requests');
  return { ok: true };
}

/**
 * G3 — Invitee accepts or rejects an invitation. The invite must belong to the
 * current user (matched by linked userId or by email).
 */
export async function respondToMemorialInviteAction(
  _prev: MemberActionState | null,
  formData: FormData,
): Promise<MemberActionState> {
  const memberId = String(formData.get('memberId') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  if (!memberId) return { error: 'memberId requis.' };
  if (decision !== 'accepted' && decision !== 'rejected') {
    return { error: 'Décision invalide.' };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };
  const myEmail = (userData.user.email ?? '').toLowerCase();

  const adminDb = getSupabaseAdminClient();
  const { data: member } = await adminDb
    .from('MemorialMember')
    .select('id, memorialId, userId, invitedEmail, status')
    .eq('id', memberId)
    .maybeSingle<MemberRow>();
  if (!member) return { error: 'Invitation introuvable.' };

  const mine =
    member.userId === userData.user.id ||
    (!!member.invitedEmail && member.invitedEmail.toLowerCase() === myEmail);
  if (!mine) return { error: 'Cette invitation ne vous concerne pas.' };
  if (member.status !== 'pending') return { error: 'Invitation déjà traitée.' };

  const { error } = await adminDb
    .from('MemorialMember')
    .update({
      status: decision,
      userId: userData.user.id,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', memberId);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/admin-requests');
  return { ok: true };
}

/**
 * G3 — Owner removes a co-owner (or a pending invite).
 */
export async function removeMemberAction(
  _prev: MemberActionState | null,
  formData: FormData,
): Promise<MemberActionState> {
  const memberId = String(formData.get('memberId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!memberId) return { error: 'memberId requis.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  const adminDb = getSupabaseAdminClient();
  const { data: member } = await adminDb
    .from('MemorialMember')
    .select('id, memorialId')
    .eq('id', memberId)
    .maybeSingle<{ id: string; memorialId: string }>();
  if (!member) return { error: 'Membre introuvable.' };

  if (!(await canManageMemorial(member.memorialId, userData.user.id))) {
    return { error: 'Action réservée aux administrateurs du mémorial.' };
  }

  const { error } = await adminDb.from('MemorialMember').delete().eq('id', memberId);
  if (error) return { error: error.message };

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}
