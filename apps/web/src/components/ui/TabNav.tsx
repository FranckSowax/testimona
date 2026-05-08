'use client';

import type { ReactNode } from 'react';

interface TabItem {
  id: string;
  label: ReactNode;
  iconLeft?: ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface TabNavProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  variant?: 'underline' | 'pill';
  className?: string;
}

export function TabNav({
  items,
  value,
  onChange,
  ariaLabel,
  variant = 'underline',
  className,
}: TabNavProps) {
  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={[
          'inline-flex gap-1 rounded-full bg-surface p-1',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${item.id}`}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              className={[
                'inline-flex items-center gap-2 rounded-full px-4 py-1.5',
                'text-sm font-medium transition-[background-color,color]',
                'duration-150 ease-[var(--motion-ease-out)]',
                'press-scale',
                active
                  ? 'bg-white text-foreground shadow-[var(--shadow-card)]'
                  : 'text-foreground/70 hover:text-foreground',
                item.disabled ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {item.iconLeft && <span aria-hidden="true">{item.iconLeft}</span>}
              <span>{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="tabular ml-1 text-xs text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        'flex gap-1 border-b border-border overflow-x-auto',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`panel-${item.id}`}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={[
              'relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium',
              'transition-colors duration-150 ease-[var(--motion-ease-out)]',
              'border-b-2 -mb-px whitespace-nowrap',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground/70 hover:text-foreground',
              item.disabled ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {item.iconLeft && <span aria-hidden="true">{item.iconLeft}</span>}
            <span>{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="tabular ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-[11px] font-semibold">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
