import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { Avatar } from './ui/Avatar';
import { buttonClasses } from './ui/Button';

export async function SiteHeader() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations('header')]);
  const meta = (user?.user_metadata ?? null) as
    | { avatar_url?: string | null; full_name?: string | null; nickname?: string | null }
    | null;
  const avatarUrl = meta?.avatar_url ?? null;
  const displayName = meta?.nickname || meta?.full_name || user?.email || '';

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          aria-label="Accueil Testimona"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/images/logo-testimona.svg"
            alt="Testimona"
            width={150}
            height={48}
            priority
            className="h-10 w-auto"
          />
        </Link>

        {/* Search input — V2 inline */}
        <form
          method="get"
          action="/search"
          className="hidden flex-1 sm:flex sm:max-w-md"
          role="search"
        >
          <label htmlFor="header-search" className="sr-only">
            {t('search')}
          </label>
          <span className="flex w-full items-center gap-2 rounded-md border border-border bg-muted px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:bg-white focus-within:shadow-[var(--shadow-glow-primary)]">
            <input
              id="header-search"
              type="search"
              name="q"
              placeholder={t('search')}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
              className="text-muted-foreground"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard/profile"
                aria-label={displayName}
                className="shrink-0"
              >
                <Avatar src={avatarUrl} name={displayName} size="sm" />
              </Link>

              {/* "Write a testimonial" — V2 rose pleine CTA */}
              <Link
                href="/dashboard/new"
                className={buttonClasses({ variant: 'accent', size: 'md' })}
              >
                {t('writeTestimonial')}
              </Link>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
                >
                  {t('signOut')}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonClasses({
                  variant: 'secondary',
                  styleVariant: 'outline',
                  size: 'sm',
                })}
              >
                {t('signIn')}
              </Link>
              <Link
                href="/signup"
                className={buttonClasses({ variant: 'accent', size: 'sm' })}
              >
                {t('signUp')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
