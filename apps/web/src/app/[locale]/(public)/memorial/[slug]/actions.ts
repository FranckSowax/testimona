'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { canManageMemorial } from '@/lib/memorial/access';
import { newTestimonialEmail, sendEmail } from '@/lib/email/resend';

export interface TestimonialActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitTestimonialAction(
  _prev: TestimonialActionState | null,
  formData: FormData,
): Promise<TestimonialActionState> {
  const slug = String(formData.get('slug') ?? '');
  const memorialId = String(formData.get('memorialId') ?? '');
  const authorName = String(formData.get('authorName') ?? '').trim().slice(0, 80);
  const authorFirstname = String(formData.get('authorFirstname') ?? '').trim().slice(0, 60);
  const authorEmail = String(formData.get('authorEmail') ?? '').trim().slice(0, 200);
  const relationship = String(formData.get('authorRelationship') ?? '').trim().slice(0, 60);
  const message = String(formData.get('message') ?? '').trim().slice(0, 2000);
  const language = String(formData.get('language') ?? 'fr');

  // Per-field validation — open to anonymous visitors so we can't rely
  // on the existing TestimonialCreateSchema (which required full auth).
  const fieldErrors: Record<string, string> = {};
  if (!memorialId) fieldErrors.memorialId = 'requis';
  if (!authorName) fieldErrors.authorName = 'Nom requis';
  if (!authorFirstname) fieldErrors.authorFirstname = 'Prénom requis';
  if (message.length < 10) fieldErrors.message = '10 caractères minimum';
  if (authorEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(authorEmail))
    fieldErrors.authorEmail = 'Email invalide';
  if (Object.keys(fieldErrors).length) return { error: 'Validation', fieldErrors };

  const displayName = `${authorFirstname} ${authorName}`.trim();

  // Get current user (may be anonymous). Owner / admin auto-approve;
  // everyone else lands in pending and needs owner moderation.
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  // Décision recette p23 (T7) : un compte est obligatoire pour publier un
  // témoignage (meilleur contrôle du contenu).
  if (!userId) {
    return { error: 'Connecte-toi pour publier un témoignage.' };
  }

  const adminDb = getSupabaseAdminClient();
  const { data: memorial } = await adminDb
    .from('Memorial')
    .select('ownerId')
    .eq('id', memorialId)
    .maybeSingle<{ ownerId: string }>();
  if (!memorial) return { error: 'Mémorial introuvable.' };

  // G3 — owner OR accepted co-owner auto-approves their own testimonial.
  const isOwner = await canManageMemorial(memorialId, userId);
  const status = isOwner ? 'approved' : 'pending';

  const { error } = await adminDb.from('Testimonial').insert({
    id: randomUUID(),
    memorialId,
    authorId: userId,
    authorName: displayName,
    authorFirstname: authorFirstname,
    authorEmail: authorEmail || null,
    relationship: relationship || null,
    message,
    language,
    status,
  });
  if (error) return { error: error.message };

  // Notify the memorial owner so they know a testimonial is waiting for
  // moderation (or just landed publicly when they posted it themselves).
  void notifyOwnerOfNewTestimonial({
    memorialId,
    authorName: displayName,
    message,
    locale: language === 'en' ? 'en' : 'fr',
    actorId: userId ?? '00000000-0000-0000-0000-000000000000',
  });

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Owner moderation — approve / reject pending testimonials
// ---------------------------------------------------------------------------
export async function moderateTestimonialAction(
  _prev: TestimonialActionState | null,
  formData: FormData,
): Promise<TestimonialActionState> {
  const id = String(formData.get('id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!id) return { error: 'id requis.' };
  if (decision !== 'approved' && decision !== 'rejected')
    return { error: 'Décision invalide.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  const adminDb = getSupabaseAdminClient();
  const { data: tx } = await adminDb
    .from('Testimonial')
    .select('memorialId')
    .eq('id', id)
    .maybeSingle<{ memorialId: string }>();
  if (!tx) return { error: 'Témoignage introuvable.' };

  if (!(await canManageMemorial(tx.memorialId, userData.user.id)))
    return { error: 'Modération réservée aux administrateurs.' };

  const { error } = await adminDb
    .from('Testimonial')
    .update({
      status: decision,
      moderatedAt: new Date().toISOString(),
      moderatedById: userData.user.id,
    })
    .eq('id', id);
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

async function notifyOwnerOfNewTestimonial(args: {
  memorialId: string;
  authorName: string;
  message: string;
  locale: 'fr' | 'en';
  actorId: string;
}) {
  try {
    const adminDb = getSupabaseAdminClient();
    const { data: memorial } = await adminDb
      .from('Memorial')
      .select('slug, firstname, lastname, ownerId')
      .eq('id', args.memorialId)
      .maybeSingle<{
        slug: string;
        firstname: string;
        lastname: string;
        ownerId: string;
      }>();
    if (!memorial || memorial.ownerId === args.actorId) return;
    const { data: ownerResp } = await adminDb.auth.admin.getUserById(memorial.ownerId);
    const ownerEmail = ownerResp?.user?.email ?? null;
    if (!ownerEmail) return;
    const ownerMeta = (ownerResp?.user?.user_metadata ?? null) as
      | { nickname?: string; full_name?: string }
      | null;
    const ownerName = ownerMeta?.nickname || ownerMeta?.full_name || null;
    const tpl = newTestimonialEmail({
      to: ownerEmail,
      ownerName,
      memorialName: `${memorial.firstname} ${memorial.lastname}`.trim(),
      memorialSlug: memorial.slug,
      authorName: args.authorName,
      excerpt: args.message,
      locale: args.locale,
    });
    await sendEmail(tpl);
  } catch (err) {
    console.error('[notify-owner] failed', err);
  }
}

// ---------------------------------------------------------------------------
// Like / unlike a testimonial
// ---------------------------------------------------------------------------
export interface ToggleLikeState {
  ok?: boolean;
  liked?: boolean;
  error?: string;
}

export async function toggleLikeAction(
  testimonialId: string,
  slug: string,
): Promise<ToggleLikeState> {
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  const { data: existing } = await supabase
    .from('TestimonialLike')
    .select('userId')
    .eq('testimonialId', testimonialId)
    .eq('userId', userData.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('TestimonialLike')
      .delete()
      .eq('testimonialId', testimonialId)
      .eq('userId', userData.user.id);
    if (error) return { error: error.message };
    if (slug) revalidatePath(`/memorial/${slug}`);
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from('TestimonialLike').insert({
    testimonialId,
    userId: userData.user.id,
  });
  if (error) return { error: error.message };
  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true, liked: true };
}

// ---------------------------------------------------------------------------
// Submit a comment on a testimonial
// ---------------------------------------------------------------------------
export interface CommentActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitCommentAction(
  _prev: CommentActionState | null,
  formData: FormData,
): Promise<CommentActionState> {
  const testimonialId = String(formData.get('testimonialId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const message = String(formData.get('message') ?? '').trim();

  if (!testimonialId) return { error: 'missing testimonialId' };
  if (message.length === 0 || message.length > 2000) {
    return {
      error: 'Validation',
      fieldErrors: { message: 'Message requis (≤2000 caractères).' },
    };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Vous devez être connecté.' };

  const meta = userData.user.user_metadata as
    | { full_name?: string; nickname?: string }
    | null;
  const authorName = meta?.full_name ?? meta?.nickname ?? userData.user.email ?? 'Anonyme';

  const { error } = await supabase.from('TestimonialComment').insert({
    id: randomUUID(),
    testimonialId,
    authorId: userData.user.id,
    authorName,
    message,
  });
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Report a testimonial as inappropriate
// ---------------------------------------------------------------------------
export interface ReportActionState {
  ok?: boolean;
  error?: string;
}

export async function reportTestimonialAction(
  testimonialId: string,
  reason: string,
): Promise<ReportActionState> {
  const trimmed = reason.trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    return { error: 'reason required (≤500 chars)' };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  const { error } = await supabase.from('TestimonialReport').insert({
    id: randomUUID(),
    testimonialId,
    reporterId: userData.user.id,
    reason: trimmed,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Update own testimonial (RLS enforces authorId = auth.uid())
// ---------------------------------------------------------------------------
export interface UpdateTestimonialState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateTestimonialAction(
  _prev: UpdateTestimonialState | null,
  formData: FormData,
): Promise<UpdateTestimonialState> {
  const testimonialId = String(formData.get('testimonialId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const message = String(formData.get('message') ?? '').trim();

  if (!testimonialId) return { error: 'missing testimonialId' };
  if (message.length === 0 || message.length > 4000) {
    return {
      error: 'Validation',
      fieldErrors: { message: 'Message requis (≤4000 caractères).' },
    };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Vous devez être connecté.' };

  const { error } = await supabase
    .from('Testimonial')
    .update({ message })
    .eq('id', testimonialId);
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delete own testimonial (cascades likes/comments via FK)
// ---------------------------------------------------------------------------
export interface DeleteTestimonialState {
  ok?: boolean;
  error?: string;
}

export async function deleteTestimonialAction(
  testimonialId: string,
  slug: string,
): Promise<DeleteTestimonialState> {
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  const { error } = await supabase
    .from('Testimonial')
    .delete()
    .eq('id', testimonialId);
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}
