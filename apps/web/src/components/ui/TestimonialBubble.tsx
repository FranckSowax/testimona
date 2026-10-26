import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/ui/Avatar';

interface TestimonialBubbleProps {
  authorName: string;
  /** Family relationship shown after the name (PDF p9/p11/p22). */
  authorRelation?: string | null;
  authorAvatarUrl?: string | null;
  memorialName: string;
  memorialSlug: string;
  message: string;
  createdAt: string;
  /** Anchor on the memorial page (e.g. testimonial id). */
  testimonialId?: string;
  /** Optional footer text on the left (e.g. likes/comments stats). */
  footerNote?: string;
  publishedOnLabel: string;
  viewMemorialLabel: string;
  /** Animation delay index for staggered lists. */
  index?: number;
}

/**
 * Canonical testimonial bubble — the "Home · Recent testimonials" visual,
 * shared so the home feed, My Testimonials and other surfaces stay in sync
 * (PDF p11/p22 "utiliser le format de la bulle témoignage de Home afin
 * d'harmoniser le visuel").
 */
export function TestimonialBubble({
  authorName,
  authorRelation,
  authorAvatarUrl,
  memorialName,
  memorialSlug,
  message,
  createdAt,
  testimonialId,
  footerNote,
  publishedOnLabel,
  viewMemorialLabel,
}: TestimonialBubbleProps) {
  const memorialHref = `/memorial/${memorialSlug}`;
  const anchorHref = testimonialId ? `${memorialHref}#testimonial-${testimonialId}` : memorialHref;

  return (
    <li
      className="border-border rounded-lg border bg-white p-5 shadow-sm"
      // Entrance is handled by the <Reveal> wrapper (GSAP) where this bubble
      // is listed, so no CSS entrance animation here.
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={authorAvatarUrl ?? undefined} name={authorName} size="sm" />
          <div>
            <p className="font-display text-foreground text-sm font-semibold">
              {authorName}
              {authorRelation && (
                <span className="font-body text-muted-foreground font-bold italic">
                  , {authorRelation}
                </span>
              )}
            </p>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              {publishedOnLabel}{' '}
              <Link
                href={memorialHref as '/'}
                className="font-display text-foreground hover:text-primary font-semibold hover:underline"
              >
                {memorialName}
              </Link>
            </p>
          </div>
        </div>
        <time
          dateTime={createdAt}
          className="tabular text-muted-foreground shrink-0 text-xs"
          suppressHydrationWarning
        >
          {new Date(createdAt).toLocaleDateString('fr-FR')}
        </time>
      </header>

      <div className="relative mt-3 pl-9">
        <Image
          src="/images/quote-open.svg"
          alt=""
          width={22}
          height={22}
          className="absolute left-0 top-0 h-5 w-5 opacity-60"
        />
        <p className="text-foreground/90 line-clamp-4 whitespace-pre-line text-sm italic leading-relaxed">
          {message}
        </p>
      </div>

      <footer className="border-border mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs">
        <span className="tabular text-muted-foreground">{footerNote ?? ''}</span>
        <Link href={anchorHref as '/'} className="text-primary font-medium hover:underline">
          {viewMemorialLabel} →
        </Link>
      </footer>
    </li>
  );
}
