import Link from 'next/link';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { TestimonialForm } from './TestimonialForm';

interface TestimonialRow {
  id: string;
  authorName: string;
  message: string;
  language: string;
  createdAt: string;
}

async function getTestimonials(memorialId: string): Promise<TestimonialRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Testimonial')
    .select('id, authorName, message, language, createdAt')
    .eq('memorialId', memorialId)
    .order('createdAt', { ascending: false })
    .limit(100)
    .returns<TestimonialRow[]>();
  return data ?? [];
}

export async function TestimonialsSection({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const [user, testimonials] = await Promise.all([
    getCurrentUser(),
    getTestimonials(memorialId),
  ]);

  return (
    <section aria-labelledby="testimonials-heading" className="mt-12">
      <h2 id="testimonials-heading" className="text-2xl font-semibold">
        Témoignages
      </h2>

      {testimonials.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Aucun témoignage pour le moment. Soyez le premier à partager un souvenir.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {testimonials.map((t) => (
            <li key={t.id} className="rounded-md border border-border p-4">
              <p className="text-sm font-medium">{t.authorName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(t.createdAt).toLocaleDateString('fr-FR')}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{t.message}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {user ? (
          <TestimonialForm
            memorialId={memorialId}
            slug={slug}
            defaultAuthorName={
              (user.user_metadata as { full_name?: string } | null)?.full_name ?? user.email ?? ''
            }
          />
        ) : (
          <p className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
            <Link href={`/login?next=/memorial/${slug}`} className="font-medium underline">
              Connectez-vous
            </Link>{' '}
            pour publier un témoignage.
          </p>
        )}
      </div>
    </section>
  );
}
