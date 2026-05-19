'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient, requireAdmin } from '@/lib/supabase/admin';

export interface ModerationActionState {
  ok?: boolean;
  error?: string;
}

export async function deleteTestimonialAction(
  _prev: ModerationActionState | null,
  formData: FormData,
): Promise<ModerationActionState> {
  await requireAdmin();
  const testimonialId = String(formData.get('testimonialId') ?? '').trim();
  if (!testimonialId) return { error: 'testimonialId requis.' };

  const supabase = getSupabaseAdminClient();
  // cascade children first
  await supabase.from('TestimonialReport').delete().eq('testimonialId', testimonialId);
  await supabase.from('TestimonialComment').delete().eq('testimonialId', testimonialId);
  await supabase.from('TestimonialLike').delete().eq('testimonialId', testimonialId);
  const { error } = await supabase.from('Testimonial').delete().eq('id', testimonialId);
  if (error) return { error: error.message };

  revalidatePath('/admin/testimonials');
  revalidatePath('/admin/reports');
  return { ok: true };
}

export async function dismissReportAction(
  _prev: ModerationActionState | null,
  formData: FormData,
): Promise<ModerationActionState> {
  await requireAdmin();
  const reportId = String(formData.get('reportId') ?? '').trim();
  if (!reportId) return { error: 'reportId requis.' };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('TestimonialReport').delete().eq('id', reportId);
  if (error) return { error: error.message };

  revalidatePath('/admin/reports');
  return { ok: true };
}

export async function dismissAllReportsForTestimonialAction(
  _prev: ModerationActionState | null,
  formData: FormData,
): Promise<ModerationActionState> {
  await requireAdmin();
  const testimonialId = String(formData.get('testimonialId') ?? '').trim();
  if (!testimonialId) return { error: 'testimonialId requis.' };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('TestimonialReport')
    .delete()
    .eq('testimonialId', testimonialId);
  if (error) return { error: error.message };

  revalidatePath('/admin/reports');
  revalidatePath('/admin/testimonials');
  return { ok: true };
}
