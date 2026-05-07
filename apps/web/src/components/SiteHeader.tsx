import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { LocaleSwitcher } from './LocaleSwitcher';

export async function SiteHeader() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations('header')]);

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" aria-label="Accueil Testimona" className="flex items-center">
          <Image
            src="/images/logo-testimona.svg"
            alt="Testimona"
            width={180}
            height={64}
            priority
            className="h-14 w-auto"
          />
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-3 text-sm">
          <Link
            href="/about"
            className="hidden rounded-md px-3 py-2 text-foreground/80 hover:text-foreground sm:inline-block"
          >
            {t('about')}
          </Link>
          <Link
            href="/search"
            className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground"
          >
            {t('search')}
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground"
              >
                {t('myMemorials')}
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md border-2 border-foreground/80 px-3 py-1.5 font-medium text-foreground opacity-80 transition-opacity hover:opacity-100"
                >
                  {t('signOut')}
                </button>
              </form>
              <Image
                src="/images/avatar-connected.svg"
                alt=""
                width={36}
                height={36}
                className="ml-1 h-9 w-9"
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border-2 border-foreground/80 px-3 py-1.5 font-medium text-foreground opacity-80 transition-opacity hover:opacity-100"
              >
                {t('signIn')}
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
              >
                {t('signUp')}
              </Link>
              <Image
                src="/images/avatar.svg"
                alt=""
                width={36}
                height={36}
                className="ml-1 h-9 w-9"
              />
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
