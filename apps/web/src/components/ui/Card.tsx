import type { HTMLAttributes } from 'react';

type Elevation = 'flat' | 'raised' | 'elevated' | 'glass';

interface CardProps extends HTMLAttributes<HTMLElement> {
  elevation?: Elevation;
  interactive?: boolean;
  as?: 'div' | 'article' | 'section' | 'li';
}

const ELEVATION: Record<Elevation, string> = {
  flat: 'border border-border bg-white',
  raised: 'border border-border bg-white shadow-[var(--shadow-card)]',
  elevated: 'border border-border bg-white shadow-[var(--shadow-elevated)]',
  glass: 'surface-glass',
};

export function Card({
  elevation = 'raised',
  interactive = false,
  as = 'div',
  className,
  children,
  ...rest
}: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={[
        'rounded-lg',
        ELEVATION[elevation],
        interactive
          ? 'press-scale cursor-pointer transition-shadow hover:shadow-[var(--shadow-elevated)]'
          : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['border-border border-b px-5 py-4', className ?? ''].join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['px-5 py-4', className ?? ''].join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['border-border border-t px-5 py-3', className ?? ''].join(' ')} {...rest}>
      {children}
    </div>
  );
}
