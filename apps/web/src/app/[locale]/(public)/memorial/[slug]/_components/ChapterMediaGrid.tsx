export interface ChapterMedia {
  url: string;
  type: 'image' | 'video';
}

/**
 * Presentational grid of a biography chapter's photos/videos. Shared by the
 * public BiographySection and the owner-facing chapters manager.
 */
export function ChapterMediaGrid({ media }: { media: ChapterMedia[] }) {
  if (!media || media.length === 0) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {media.map((m, i) =>
        m.type === 'video' ? (
          <video
            key={`${m.url}-${i}`}
            src={m.url}
            controls
            playsInline
            className="aspect-square w-full rounded-md object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${m.url}-${i}`}
            src={m.url}
            alt=""
            loading="lazy"
            className="aspect-square w-full rounded-md object-cover"
          />
        ),
      )}
    </div>
  );
}
