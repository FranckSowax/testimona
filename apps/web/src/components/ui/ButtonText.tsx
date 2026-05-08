import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'menu-sidebar' | 'subtab' | 'action' | 'filter';

interface ButtonTextProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  active?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

/**
 * V2 Button #3 — text-only (4 sub-variants).
 * - menu-sidebar : Montserrat Bold 16px, navy → teal (active) → teal-soft (hover)
 * - subtab      : 12px, gray → teal (active, with underline 2px teal)
 * - action      : 12px Bold uppercase, gray → pink (hover bg pink-soft, click pink-strong)
 * - filter      : 12px Regular (inactive) / Bold (active), gray, with chevron
 */
export const ButtonText = forwardRef<HTMLButtonElement, ButtonTextProps>(function ButtonText(
  {
    variant = 'action',
    active = false,
    iconLeft,
    iconRight,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const base =
    'inline-flex items-center gap-2 transition-[color,background-color,border-color] duration-150 focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:opacity-50';

  let classes = '';
  switch (variant) {
    case 'menu-sidebar':
      classes = [
        'font-display text-[16px] font-bold leading-none px-3 py-2.5 rounded-md',
        active
          ? 'text-primary bg-primary/5'
          : 'text-foreground hover:text-[var(--color-primary-soft)] hover:bg-surface',
      ].join(' ');
      break;
    case 'subtab':
      classes = [
        'relative font-display text-[12px] px-3 py-2 -mb-px',
        active
          ? 'font-bold text-primary border-b-2 border-primary'
          : 'font-normal text-muted-foreground border-b-2 border-transparent hover:text-foreground',
      ].join(' ');
      break;
    case 'action':
      classes = [
        'font-display text-[12px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1',
        active
          ? 'text-accent bg-[var(--color-bg-active-pink)]'
          : 'text-muted-foreground hover:bg-[var(--color-bg-hover-pink)] hover:text-accent active:bg-[var(--color-bg-active-pink)]',
      ].join(' ');
      break;
    case 'filter':
      classes = [
        'font-display text-[12px] text-muted-foreground hover:text-foreground rounded px-2 py-1',
        active ? 'font-bold' : 'font-normal',
      ].join(' ');
      break;
  }

  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={variant === 'action' ? active : undefined}
      className={[base, classes, className ?? ''].filter(Boolean).join(' ')}
      {...rest}
    >
      {iconLeft && <span aria-hidden="true">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span aria-hidden="true">{iconRight}</span>}
      {variant === 'filter' && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      )}
    </button>
  );
});
