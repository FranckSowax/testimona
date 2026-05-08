'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { Badge } from './ui/Badge';

interface NavItem {
  href:
    | '/dashboard'
    | '/dashboard/testimonials'
    | '/dashboard/notifications'
    | '/dashboard/profile';
  labelKey: 'memorials' | 'testimonials' | 'notifications' | 'profile';
  iconPath: string;
}

const ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'memorials',
    iconPath: 'M3 7l9-4 9 4M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5',
  },
  {
    href: '/dashboard/testimonials',
    labelKey: 'testimonials',
    iconPath: 'M21 15a4 4 0 0 1-4 4H8l-5 3v-6.5A4.5 4.5 0 0 1 7.5 11H17a4 4 0 0 1 4 4Z',
  },
  {
    href: '/dashboard/notifications',
    labelKey: 'notifications',
    iconPath:
      'M15 17h5l-1.4-1.4A6 6 0 0 0 18 11V8a6 6 0 0 0-12 0v3a6 6 0 0 0-.6 4.6L4 17h5m6 0a3 3 0 1 1-6 0',
  },
  {
    href: '/dashboard/profile',
    labelKey: 'profile',
    iconPath: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0',
  },
];

interface Props {
  labels: {
    memorials: string;
    testimonials: string;
    notifications: string;
    profile: string;
    aria: string;
  };
  notificationsBadge: number;
}

export function AppSidebarNav({ labels, notificationsBadge }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label={labels.aria} className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname?.startsWith(item.href) ?? false;
        const badge = item.labelKey === 'notifications' ? notificationsBadge : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
              'transition-colors duration-150 ease-[var(--motion-ease-out)]',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-foreground/70 hover:bg-surface hover:text-foreground',
            ].join(' ')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d={item.iconPath} />
            </svg>
            <span className="flex-1">{labels[item.labelKey]}</span>
            <Badge tone="accent" count={badge} />
          </Link>
        );
      })}
    </nav>
  );
}
