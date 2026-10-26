'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface MenuItem {
  id: string;
  label: ReactNode;
  iconLeft?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface KebabMenuProps {
  label: string;
  items: MenuItem[];
  align?: 'right' | 'left';
  className?: string;
}

/**
 * V2 Kebab menu (3 dots ⋯).
 * Spec : opens white panel with shadow, Edit/Delete/Move-up/Move-down/etc.
 * Click outside dismisses. Escape closes.
 */
export function KebabMenu({ label, items, align = 'right', className }: KebabMenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={['relative inline-block', className ?? ''].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-bg-hover-gray)] focus-visible:shadow-[var(--shadow-glow-primary)] focus-visible:outline-none active:bg-[var(--color-bg-active-gray)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={[
            'absolute top-full z-[var(--z-dropdown)] mt-1 min-w-[180px]',
            'border-border rounded-md border bg-white shadow-[var(--shadow-overlay)]',
            'animate-fade-in py-1',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onSelect();
                  setOpen(false);
                }
              }}
              className={[
                'flex w-full items-center gap-2 px-4 py-2 text-left text-sm',
                'transition-colors',
                item.destructive
                  ? 'text-destructive hover:bg-[var(--color-bg-hover-pink)]'
                  : 'text-foreground hover:bg-[var(--color-bg-hover-gray)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
            >
              {item.iconLeft && <span aria-hidden="true">{item.iconLeft}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
