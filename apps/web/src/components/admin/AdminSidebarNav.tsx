'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  labelKey: keyof Omit<Labels, 'aria'>;
  iconPath: string;
}

const ITEMS: NavItem[] = [
  {
    href: '/admin',
    labelKey: 'overview',
    iconPath:
      'M3 13h8V3H3v10Zm10 8h8V11h-8v10Zm0-18v6h8V3h-8ZM3 21h8v-6H3v6Z',
  },
  {
    href: '/admin/users',
    labelKey: 'users',
    iconPath:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  },
  {
    href: '/admin/memorials',
    labelKey: 'memorials',
    iconPath:
      'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm3 4h10M7 13h10M7 17h6',
  },
  {
    href: '/admin/testimonials',
    labelKey: 'testimonials',
    iconPath: 'M21 12a8 8 0 0 1-11.4 7.3L3 21l1.7-5.6A8 8 0 1 1 21 12Z',
  },
  {
    href: '/admin/donations',
    labelKey: 'donations',
    iconPath:
      'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  },
  {
    href: '/admin/reports',
    labelKey: 'reports',
    iconPath:
      'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01',
  },
  {
    href: '/admin/ads',
    labelKey: 'ads',
    iconPath:
      'M3 11l18-5v12L3 13v-2zm0 0v2m6 9l-3-9M14 7v10',
  },
  {
    href: '/admin/settings',
    labelKey: 'settings',
    iconPath:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a7.5 7.5 0 0 0-.2-1.7l2-1.6-2-3.5-2.4 1a7.6 7.6 0 0 0-3-1.7L13.5 2h-4l-.4 2.5a7.6 7.6 0 0 0-3 1.7l-2.4-1-2 3.5 2 1.6a7.5 7.5 0 0 0 0 3.4l-2 1.6 2 3.5 2.4-1a7.6 7.6 0 0 0 3 1.7l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 3-1.7l2.4 1 2-3.5-2-1.6c.1-.6.2-1.1.2-1.7Z',
  },
];

export interface Labels {
  overview: string;
  users: string;
  memorials: string;
  testimonials: string;
  donations: string;
  reports: string;
  ads: string;
  settings: string;
  aria: string;
}

export function AdminSidebarNav({ labels }: { labels: Labels }) {
  const pathname = usePathname();

  return (
    <nav aria-label={labels.aria} className="flex flex-col gap-1.5">
      {ITEMS.map((item) => {
        const stripped = pathname?.replace(/^\/(?:fr|en)/, '') ?? '';
        const active =
          item.href === '/admin'
            ? stripped === '/admin'
            : stripped.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex items-center gap-3 rounded-md px-3 py-2.5 font-display text-sm font-bold',
              'transition-colors duration-150',
              active ? 'bg-primary/10 text-primary' : 'text-secondary hover:bg-surface',
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
          </Link>
        );
      })}
    </nav>
  );
}
