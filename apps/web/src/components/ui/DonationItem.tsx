import type { ReactNode } from 'react';
import { Avatar } from './Avatar';

interface DonationItemProps {
  donorName: string;
  donorRelation?: string;
  amount?: string;
  participated?: boolean;
  date: string;
  message?: string;
  avatarUrl?: string | null;
  trailing?: ReactNode;
  className?: string;
}

/**
 * V2 DonationItem : avatar + "Donation by User XXX, Friend" + meta date + amount or "Participated".
 */
export function DonationItem({
  donorName,
  donorRelation,
  amount,
  participated = false,
  date,
  message,
  avatarUrl,
  trailing,
  className,
}: DonationItemProps) {
  return (
    <li
      className={[
        'flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-[var(--color-bg-hover-gray)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Avatar src={avatarUrl} name={donorName} size="sm" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm leading-snug">
          <span className="text-muted-foreground">Donation by </span>
          <span className="font-display font-semibold text-foreground">{donorName}</span>
          {donorRelation && (
            <span className="italic text-muted-foreground">, {donorRelation}</span>
          )}
        </p>
        <p className="text-xs italic text-muted-foreground tabular">{date}</p>
        {message && (
          <p className="mt-1 line-clamp-2 text-xs text-foreground/80">&ldquo;{message}&rdquo;</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {amount ? (
          <span className="tabular font-display text-sm font-bold text-foreground">
            {amount}
          </span>
        ) : participated ? (
          <span className="text-xs italic text-muted-foreground">Participated</span>
        ) : null}
        {trailing}
      </div>
    </li>
  );
}
