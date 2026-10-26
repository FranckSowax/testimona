import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

interface ButtonContainerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  iconLeft?: ReactNode;
  fullWidth?: boolean;
}

/**
 * V2 Button #1 — filled rose container (CTA mémorial).
 * Spec : bg #DB8186 / white text Montserrat Bold 20px / padding 15px.
 * Hover : box-shadow elevated. Active : box-shadow + bg #FFEFEF (per V2 spec).
 * Used for : "Write a testimonial", "Post my testimonial".
 */
export const ButtonContainer = forwardRef<HTMLButtonElement, ButtonContainerProps>(
  function ButtonContainer(
    { loading, iconLeft, fullWidth, disabled, className, children, type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-md',
          'bg-accent px-[15px] py-[15px]',
          'font-display text-accent-foreground text-[20px] font-bold leading-none',
          'transition-[box-shadow,background-color,color] duration-150 ease-[var(--motion-ease-out)]',
          'hover:shadow-[var(--shadow-elevated)]',
          'active:text-accent active:bg-[var(--color-bg-hover-pink)] active:shadow-[var(--shadow-elevated)]',
          'focus-visible:shadow-[var(--shadow-glow-accent)] focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'press-scale',
          fullWidth ? 'w-full' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? <Spinner size={18} /> : iconLeft && <span aria-hidden="true">{iconLeft}</span>}
        <span>{children}</span>
      </button>
    );
  },
);
