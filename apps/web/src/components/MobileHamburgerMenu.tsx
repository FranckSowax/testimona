'use client';

import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';

interface NavItem {
  href: string;
  label: string;
  iconPath: string;
  badge?: boolean;
}

const ICONS = {
  home: 'M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V10',
  memorials:
    'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm3 4h10M7 13h10M7 17h6',
  testimonials: 'M21 12a8 8 0 0 1-11.4 7.3L3 21l1.7-5.6A8 8 0 1 1 21 12Z',
  notifications:
    'M15 17h5l-1.4-1.4A6 6 0 0 0 18 11V8a6 6 0 0 0-12 0v3a6 6 0 0 0-.6 4.6L4 17h5m6 0a3 3 0 1 1-6 0',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a7.5 7.5 0 0 0-.2-1.7l2-1.6-2-3.5-2.4 1a7.6 7.6 0 0 0-3-1.7L13.5 2h-4l-.4 2.5a7.6 7.6 0 0 0-3 1.7l-2.4-1-2 3.5 2 1.6a7.5 7.5 0 0 0 0 3.4l-2 1.6 2 3.5 2.4-1a7.6 7.6 0 0 0 3 1.7l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 3-1.7l2.4 1 2-3.5-2-1.6c.1-.6.2-1.1.2-1.7Z',
  signIn: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  signUp:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6',
  about: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8v.01M11 12h1v4h1',
  signOut: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
} as const;

interface Labels {
  menu: string;
  home: string;
  memorials: string;
  testimonials: string;
  notifications: string;
  settings: string;
  signIn: string;
  signUp: string;
  signOut: string;
  about: string;
  faq: string;
  terms: string;
  privacy: string;
}

interface Props {
  isLoggedIn: boolean;
  notificationsBadge: number;
  labels: Labels;
}

export function MobileHamburgerMenu({ isLoggedIn, notificationsBadge, labels }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const primaryItems: NavItem[] = isLoggedIn
    ? [
        { href: '/', label: labels.home, iconPath: ICONS.home },
        { href: '/dashboard', label: labels.memorials, iconPath: ICONS.memorials },
        {
          href: '/dashboard/testimonials',
          label: labels.testimonials,
          iconPath: ICONS.testimonials,
        },
        {
          href: '/dashboard/notifications',
          label: labels.notifications,
          iconPath: ICONS.notifications,
          badge: notificationsBadge > 0,
        },
        { href: '/dashboard/profile', label: labels.settings, iconPath: ICONS.settings },
      ]
    : [
        { href: '/', label: labels.home, iconPath: ICONS.home },
        { href: '/login', label: labels.signIn, iconPath: ICONS.signIn },
        { href: '/signup', label: labels.signUp, iconPath: ICONS.signUp },
      ];

  const secondaryItems: NavItem[] = [
    { href: '/about', label: labels.about, iconPath: ICONS.about },
    { href: '/about', label: labels.faq, iconPath: ICONS.about },
    { href: '/legal/terms', label: labels.terms, iconPath: ICONS.about },
    { href: '/legal/privacy', label: labels.privacy, iconPath: ICONS.about },
  ];

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={labels.menu}
        aria-expanded={open}
        aria-controls="mobile-hamburger-drawer"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="relative inline-flex">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {isLoggedIn && notificationsBadge > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-white"
            />
          )}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.menu}
          id="mobile-hamburger-drawer"
          className="fixed inset-0 z-[var(--z-modal)]"
        >
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <aside className="animate-slide-in-left relative z-10 flex h-[100dvh] w-[300px] max-w-[85vw] flex-col gap-2 bg-white p-5 shadow-[var(--shadow-overlay)]">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-bold text-secondary">{labels.menu}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <nav aria-label={labels.menu} className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {primaryItems.map((item) => {
                const active =
                  item.href === '/' || item.href === '/dashboard'
                    ? pathname === item.href
                    : pathname?.startsWith(item.href) ?? false;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href as '/'}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={[
                      'flex min-h-12 items-center gap-3 rounded-md px-2 py-3 font-display text-base font-bold',
                      'transition-colors duration-150',
                      active ? 'text-primary' : 'text-secondary hover:text-primary',
                    ].join(' ')}
                  >
                    <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={item.iconPath} />
                      </svg>
                      {item.badge && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-white"
                        />
                      )}
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}

              <hr className="my-2 border-border" />

              {secondaryItems.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href as '/'}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center px-2 py-2 font-display text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}

              {isLoggedIn && (
                <>
                  <hr className="my-2 border-border" />
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-3 font-display text-base font-bold text-destructive transition-colors hover:bg-[var(--color-bg-hover-pink)]"
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={ICONS.signOut} />
                      </svg>
                      <span>{labels.signOut}</span>
                    </button>
                  </form>
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
