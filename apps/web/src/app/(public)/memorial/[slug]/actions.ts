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
