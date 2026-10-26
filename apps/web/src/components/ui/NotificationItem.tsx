import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Avatar } from './Avatar';

interface NotificationItemProps {
  href: string;
  authorName: string;
  authorRelation?: string;
  memorialName?: string;
  excerpt?: string;
  date: string;
  avatarUrl?: string | null;
  unread?: boolean;
  trailing?: ReactNode;
  className?: string;
}

/**
 * V2 NotificationItem : avatar + memorial bold + relation italic + date italic + excerpt + kebab.
 */
export function NotificationItem({
  href,
  authorName,
  authorRelation,
  memorialName,
  excerpt,
  date,
  avatarUrl,
  unread = false,
  trailing,
  className,
}: NotificationItemProps) {
  return (
    <li
      className={[
        'flex items-start gap-3 rounded-md p-3 transition-colors',
        unread ? 'bg-primary/5' : '',
        'hover:bg-[var(--color-bg-hover-gray)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Link href={href} className="flex flex-1 items-start gap-3 outline-none">
        <Avatar src={avatarUrl} name={authorName} size="sm" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm leading-snug">
            {memorialName && (
              <span className="font-display text-foreground font-semibold">{memorialName}</span>
            )}
            {memorialName && ' — '}
            <span className="font-display text-foreground font-semibold">{authorName}</span>
            {authorRelation && (
              <span className="text-muted-foreground italic">, {authorRelation}</span>
            )}
          </p>
          <p className="text-muted-foreground tabular text-xs italic">{date}</p>
          {excerpt && <p className="text-foreground/80 line-clamp-2 text-xs">{excerpt}</p>}
        </div>
      </Link>
      {unread && (
        <span aria-label="Unread" className="bg-accent mt-2 h-2 w-2 shrink-0 rounded-full" />
      )}
      {trailing}
    </li>
  );
}
