import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

interface Crumb {
  label: ReactNode;
  href?: string;
}

interface BreadcrumbProps {
  items: Crumb[];
  ariaLabel?: string;
  className?: string;
}

/**
 * V2 Breadcrumb : "Home › About Testimona"
 * Last item: Bold navy 22px (page title). Previous: Bold Italic gray 16px, link.
 * Separator: › (chevron right) gray.
 */
export function Breadcrumb({
  items,
  ariaLabel = 'Breadcrumb',
  className,
}: BreadcrumbProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={['text-sm', className ?? ''].filter(Boolean).join(' ')}
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const content = isLast ? (
            <span
              aria-current="page"
              className="font-display text-[16px] font-bold text-foreground sm:text-[22px]"
            >
              {item.label}
            </span>
          ) : item.href ? (
            <Link
              href={item.href}
              className="font-display text-[16px] font-bold italic text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-display text-[16px] font-bold italic text-muted-foreground">
              {item.label}
            </span>
          );
          return (
            <li key={i} className="flex items-center gap-2">
              {content}
              {!isLast && (
                <span aria-hidden="true" className="text-muted-foreground/60">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
