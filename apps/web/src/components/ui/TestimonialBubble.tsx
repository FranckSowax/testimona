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
  index = 0,
}: TestimonialBubbleProps) {
  const memorialHref = `/memorial/${memorialSlug}`;
  const anchorHref = testimonialId
    ? `${memorialHref}#testimonial-${testimonialId}`
    : memorialHref;

  return (
    <li
      className="animate-fade-in-up rounded-lg border border-border bg-white p-5 shadow-sm"
      style={{ animationDelay: `${Math.min(index * 25, 200)}ms` }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={authorAvatarUrl ?? undefined} name={authorName} size="sm" />
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              {authorName}
              {authorRelation && (
                <span className="font-body font-bold italic text-muted-foreground">
                  , {authorRelation}
                </span>
              )}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {publishedOnLabel}{' '}
              <Link
                href={memorialHref as '/'}
                className="font-display font-semibold text-foreground hover:text-primary hover:underline"
              >
                {memorialName}
              </Link>
            </p>
          </div>
        </div>
        <time
          dateTime={createdAt}
          className="tabular shrink-0 text-xs text-muted-foreground"
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
        <p className="line-clamp-4 whitespace-pre-line text-sm italic leading-relaxed text-foreground/90">
          {message}
        </p>
      </div>

      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
        <span className="tabular text-muted-foreground">{footerNote ?? ''}</span>
        <Link
          href={anchorHref as '/'}
          className="font-medium text-primary hover:underline"
        >
          {viewMemorialLabel} →
        </Link>
      </footer>
    </li>
  );
}
