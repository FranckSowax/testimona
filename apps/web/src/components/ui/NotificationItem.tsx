import type { ReactNode } from 'react';
import Link from 'next/link';
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
              <span className="font-display font-semibold text-foreground">
                {memorialName}
              </span>
            )}
            {memorialName && ' — '}
            <span className="font-display font-semibold text-foreground">{authorName}</span>
            {authorRelation && (
              <span className="italic text-muted-foreground">, {authorRelation}</span>
            )}
          </p>
          <p className="text-xs italic text-muted-foreground tabular">{date}</p>
          {excerpt && (
            <p className="line-clamp-2 text-xs text-foreground/80">{excerpt}</p>
          )}
        </div>
      </Link>
      {unread && (
        <span
          aria-label="Unread"
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent"
        />
      )}
      {trailing}
    </li>
  );
}
