'use server';

import { TestimonialCreateSchema } from '@testimona/shared';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

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

  const raw = {
    memorialId: String(formData.get('memorialId') ?? ''),
    authorName: String(formData.get('authorName') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
    language: String(formData.get('language') ?? 'fr'),
  };

  const parsed = TestimonialCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Validation', fieldErrors };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: 'Vous devez être connecté pour publier un témoignage.' };
  }

  const { error } = await supabase.from('Testimonial').insert({
    memorialId: parsed.data.memorialId,
    authorId: userData.user.id,
    authorName: parsed.data.authorName,
    message: parsed.data.message,
    language: parsed.data.language,
  });

  if (error) {
    return { error: error.message };
  }

  if (slug) {
    revalidatePath(`/memorial/${slug}`);
  }
  return { ok: true };
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
