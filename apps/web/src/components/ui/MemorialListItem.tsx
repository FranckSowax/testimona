import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Avatar } from './Avatar';

interface MemorialListItemProps {
  href: string;
  fullName: string;
  meta?: string;
  coverUrl?: string | null;
  trailing?: ReactNode;
  className?: string;
}

/**
 * V2 list-item for memorial — bordered rose avatar + name + country/year + kebab slot.
 */
export function MemorialListItem({
  href,
  fullName,
  meta,
  coverUrl,
  trailing,
  className,
}: MemorialListItemProps) {
  return (
    <li
      className={[
        'flex items-center gap-3 rounded-md px-3 py-2.5',
        'transition-colors hover:bg-[var(--color-bg-hover-gray)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Link href={href} className="flex flex-1 items-center gap-3 outline-none">
        <Avatar src={coverUrl} name={fullName} size="md" border="rose" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-foreground truncate text-sm font-semibold">{fullName}</p>
          {meta && <p className="text-muted-foreground tabular truncate text-xs italic">{meta}</p>}
        </div>
      </Link>
      {trailing}
    </li>
  );
}
