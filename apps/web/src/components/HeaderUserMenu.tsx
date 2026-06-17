'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { Avatar } from './ui/Avatar';

interface Labels {
  account: string;
  profile: string;
  memorials: string;
  notifications: string;
  settings: string;
  signOut: string;
}

interface Props {
  avatarUrl: string | null;
  displayName: string;
  labels: Labels;
}

/**
 * Avatar dropdown for logged-in users (desktop header).
 *
 * Spec : PDF p4 §1 "Lorsque je clique sur la photo à droite, il n'y a pas le
 * log out". Clicking the avatar now opens a menu that exposes the profile,
 * navigation shortcuts and a Sign out action (POST /auth/signout).
 */
export function HeaderUserMenu({ avatarUrl, displayName, labels }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items: { href: '/dashboard/profile' | '/dashboard' | '/dashboard/notifications'; label: string }[] = [
    { href: '/dashboard/profile', label: labels.profile },
    { href: '/dashboard', label: labels.memorials },
    { href: '/dashboard/notifications', label: labels.notifications },
  ];

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={displayName || labels.account}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full focus-visible:outline-none focus-visible:shadow-[var(--shadow-glow-primary)]"
      >
        <Avatar src={avatarUrl} name={displayName || undefined} size="md" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={labels.account}
          className="absolute right-0 z-[var(--z-modal)] mt-2 w-56 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-[var(--shadow-overlay)]"
        >
          {displayName && (
            <p className="truncate px-4 py-2 font-display text-sm font-bold text-foreground">
              {displayName}
            </p>
          )}
          <hr className="border-border" />
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 font-display text-sm font-semibold text-secondary transition-colors hover:bg-surface hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
          <hr className="border-border" />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-display text-sm font-bold text-destructive transition-colors hover:bg-[var(--color-bg-hover-pink)]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {labels.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
