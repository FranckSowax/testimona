import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPublicSubmitModal } from './PhotoPublicSubmitModal';
import { PhotoModerateButtons } from './PhotoModerateButtons';
import { PhotoActions, type PhotoComment } from './PhotoActions';
import { SetCoverButton } from './SetCoverButton';
import { PhotoDeleteButton } from './PhotoDeleteButton';

async function getPhotoComments(photoIds: string[]): Promise<Map<string, PhotoComment[]>> {
  const map = new Map<string, PhotoComment[]>();
  if (photoIds.length === 0) return map;
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('PhotoComment')
    .select('id, photoId, authorName, message, createdAt')
    .in('photoId', photoIds)
    .order('createdAt', { ascending: true })
    .returns<(PhotoComment & { photoId: string })[]>();
  for (const c of data ?? []) {
    const list = map.get(c.photoId) ?? [];
    list.push({ id: c.id, authorName: c.authorName, message: c.message, createdAt: c.createdAt });
    map.set(c.photoId, list);
  }
  return map;
}

async function getPhotoLikes(
  photoIds: string[],
  userId: string | null,
): Promise<{ counts: Map<string, number>; liked: Set<string> }> {
  const counts = new Map<string, number>();
  const liked = new Set<string>();
  if (photoIds.length === 0) return { counts, liked };
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('PhotoLike')
    .select('photoId, userId')
    .in('photoId', photoIds)
    .returns<{ photoId: string; userId: string }[]>();
  for (const row of data ?? []) {
    counts.set(row.photoId, (counts.get(row.photoId) ?? 0) + 1);
    if (userId && row.userId === userId) liked.add(row.photoId);
  }
  return { counts, liked };
}

interface PhotoRow {
  id: string;
  url: string;
  caption: string | null;
  position: number;
  status: string;
  submittedByName: string | null;
  createdAt: string;
}

interface MemorialLite {
  ownerId: string;
  firstname: string;
  lastname: string;
}

/**
 * Use the admin client server-side to fetch photos — public visitors
 * only ever see approved entries (filtered in code below); the owner
 * sees both pending and approved with pending floated to the top of
 * the grid for moderation.
 */
async function getPhotos(memorialId: string): Promise<PhotoRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Photo')
    .select('id, url, caption, position, status, submittedByName, createdAt')
    .eq('memorialId', memorialId)
    .in('status', ['pending', 'approved'])
    .order('position', { ascending: true })
    .limit(120)
    .returns<PhotoRow[]>();
  return data ?? [];
}

async function getMemorialLite(memorialId: string): Promise<MemorialLite> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Memorial')
    .select('ownerId, firstname, lastname')
    .eq('id', memorialId)
    .maybeSingle<MemorialLite>();
  return data ?? { ownerId: '', firstname: '', lastname: '' };
}

/**
 * Fetched separately (and tolerantly) from the memorial: if migration v18
 * hasn't run yet the column doesn't exist, supabase-js returns an error and we
 * simply treat the cover as "not explicitly set" rather than breaking the grid.
 */
async function getCoverPhotoId(memorialId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Memorial')
    .select('coverPhotoId')
    .eq('id', memorialId)
    .maybeSingle<{ coverPhotoId: string | null }>();
  return data?.coverPhotoId ?? null;
}

