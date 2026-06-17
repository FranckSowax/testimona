import Image from 'next/image';
import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPublicSubmitModal } from './PhotoPublicSubmitModal';
import { PhotoModerateButtons } from './PhotoModerateButtons';
import { PhotoActions, type PhotoComment } from './PhotoActions';

async function getPhotoComments(
  photoIds: string[],
): Promise<Map<string, PhotoComment[]>> {
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
    .select(
      'id, url, caption, position, status, submittedByName, createdAt',
    )
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

export async function PhotosSection({
  memorialId,
  slug,
  isOwner,
}: {
  memorialId: string;
  slug: string;
  isOwner: boolean;
}) {
  const [photos, user, memorial] = await Promise.all([
    getPhotos(memorialId),
    getCurrentUser(),
    getMemorialLite(memorialId),
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
  const memorialName = `${memorial.firstname} ${memorial.lastname}`.trim();

  const approvedIds = visible.filter((p) => p.status === 'approved').map((p) => p.id);
  const [{ counts: likeCounts, liked: likedSet }, commentsByPhoto] = await Promise.all([
    getPhotoLikes(approvedIds, user?.id ?? null),
    getPhotoComments(approvedIds),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const meta = user?.user_metadata as
    | { full_name?: string; nickname?: string }
    | null;
  const prefillName =
    meta?.full_name || meta?.nickname || user?.email?.split('@')[0] || '';

  return (
    <section aria-labelledby="photos-heading" className="space-y-4">
      <h2 id="photos-heading" className="sr-only">
        Photos
      </h2>

      {isOwner && pendingCount > 0 && (
        <p className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground/80">
          <span className="font-display font-bold text-foreground">
            {pendingCount} photo{pendingCount > 1 ? 's' : ''}
          </span>{' '}
          proposée{pendingCount > 1 ? 's' : ''} par des visiteurs, en attente de
          votre validation.
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
        <p className="text-center text-xs text-muted-foreground">
          Vous avez une photo du défunt ? Partagez-la — elle est publiée
          aussitôt ; la famille pourra la retirer si besoin.
        </p>
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
                  isPending
                    ? 'border-accent/40 ring-2 ring-accent/30'
                    : 'border-border',
                ].join(' ')}
              >
                {isPending && (
                  <div className="flex items-center justify-between gap-2 bg-accent/10 px-2 py-1">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wider text-accent">
                      À valider
                    </span>
                    {p.submittedByName && (
                      <span className="truncate text-[10px] text-muted-foreground">
                        par {p.submittedByName}
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
                    <figcaption className="px-2 py-1 text-xs text-muted-foreground">
                      {p.caption}
                    </figcaption>
                  )}
                </figure>
                {isPending && isOwner && (
                  <div className="border-t border-accent/30 bg-accent/5 p-1.5">
                    <PhotoModerateButtons photoId={p.id} slug={slug} />
                  </div>
                )}
                {!isPending && (
                  <div className="border-t border-border">
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
        <p className="mt-2 rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center text-sm italic text-muted-foreground">
          Aucune photo encore. Glisse-dépose ou choisis un fichier ci-dessus
          pour commencer le mémorial.
        </p>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center text-sm italic text-muted-foreground">
          Aucune photo pour le moment. Soyez le premier à en proposer une.
        </p>
      )}

    </section>
  );
}
