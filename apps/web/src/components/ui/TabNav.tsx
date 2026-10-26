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
        className={['bg-surface inline-flex gap-1 rounded-full p-1', className ?? '']
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
                  ? 'text-foreground bg-white shadow-[var(--shadow-card)]'
                  : 'text-foreground/70 hover:text-foreground',
                item.disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              {item.iconLeft && <span aria-hidden="true">{item.iconLeft}</span>}
              <span>{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="tabular text-muted-foreground ml-1 text-xs">{item.badge}</span>
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
      className={['border-border flex gap-1 overflow-x-auto border-b', className ?? '']
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
              '-mb-px whitespace-nowrap border-b-2',
              active
                ? 'border-primary text-primary'
                : 'text-foreground/70 hover:text-foreground border-transparent',
              item.disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            {item.iconLeft && <span aria-hidden="true">{item.iconLeft}</span>}
            <span>{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="tabular bg-foreground/10 ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
