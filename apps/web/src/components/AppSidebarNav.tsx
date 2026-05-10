'use client';

import { Link, usePathname } from '@/i18n/navigation';

interface NavItem {
  href:
    | '/'
    | '/dashboard'
    | '/dashboard/testimonials'
    | '/dashboard/notifications'
    | '/dashboard/profile';
  labelKey: 'home' | 'memorials' | 'testimonials' | 'notifications' | 'settings';
  iconPath: string;
}

const ITEMS: NavItem[] = [
  {
    href: '/',
    labelKey: 'home',
    iconPath: 'M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V10',
  },
  {
    href: '/dashboard/testimonials',
    labelKey: 'testimonials',
    iconPath: 'M21 12a8 8 0 0 1-11.4 7.3L3 21l1.7-5.6A8 8 0 1 1 21 12Z',
  },
  {
    href: '/dashboard/notifications',
    labelKey: 'notifications',
    iconPath:
      'M15 17h5l-1.4-1.4A6 6 0 0 0 18 11V8a6 6 0 0 0-12 0v3a6 6 0 0 0-.6 4.6L4 17h5m6 0a3 3 0 1 1-6 0',
  },
  {
    href: '/dashboard',
    labelKey: 'memorials',
    iconPath:
      'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm3 4h10M7 13h10M7 17h6',
  },
  {
    href: '/dashboard/profile',
    labelKey: 'settings',
    iconPath:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a7.5 7.5 0 0 0-.2-1.7l2-1.6-2-3.5-2.4 1a7.6 7.6 0 0 0-3-1.7L13.5 2h-4l-.4 2.5a7.6 7.6 0 0 0-3 1.7l-2.4-1-2 3.5 2 1.6a7.5 7.5 0 0 0 0 3.4l-2 1.6 2 3.5 2.4-1a7.6 7.6 0 0 0 3 1.7l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 3-1.7l2.4 1 2-3.5-2-1.6c.1-.6.2-1.1.2-1.7Z',
  },
];

interface Props {
  labels: {
    home: string;
    memorials: string;
    testimonials: string;
    notifications: string;
    settings: string;
    aria: string;
  };
  notificationsBadge: number;
}

export function AppSidebarNav({ labels, notificationsBadge }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label={labels.aria} className="flex flex-col gap-1.5">
      {ITEMS.map((item) => {
        const active =
          item.href === '/' || item.href === '/dashboard'
            ? pathname === item.href
            : pathname?.startsWith(item.href) ?? false;
        const showDot = item.labelKey === 'notifications' && notificationsBadge > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'group flex items-center gap-3 rounded-md px-2 py-2.5 font-display text-base font-bold',
              'transition-colors duration-150 ease-[var(--motion-ease-out)]',
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
              {showDot && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-white"
                />
              )}
            </span>
            <span className="flex-1">{labels[item.labelKey]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
