import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'popup-blue' | 'popup-rose' | 'thankyou-gray' | 'page-gray' | 'page-blue';

type Size = 'sm' | 'md' | 'lg';

interface ButtonOutlinedProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  fullWidth?: boolean;
}

const SIZE: Record<Size, string> = {
  sm: 'h-9 min-w-9 px-3 text-sm',
  md: 'min-h-10 px-[10px] py-[10px] text-base',
  lg: 'min-h-12 px-[14px] py-[14px] text-[20px]',
};

const VARIANTS: Record<Variant, string> = {
  'popup-blue':
    'border-2 border-foreground text-foreground hover:bg-[var(--color-bg-hover-blue)] active:bg-[var(--color-bg-active-blue)]',
  'popup-rose':
    'border-2 border-accent text-accent hover:bg-[var(--color-bg-hover-pink)] active:bg-[var(--color-bg-active-pink)]',
  'thankyou-gray':
    'border-2 border-muted-foreground text-muted-foreground hover:bg-[var(--color-bg-hover-gray)] active:bg-[var(--color-bg-active-gray)]',
  'page-gray':
    'border-2 border-muted-foreground/60 text-muted-foreground hover:border-muted-foreground hover:bg-[var(--color-bg-hover-gray)] active:bg-[var(--color-bg-active-gray)]',
  'page-blue':
    'border-2 border-foreground/60 text-foreground hover:border-foreground hover:bg-[var(--color-bg-hover-blue)] active:bg-[var(--color-bg-active-blue)]',
};

/**
 * V2 Button #2 — outlined (5 sub-variants).
 * Spec : border 2px / padding 10px (md) / Montserrat Bold 16px (general) ou 20px (popups login).
 */
export const ButtonOutlined = forwardRef<HTMLButtonElement, ButtonOutlinedProps>(
  function ButtonOutlined(
    {
      variant = 'page-blue',
      size = 'md',
      loading,
      iconLeft,
      fullWidth,
      disabled,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-md bg-transparent',
          'font-display font-bold leading-none',
          'transition-[background-color,border-color,color] duration-150 ease-[var(--motion-ease-out)]',
          'focus-visible:shadow-[var(--shadow-glow-primary)] focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'press-scale',
          SIZE[size],
          VARIANTS[variant],
          fullWidth ? 'w-full' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? <Spinner size={16} /> : iconLeft && <span aria-hidden="true">{iconLeft}</span>}
        <span>{children}</span>
      </button>
    );
  },
);
