import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';

export async function SiteFooter() {
  const [t, user] = await Promise.all([getTranslations('footer'), getCurrentUser()]);
  const year = new Date().getFullYear();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://testimona.com';
  const shareText = encodeURIComponent(t('tagline'));
  const shareUrl = encodeURIComponent(siteUrl);
  const twitterShare = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  const emailShare = `mailto:?subject=${shareText}&body=${shareUrl}`;

  return (
    <footer className="border-border text-muted-foreground mt-auto border-t bg-white text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <nav
            aria-label={t('about')}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
          >
            {!user && (
              <Link
                href="/login"
                className="font-display text-accent font-bold transition-opacity hover:opacity-80"
              >
                {t('signIn')}
              </Link>
            )}
            <Link
              href="/about"
              className="font-display hover:text-foreground font-medium transition-colors"
            >
              {t('about')}
            </Link>
            <Link
              href="/about"
              className="font-display hover:text-foreground font-medium transition-colors"
            >
              {t('faq')}
            </Link>
            <Link
              href="/legal/terms"
              className="font-display hover:text-foreground font-medium transition-colors"
            >
              {t('terms')}
            </Link>
            <Link
              href="/legal/privacy"
              className="font-display hover:text-foreground font-medium transition-colors"
            >
              {t('privacy')}
            </Link>
            <Link
              href="/legal/mentions"
              className="font-display hover:text-foreground font-medium transition-colors"
            >
              {t('cookies')}
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-display text-foreground/80 font-medium">
              {t('shareToAFriend')}
            </span>
            <span aria-hidden="true" className="text-muted-foreground/60">
              ›
            </span>
            <a
              href={twitterShare}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('socialTwitter')}
              className="border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
              </svg>
            </a>
            <a
              href={facebookShare}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('socialFacebook')}
              className="border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
              </svg>
            </a>
            <a
              href={emailShare}
              aria-label={t('socialEmail')}
              className="border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2Z" />
                <path d="m22 6-10 7L2 6" />
              </svg>
            </a>
          </div>
        </div>

        <div className="border-border flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular text-muted-foreground">
            {t('copyright')} © {year}
          </p>
          <Link
            href="/about"
            className="font-display hover:text-foreground font-medium transition-colors"
          >
            {t('contactUs')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
