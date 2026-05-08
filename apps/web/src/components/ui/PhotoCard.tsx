import Image from 'next/image';
import type { ReactNode } from 'react';

interface PhotoCardProps {
  src: string;
  alt: string;
  authorName: string;
  date: string;
  isVideo?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  className?: string;
}

/**
 * V2 PhotoCard : image cover ratio 16/10, video → overlay play, footer "Posted by ... on ...".
 */
export function PhotoCard({
  src,
  alt,
  authorName,
  date,
  isVideo = false,
  onClick,
  trailing,
  className,
}: PhotoCardProps) {
  return (
    <article
      className={[
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-[var(--shadow-card)]',
        'transition-shadow hover:shadow-[var(--shadow-elevated)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={isVideo ? `Play video: ${alt}` : `View photo: ${alt}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-[var(--motion-ease-out)] group-hover:scale-[1.03]"
        />
        {isVideo && (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="ml-1 text-foreground"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        )}
      </button>
      <footer className="flex items-center justify-between gap-2 p-3 text-xs">
        <div className="min-w-0 flex-1">
          <p className="truncate">
            <span className="text-muted-foreground">Posted by </span>
            <span className="font-display font-semibold text-foreground">{authorName}</span>
          </p>
          <p className="truncate italic text-muted-foreground tabular">{date}</p>
        </div>
        {trailing}
      </footer>
    </article>
  );
}
