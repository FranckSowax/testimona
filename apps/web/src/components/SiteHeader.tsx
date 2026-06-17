import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { getUnseenNotificationsCount } from '@/lib/notifications/count';
import { Avatar } from './ui/Avatar';
import { LocaleSwitcher } from './LocaleSwitcher';
import { HeaderCreateMemorialButton } from './HeaderCreateMemorialButton';
import { MobileHamburgerMenu } from './MobileHamburgerMenu';
import { HeaderUserMenu } from './HeaderUserMenu';
import { HeaderSearch } from './HeaderSearch';
import { CreditBadge } from './CreditBadge';

export async function SiteHeader() {
  const [user, t, tHome, tHeader, tNav, tFooter, badge] = await Promise.all([
    getCurrentUser(),
    getTranslations('header'),
    getTranslations('home.sidebar'),
    getTranslations('header'),
    getTranslations('dashboard.nav'),
    getTranslations('footer'),
    getUnseenNotificationsCount(),
  ]);
  const meta = (user?.user_metadata ?? null) as
    | { avatar_url?: string | null; full_name?: string | null; nickname?: string | null }
    | null;
  const avatarUrl = meta?.avatar_url ?? null;
  const displayName = meta?.nickname || meta?.full_name || user?.email || '';
  const menuLabels = {
    menu: tHeader('home'),
    home: tHeader('home'),
    memorials: tNav('memorials'),
    testimonials: tNav('testimonials'),
    notifications: tNav('notifications'),
    settings: tNav('settings'),
    signIn: tHeader('signIn'),
    signUp: tHeader('signUp'),
    signOut: tHeader('signOut'),
    about: tFooter('about'),
    faq: tFooter('faq'),
    terms: tFooter('terms'),
    privacy: tFooter('privacy'),
  };

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:h-20 sm:gap-6 sm:px-8">
        {/* Hamburger menu — mobile/tablet only */}
        <MobileHamburgerMenu
          isLoggedIn={!!user}
          notificationsBadge={badge}
          labels={menuLabels}
        />

        {/* Logo */}
        <Link href="/" aria-label="Accueil Testimona" className="flex shrink-0 items-center">
          <Image
            src="/images/logo-testimona.svg"
            alt="Testimona"
            width={180}
            height={64}
            priority
            className="h-10 w-auto sm:h-14"
          />
        </Link>

        {/* Search input with name autocomplete — hidden on small screens */}
        <HeaderSearch placeholder={t('search')} />

        {/* Spacer for mobile when search is hidden */}
        <div className="ml-auto sm:hidden" aria-hidden="true" />

        {/* Create memorial CTA — hidden on mobile */}
        {user && (
          <div className="hidden sm:block">
            <HeaderCreateMemorialButton label={tHome('createMemorial')} />
          </div>
        )}

        {/* Credit balance — only for logged-in users */}
        {user && (
          <div className="hidden sm:block">
            <CreditBadge />
          </div>
        )}

        {/* Locale switcher — compact on mobile */}
        <LocaleSwitcher />

        {/* Avatar — anonymous → login, logged-in → dropdown menu (incl. log out) */}
        {user ? (
          <HeaderUserMenu
            avatarUrl={avatarUrl}
            displayName={displayName}
            labels={{
              account: displayName || 'Mon compte',
              profile: tNav('settings'),
              memorials: tNav('memorials'),
              notifications: tNav('notifications'),
              settings: tNav('settings'),
              signOut: tHeader('signOut'),
            }}
          />
        ) : (
          <Link href="/login" aria-label="Se connecter" className="shrink-0">
            <Avatar src={avatarUrl} name={displayName || undefined} size="md" />
          </Link>
        )}
      </div>
    </header>
  );
}
