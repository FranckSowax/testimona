import Link from 'next/link';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { unsplashAvatarFor } from '@/lib/avatars';
import { TestimonialModalShell } from './TestimonialModalShell';
import { TestimonialItem, type TestimonialComment } from './TestimonialItem';

interface TestimonialRow {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  language: string;
  createdAt: string;
}

interface LikeRow {
  testimonialId: string;
  userId: string;
}

interface CommentRow extends TestimonialComment {
  testimonialId: string;
}

async function getTestimonials(memorialId: string): Promise<TestimonialRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Testimonial')
    .select('id, authorId, authorName, message, language, createdAt')
    .eq('memorialId', memorialId)
    .order('createdAt', { ascending: false })
    .limit(100)
    .returns<TestimonialRow[]>();
  return data ?? [];
}

async function getLikes(testimonialIds: string[]): Promise<LikeRow[]> {
  if (testimonialIds.length === 0) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('TestimonialLike')
    .select('testimonialId, userId')
    .in('testimonialId', testimonialIds)
    .returns<LikeRow[]>();
  return data ?? [];
}

async function getComments(testimonialIds: string[]): Promise<CommentRow[]> {
  if (testimonialIds.length === 0) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('TestimonialComment')
    .select('id, testimonialId, authorName, message, createdAt')
    .in('testimonialId', testimonialIds)
    .order('createdAt', { ascending: true })
    .returns<CommentRow[]>();
  return data ?? [];
}

export async function TestimonialsSection({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const [user, testimonials, memorialMeta] = await Promise.all([
    getCurrentUser(),
    getTestimonials(memorialId),
    getMemorialMeta(memorialId),
  ]);
  const ids = testimonials.map((t) => t.id);
  const [likes, comments] = await Promise.all([getLikes(ids), getComments(ids)]);

  const likesByTestimonial = new Map<string, number>();
  const userLikeSet = new Set<string>();
  for (const like of likes) {
    likesByTestimonial.set(
      like.testimonialId,
      (likesByTestimonial.get(like.testimonialId) ?? 0) + 1,
    );
    if (user && like.userId === user.id) userLikeSet.add(like.testimonialId);
  }

  const commentsByTestimonial = new Map<string, TestimonialComment[]>();
  for (const c of comments) {
    const list = commentsByTestimonial.get(c.testimonialId) ?? [];
    list.push({
      id: c.id,
      authorName: c.authorName,
      message: c.message,
      createdAt: c.createdAt,
    });
    commentsByTestimonial.set(c.testimonialId, list);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const memorialShareUrl = `${siteUrl}/memorial/${slug}`;

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
            <TestimonialItem
              key={t.id}
              testimonialId={t.id}
              slug={slug}
              authorName={t.authorName}
              message={t.message}
              createdAt={t.createdAt}
              likesCount={likesByTestimonial.get(t.id) ?? 0}
              hasLiked={userLikeSet.has(t.id)}
              comments={commentsByTestimonial.get(t.id) ?? []}
              isLogged={!!user}
              isOwner={!!user && user.id === t.authorId}
              shareUrl={`${memorialShareUrl}#testimonial-${t.id}`}
            />
          ))}
        </ul>
      )}

      <div className="mt-8 flex justify-center">
        {user ? (
          <TestimonialModalShell
            memorialId={memorialId}
            slug={slug}
            memorialName={memorialMeta.name}
            memorialCoverUrl={memorialMeta.coverUrl}
            authorName={
              (user.user_metadata as { full_name?: string; nickname?: string } | null)?.nickname ||
              (user.user_metadata as { full_name?: string } | null)?.full_name ||
              user.email?.split('@')[0] ||
              'Anonyme'
            }
            authorAvatarUrl={
              (user.user_metadata as { avatar_url?: string | null } | null)?.avatar_url ||
              unsplashAvatarFor(user.email ?? user.id)
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

interface MemorialMetaLite {
  firstname: string;
  lastname: string;
}

async function getMemorialMeta(
  memorialId: string,
): Promise<{ name: string; coverUrl: string | null }> {
  const supabase = await getSupabaseServer();
  const [{ data: m }, { data: p }] = await Promise.all([
    supabase
      .from('Memorial')
      .select('firstname, lastname')
      .eq('id', memorialId)
      .maybeSingle<MemorialMetaLite>(),
    supabase
      .from('Photo')
      .select('url')
      .eq('memorialId', memorialId)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle<{ url: string }>(),
  ]);
  const name = m ? `${m.firstname} ${m.lastname}`.trim() : 'Memorial';
  return { name, coverUrl: p?.url ?? null };
}
