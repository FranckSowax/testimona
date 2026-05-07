import Image from 'next/image';
import { getSupabaseServer } from '@/lib/supabase/server';
import { PhotoUploader } from './PhotoUploader';

interface PhotoRow {
  id: string;
  url: string;
  caption: string | null;
  position: number;
}

async function getPhotos(memorialId: string): Promise<PhotoRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Photo')
    .select('id, url, caption, position')
    .eq('memorialId', memorialId)
    .order('position', { ascending: true })
    .limit(60)
    .returns<PhotoRow[]>();
  return data ?? [];
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
  const photos = await getPhotos(memorialId);
  if (photos.length === 0 && !isOwner) return null;

  return (
    <section aria-labelledby="photos-heading">
      <h2 id="photos-heading" className="sr-only">
        Photos
      </h2>
      {isOwner && <PhotoUploader memorialId={memorialId} slug={slug} />}
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-md border border-border">
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
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucune photo pour le moment.
        </p>
      )}
    </section>
  );
}
