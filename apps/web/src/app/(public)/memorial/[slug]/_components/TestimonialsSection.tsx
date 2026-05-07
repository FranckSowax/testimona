import Image from 'next/image';
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
    <section aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="sr-only">
        Témoignages
      </h2>

      {testimonials.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun témoignage pour le moment. Soyez le premier à partager un souvenir.
        </p>
      ) : (
        <ul className="space-y-6">
          {testimonials.map((t) => (
            <li
              key={t.id}
              className="relative overflow-hidden rounded-lg border-l-4 border-primary bg-surface px-6 py-5 pl-12"
            >
              <Image
                src="/images/quote-open.svg"
                alt=""
                width={28}
                height={28}
                className="absolute left-3 top-3 h-7 w-7 opacity-70"
              />
              <p className="whitespace-pre-line text-base italic leading-relaxed text-foreground">
                {t.message}
              </p>
              <Image
                src="/images/quote-close.svg"
                alt=""
                width={20}
                height={20}
                className="ml-auto mt-2 h-5 w-5 opacity-50"
              />
              <footer className="mt-3 flex items-baseline gap-2 not-italic">
                <span className="font-display text-sm font-semibold text-foreground">
                  {t.authorName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </footer>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
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
