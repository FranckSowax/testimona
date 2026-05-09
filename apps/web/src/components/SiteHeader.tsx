import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { Avatar } from './ui/Avatar';

export async function SiteHeader() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations('header')]);
  const meta = (user?.user_metadata ?? null) as
    | { avatar_url?: string | null; full_name?: string | null; nickname?: string | null }
    | null;
  const avatarUrl = meta?.avatar_url ?? null;
  const displayName = meta?.nickname || meta?.full_name || user?.email || '';

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] bg-white">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-6 px-4 sm:px-8">
        {/* Logo */}
        <Link href="/" aria-label="Accueil Testimona" className="flex shrink-0 items-center">
          <Image
            src="/images/logo-testimona.svg"
            alt="Testimona"
            width={180}
            height={64}
            priority
            className="h-14 w-auto"
          />
        </Link>

        {/* Search input — V2 minimal nav */}
        <form
          method="get"
          action="/search"
          className="ml-auto flex max-w-md flex-1 sm:max-w-sm md:max-w-md"
          role="search"
        >
          <label htmlFor="header-search" className="sr-only">
            {t('search')}
          </label>
          <span className="flex w-full items-center gap-3 rounded-full border border-transparent bg-[var(--color-bg-active-gray)] px-5 transition-[background-color,border-color,box-shadow] duration-150 focus-within:border-primary focus-within:bg-white focus-within:shadow-[var(--shadow-glow-primary)]">
            <input
              id="header-search"
              type="search"
              name="q"
              placeholder={t('search')}
              className="h-10 min-w-0 flex-1 bg-transparent font-display text-sm font-medium text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
              autoComplete="off"
            />
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
        </form>

        {/* Avatar — anonymous → login, logged-in → profile */}
        <Link
          href={user ? '/dashboard/profile' : '/login'}
          aria-label={user ? displayName || 'Mon compte' : 'Se connecter'}
          className="shrink-0"
        >
          <Avatar src={avatarUrl} name={displayName || undefined} size="md" />
        </Link>
      </div>
    </header>
  );
}
