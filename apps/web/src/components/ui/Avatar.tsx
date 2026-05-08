import Image from 'next/image';
import type { HTMLAttributes } from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: Size;
  status?: 'online' | 'offline';
}

const SIZE_PX: Record<Size, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const SIZE_TEXT: Record<Size, string> = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
};

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function Avatar({
  src,
  name,
  size = 'md',
  status,
  className,
  ...rest
}: AvatarProps) {
  const px = SIZE_PX[size];
  return (
    <div
      className={[
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-surface text-foreground/70 font-display font-semibold',
        SIZE_TEXT[size],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: px, height: px }}
      aria-label={name}
      {...rest}
    >
      {src ? (
        <Image src={src} alt={name ?? ''} fill sizes={`${px}px`} className="object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      {status && (
        <span
          aria-hidden="true"
          className={[
            'absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full ring-2 ring-white',
            status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground',
          ].join(' ')}
        />
      )}
    </div>
  );
}