export async function PhotosSection({
  memorialId,
  slug,
  isOwner,
}: {
  memorialId: string;
  slug: string;
  isOwner: boolean;
}) {
  const [photos, user, memorial, coverPhotoId] = await Promise.all([
    getPhotos(memorialId),
    getCurrentUser(),
    getMemorialLite(memorialId),
    getCoverPhotoId(memorialId),
  ]);

  // Public sees approved only; owner sees pending too.
  const visible = photos.filter(
    (p) => p.status === 'approved' || (isOwner && p.status === 'pending'),
  );
  visible.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return a.position - b.position;
  });

  const pendingCount = photos.filter((p) => p.status === 'pending').length;
  const t = await getTranslations('memorial.photosSection');
  const memorialName = `${memorial.firstname} ${memorial.lastname}`.trim();

  // Which photo is the cover: explicit coverPhotoId, else the first approved
  // photo by position (matches getCoverPhotoUrl on the memorial page).
  const firstApprovedId = photos.find((p) => p.status === 'approved')?.id ?? null;
  const effectiveCoverId = coverPhotoId ?? firstApprovedId;

  const approvedIds = visible.filter((p) => p.status === 'approved').map((p) => p.id);
  const [{ counts: likeCounts, liked: likedSet }, commentsByPhoto] = await Promise.all([
    getPhotoLikes(approvedIds, user?.id ?? null),
    getPhotoComments(approvedIds),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const meta = user?.user_metadata as { full_name?: string; nickname?: string } | null;
  const prefillName = meta?.full_name || meta?.nickname || user?.email?.split('@')[0] || '';

  return (
    <section aria-labelledby="photos-heading" className="space-y-4">
      <h2 id="photos-heading" className="sr-only">
        {t('heading')}
      </h2>

      {isOwner && pendingCount > 0 && (
        <p className="border-accent/30 bg-accent/5 text-foreground/80 rounded-md border px-3 py-2 text-sm">
          <span className="font-display text-foreground font-bold">
            {t('pendingCount', { count: pendingCount })}
          </span>{' '}
          {t('pendingSuggested', { count: pendingCount })}
        </p>
      )}

      {isOwner && <PhotoUploader memorialId={memorialId} slug={slug} />}

      {/* PDF p26 — proposer/ajouter une photo doit être en haut. */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <PhotoPublicSubmitModal
          memorialId={memorialId}
          slug={slug}
          memorialName={memorialName}
          prefillName={prefillName || undefined}
          prefillEmail={user?.email ?? undefined}
        />
        <p className="text-muted-foreground text-center text-xs">{t('shareHint')}</p>
      </div>

      {visible.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((p) => {
            const isPending = p.status === 'pending';
            return (
              <li
                key={p.id}
                className={[
                  'overflow-hidden rounded-md border',
                  isPending ? 'border-accent/40 ring-accent/30 ring-2' : 'border-border',
                ].join(' ')}
              >
                {isPending && (
                  <div className="bg-accent/10 flex items-center justify-between gap-2 px-2 py-1">
                    <span className="font-display text-accent text-[10px] font-bold uppercase tracking-wider">
                      {t('toValidate')}
                    </span>
                    {p.submittedByName && (
                      <span className="text-muted-foreground truncate text-[10px]">
                        {t('submittedBy', { name: p.submittedByName })}
                      </span>
                    )}
                  </div>
                )}
                <figure>
                  <div className="relative aspect-square">
                    <Image
                      src={p.url}
                      alt={p.caption ?? ''}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  {p.caption && (
                    <figcaption className="text-muted-foreground px-2 py-1 text-xs">
                      {p.caption}
                    </figcaption>
                  )}
                </figure>
                {isPending && isOwner && (
                  <div className="border-accent/30 bg-accent/5 border-t p-1.5">
                    <PhotoModerateButtons photoId={p.id} slug={slug} />
                  </div>
                )}
                {!isPending && (
                  <div className="border-border border-t">
                    {isOwner && (
                      <div className="divide-border/60 border-border/60 grid grid-cols-2 divide-x border-b">
                        <SetCoverButton
                          memorialId={memorialId}
                          photoId={p.id}
                          slug={slug}
                          isCover={p.id === effectiveCoverId}
                        />
                        <PhotoDeleteButton photoId={p.id} slug={slug} />
                      </div>
                    )}
                    <PhotoActions
                      photoId={p.id}
                      slug={slug}
                      shareUrl={`${siteUrl}/memorial/${slug}#photo-${p.id}`}
                      initialLikes={likeCounts.get(p.id) ?? 0}
                      initiallyLiked={likedSet.has(p.id)}
                      initialComments={commentsByPhoto.get(p.id) ?? []}
                      isLoggedIn={!!user}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : isOwner ? (
        <p className="border-border bg-surface text-muted-foreground mt-2 rounded-md border border-dashed px-4 py-6 text-center text-sm italic">
          {t('emptyOwner')}
        </p>
      ) : (
        <p className="border-border bg-surface text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm italic">
          {t('emptyPublic')}
        </p>
      )}
    </section>
  );
}
