import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { LocaleSwitcher } from './LocaleSwitcher';
import { Avatar } from './ui/Avatar';
import { Button, buttonClasses } from './ui/Button';

export async function SiteHeader() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations('header')]);
  const meta = (user?.user_metadata ?? null) as
    | { avatar_url?: string | null; full_name?: string | null; nickname?: string | null }
    | null;
  const avatarUrl = meta?.avatar_url ?? null;
  const displayName = meta?.nickname || meta?.full_name || user?.email || '';

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" aria-label="Accueil Testimona" className="flex shrink-0 items-center">
          <Image
            src="/images/logo-testimona.svg"
            alt="Testimona"
            width={160}
            height={56}
            priority
            className="h-12 w-auto"
          />
        </Link>

        <nav
          aria-label="Navigation principale"
          className="flex items-center gap-1 text-sm sm:gap-2"
        >
          <Link
            href="/about"
            className="hidden rounded-md px-3 py-2 text-foreground/80 transition-colors hover:text-primary sm:inline-block"
          >
            {t('about')}
          </Link>
          <Link
            href="/search"
            className="rounded-md px-3 py-2 text-foreground/80 transition-colors hover:text-primary"
          >
            {t('search')}
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden rounded-md px-3 py-2 text-foreground/80 transition-colors hover:text-primary sm:inline-block"
              >
                {t('myMemorials')}
              </Link>
              <form action="/auth/signout" method="post" className="ml-1">
                <Button type="submit" variant="primary" styleVariant="outline" size="sm">
                  {t('signOut')}
                </Button>
              </form>
              <Link href="/dashboard/profile" aria-label={displayName} className="ml-1 shrink-0">
                <Avatar src={avatarUrl} name={displayName} size="sm" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`ml-1 ${buttonClasses({
                  variant: 'secondary',
                  styleVariant: 'outline',
                  size: 'sm',
                })}`}
              >
                {t('signIn')}
              </Link>
              <Link
                href="/signup"
                className={`ml-1 ${buttonClasses({ variant: 'primary', size: 'sm' })}`}
              >
                {t('signUp')}
              </Link>
            </>
          )}

          <span className="ml-2 hidden border-l border-border pl-3 sm:inline-flex">
            <LocaleSwitcher />
          </span>
        </nav>
      </div>
    </header>
  );
}
