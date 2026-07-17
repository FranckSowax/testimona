import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { canManageMemorial } from '@/lib/memorial/access';
import { unsplashAvatarFor } from '@/lib/avatars';
import { Reveal } from '@/components/motion/Reveal';
import { TestimonialItem, type TestimonialComment } from './TestimonialItem';
import { TestimonialPublicForm } from './TestimonialPublicForm';
import { TestimonialModerateButtons } from './TestimonialModerateButtons';

interface TestimonialRow {
  id: string;
  authorId: string | null;
  authorName: string;
  authorFirstname: string | null;
  relationship: string | null;
  message: string;
  language: string;
  status: string;
  createdAt: string;
}

interface LikeRow {
  testimonialId: string;
  userId: string;
}

interface CommentRow extends TestimonialComment {
  testimonialId: string;
}

interface MemorialMetaLite {
  firstname: string;
  lastname: string;
  ownerId: string;
}

/**
 * Use the admin client server-side to fetch testimonials — RLS would
 * otherwise force us into multiple queries for public vs owner views.
 * We apply the visibility filter in code so the owner sees pending +
 * approved, public visitors only see approved.
 */
async function getTestimonials(memorialId: string): Promise<TestimonialRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Testimonial')
    .select(
      'id, authorId, authorName, authorFirstname, relationship, message, language, status, createdAt',
    )
    .eq('memorialId', memorialId)
    .in('status', ['pending', 'approved'])
    .order('createdAt', { ascending: false })
    .limit(150)
    .returns<TestimonialRow[]>();
  return data ?? [];
}

async function getMemorialMeta(memorialId: string): Promise<MemorialMetaLite> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Memorial')
    .select('firstname, lastname, ownerId')
    .eq('id', memorialId)
    .maybeSingle<MemorialMetaLite>();
  return (
    data ?? { firstname: '', lastname: '', ownerId: '' }
  );
}

async function getLikes(testimonialIds: string[]): Promise<LikeRow[]> {
  if (testimonialIds.length === 0) return [];
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('TestimonialLike')
    .select('testimonialId, userId')
    .in('testimonialId', testimonialIds)
    .returns<LikeRow[]>();
  return data ?? [];
}

async function getComments(testimonialIds: string[]): Promise<CommentRow[]> {
  if (testimonialIds.length === 0) return [];
  const supabase = getSupabaseAdminClient();
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
  const [user, testimonials, meta] = await Promise.all([
    getCurrentUser(),
    getTestimonials(memorialId),
    getMemorialMeta(memorialId),
  ]);
  const isOwner = await canManageMemorial(memorialId, user?.id);
  const memorialName = `${meta.firstname} ${meta.lastname}`.trim();

  // Public visitors see only approved entries. Owner sees pending too,
  // sorted with pending first so they hit the moderation queue.
  const visible = testimonials.filter(
    (t) => t.status === 'approved' || (isOwner && t.status === 'pending'),
  );
  visible.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const approvedIds = testimonials
    .filter((t) => t.status === 'approved')
    .map((t) => t.id);
  const [likes, comments] = await Promise.all([
    getLikes(approvedIds),
    getComments(approvedIds),
  ]);

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

  const pendingCount = testimonials.filter((t) => t.status === 'pending').length;
  const meta_user = user?.user_metadata as
    | { full_name?: string; nickname?: string; avatar_url?: string }
    | null;
  const userFirstname = meta_user?.nickname?.split(' ')[0] ?? '';
  const userLastname =
    meta_user?.full_name?.split(' ').slice(1).join(' ') ?? '';
  // Current user's identity for the reply composer avatar (removes the "?"
  // placeholder shown when no name/avatar is passed).
  const currentUserName =
    meta_user?.full_name || meta_user?.nickname || user?.email?.split('@')[0] || undefined;
  const currentUserAvatarUrl = meta_user?.avatar_url ?? null;

  return (
    <section aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="sr-only">
        Témoignages
      </h2>

      {isOwner && pendingCount > 0 && (
        <p className="mb-4 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground/80">
          <span className="font-display font-bold text-foreground">
            {pendingCount} témoignage{pendingCount > 1 ? 's' : ''}
          </span>{' '}
          en attente de votre validation.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun témoignage pour le moment. Soyez le premier à partager un
          souvenir.
        </p>
      ) : (
        <Reveal as="ul" className="space-y-6">
          {visible.map((t) => {
            const isPending = t.status === 'pending';
            return (
              <li key={t.id} className="space-y-2">
                {isPending && (
                  <div className="flex items-center justify-between gap-3 rounded-t-lg border border-b-0 border-accent/40 bg-accent/10 px-3 py-1.5">
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-accent">
                      À valider
                    </span>
                    <TestimonialModerateButtons
                      testimonialId={t.id}
                      slug={slug}
                    />
                  </div>
                )}
                <div
                  className={isPending ? 'opacity-90 ring-2 ring-accent/30' : ''}
                >
                  <TestimonialItem
                    testimonialId={t.id}
                    slug={slug}
                    memorialName={memorialName}
                    authorName={t.authorName}
                    authorRelation={t.relationship ?? undefined}
                    authorAvatarUrl={unsplashAvatarFor(t.authorName)}
                    message={t.message}
                    createdAt={t.createdAt}
                    likesCount={likesByTestimonial.get(t.id) ?? 0}
                    hasLiked={userLikeSet.has(t.id)}
                    comments={commentsByTestimonial.get(t.id) ?? []}
                    isLogged={!!user}
                    isOwner={!!user && user.id === t.authorId}
                    shareUrl={`${memorialShareUrl}#testimonial-${t.id}`}
                    currentUserName={currentUserName}
                    currentUserAvatarUrl={currentUserAvatarUrl}
                  />
                </div>
              </li>
            );
          })}
        </Reveal>
      )}

      <TestimonialPublicForm
        memorialId={memorialId}
        slug={slug}
        memorialName={memorialName}
        isLoggedIn={!!user}
        prefill={
          user
            ? {
                firstname: userFirstname || undefined,
                lastname: userLastname || undefined,
                email: user.email ?? undefined,
              }
            : undefined
        }
      />
    </section>
  );
}
