import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type Tone = 'default' | 'pink' | 'liked';
type Size = 'sm' | 'md' | 'lg';

interface ButtonIconProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: Tone;
  size?: Size;
  active?: boolean;
}

const SIZE: Record<Size, string> = {
  sm: 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4',
  md: 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5',
  lg: 'h-12 w-12 [&>svg]:h-6 [&>svg]:w-6',
};

/**
 * V2 Button #4 — icon button (square, rounded full circle on hover).
 * Spec : 44×44 (md), hover bg-circle gray-soft, click bg gray-strong.
 * tone="liked" : bg rose, white icon. tone="pink" : hover bg pink-soft.
 */
export const ButtonIcon = forwardRef<HTMLButtonElement, ButtonIconProps>(function ButtonIcon(
  {
    label,
    tone = 'default',
    size = 'md',
    active = false,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const toneClasses =
    tone === 'liked' || (tone === 'pink' && active)
      ? 'bg-accent text-accent-foreground'
      : tone === 'pink'
        ? 'text-muted-foreground hover:bg-[var(--color-bg-hover-pink)] hover:text-accent active:bg-[var(--color-bg-active-pink)]'
        : 'text-muted-foreground hover:bg-[var(--color-bg-hover-gray)] hover:text-foreground active:bg-[var(--color-bg-active-gray)]';

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'transition-[background-color,color,transform] duration-150 ease-[var(--motion-ease-out)]',
        'focus-visible:shadow-[var(--shadow-glow-primary)] focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'active:scale-95',
        SIZE[size],
        toneClasses,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
});
